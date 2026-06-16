import { createHash, randomUUID } from 'node:crypto'
import { requireAuth, requireRole, createSession, generateOtp, hashOtp, type AuthUser } from './auth'
import { getConfig } from './config'
import { execute, query } from './db'
import { ApiError, errorResponse, json, parseBody, pathParts } from './http'
import { logger } from './logger'
import {
  boutSchema,
  boutPatchSchema,
  decisionSchema,
  documentSchema,
  eventSchema,
  eventPatchSchema,
  fighterSchema,
  fighterPatchSchema,
  gymSchema,
  gymPatchSchema,
  invitationSchema,
  invitationResponseSchema,
  mediaSchema,
  registerSchema,
  requestOtpSchema,
  rosterFighterSchema,
  rosterSchema,
  scorecardSchema,
  verifyOtpSchema,
  waiverSchema,
  weighInSchema,
  withdrawalSchema,
} from './schemas'

type IdRow = { id: string }
type CountRow = { count: number }

async function audit(
  user: AuthUser,
  action: string,
  entityType: string,
  entityId: string | null,
  correlationId: string,
  details?: unknown,
) {
  await execute(
    `INSERT compete.AuditLog
       (UserId, Action, EntityType, EntityId, DetailsJson, CorrelationId)
     VALUES
       (@userId, @action, @entityType, @entityId, @details, @correlationId)`,
    {
      userId: user.userId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null,
      correlationId,
    },
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180)
}

async function issueOtp(email: string, purpose: 'login' | 'register') {
  const normalizedEmail = email.trim().toLowerCase()
  const users = await query<{ userId: string }>(
    `SELECT UserId AS userId FROM compete.Users WHERE Email = @email AND IsActive = 1`,
    { email: normalizedEmail },
  )
  if (!users[0]) {
    throw new ApiError(404, 'No active account was found for this email.', 'account_not_found')
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await execute(
    `INSERT compete.OtpChallenges
       (UserId, Email, Purpose, CodeHash, ExpiresAt)
     VALUES
       (@userId, @email, @purpose, @codeHash, @expiresAt)`,
    {
      userId: users[0].userId,
      email: normalizedEmail,
      purpose,
      codeHash: hashOtp(normalizedEmail, code),
      expiresAt,
    },
  )

  logger.info('OTP issued for {Email}', {
    email: normalizedEmail,
    purpose,
    expiresAt: expiresAt.toISOString(),
    localOtp: getConfig().exposeOtp ? code : undefined,
  })

  const config = getConfig()
  if (config.otpDeliveryWebhookUrl) {
    const delivery = await fetch(config.otpDeliveryWebhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.otpDeliveryWebhookApiKey
          ? { authorization: `Bearer ${config.otpDeliveryWebhookApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        channel: 'email',
        destination: normalizedEmail,
        template: 'compete-otp',
        variables: {
          code,
          purpose,
          expiresAt: expiresAt.toISOString(),
          expiresInMinutes: 10,
        },
      }),
    })
    if (!delivery.ok) {
      throw new ApiError(502, 'The verification code could not be delivered.', 'otp_delivery_failed')
    }
  } else if (!config.exposeOtp) {
    throw new ApiError(
      503,
      'OTP delivery is not configured.',
      'otp_delivery_not_configured',
    )
  }
  return { expiresAt, code: config.exposeOtp ? code : undefined }
}

function parseLimit(url: URL) {
  const value = Number(url.searchParams.get('limit') ?? 50)
  return Math.max(1, Math.min(Number.isFinite(value) ? value : 50, 100))
}

async function handlePublic(request: Request, parts: string[]) {
  if (request.method === 'GET' && parts.join('/') === 'v1/health') {
    return json({
      status: 'ok',
      service: 'compete-api',
      timestamp: new Date().toISOString(),
    })
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/auth/register') {
    const body = await parseBody(request, registerSchema)
    const email = body.email.toLowerCase()
    const existing = await query<IdRow>(
      `SELECT UserId AS id FROM compete.Users WHERE Email = @email`,
      { email },
    )
    if (existing[0]) {
      throw new ApiError(409, 'An account already exists for this email.', 'account_exists')
    }

    const userId = randomUUID()
    await execute(
      `INSERT compete.Users (UserId, Email, FirstName, LastName, Phone)
       VALUES (@userId, @email, @firstName, @lastName, @phone);
       INSERT compete.UserRoles (UserId, RoleName)
       VALUES (@userId, @role);`,
      {
        userId,
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone ?? null,
        role: body.role,
      },
    )
    const otp = await issueOtp(email, 'register')
    return json({ userId, email, verification: otp }, 201)
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/auth/request-otp') {
    const body = await parseBody(request, requestOtpSchema)
    return json(await issueOtp(body.email, body.purpose))
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/auth/verify-otp') {
    const body = await parseBody(request, verifyOtpSchema)
    const email = body.email.toLowerCase()
    const challenges = await query<{
      otpChallengeId: string
      userId: string
      codeHash: string
      attemptCount: number
    }>(
      `SELECT TOP 1
         OtpChallengeId AS otpChallengeId, UserId AS userId,
         CodeHash AS codeHash, AttemptCount AS attemptCount
       FROM compete.OtpChallenges
       WHERE Email = @email AND ConsumedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()
       ORDER BY CreatedAt DESC`,
      { email },
    )
    const challenge = challenges[0]
    if (!challenge || challenge.attemptCount >= 5) {
      throw new ApiError(401, 'The code is invalid or has expired.', 'invalid_otp')
    }

    await execute(
      `UPDATE compete.OtpChallenges
       SET AttemptCount = AttemptCount + 1
       WHERE OtpChallengeId = @challengeId`,
      { challengeId: challenge.otpChallengeId },
    )
    if (challenge.codeHash !== hashOtp(email, body.code)) {
      throw new ApiError(401, 'The code is invalid or has expired.', 'invalid_otp')
    }

    await execute(
      `UPDATE compete.OtpChallenges SET ConsumedAt = SYSUTCDATETIME()
       WHERE OtpChallengeId = @challengeId;
       UPDATE compete.Users
       SET EmailVerifiedAt = COALESCE(EmailVerifiedAt, SYSUTCDATETIME()),
           LastLoginAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE UserId = @userId`,
      { challengeId: challenge.otpChallengeId, userId: challenge.userId },
    )
    const session = await createSession(challenge.userId)
    return json(session)
  }

  return undefined
}

async function handleAuthenticated(
  request: Request,
  parts: string[],
  user: AuthUser,
  correlationId: string,
) {
  const url = new URL(request.url)

  if (request.method === 'GET' && parts.join('/') === 'v1/auth/me') {
    return json({ user })
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/auth/logout') {
    await execute(
      `UPDATE compete.Sessions SET RevokedAt = SYSUTCDATETIME()
       WHERE SessionId = @sessionId`,
      { sessionId: user.sessionId },
    )
    return new Response(null, { status: 204 })
  }

  if (request.method === 'GET' && parts.join('/') === 'v1/dashboard') {
    const [eventCount, fighterCount, gymCount, openBoutCount, events, notifications] =
      await Promise.all([
        query<CountRow>(
          `SELECT COUNT(*) AS count FROM compete.Events
           WHERE Status NOT IN ('completed','cancelled')`,
        ),
        query<CountRow>(
          `SELECT COUNT(*) AS count FROM compete.Fighters WHERE IsActive = 1`,
        ),
        query<CountRow>(
          `SELECT COUNT(*) AS count FROM compete.Gyms WHERE IsActive = 1`,
        ),
        query<CountRow>(
          `SELECT COUNT(*) AS count FROM compete.Bouts
           WHERE Status IN ('proposed','confirmed','published')`,
        ),
        query(
          `SELECT TOP 5
             EventId AS eventId, Name AS name, EventType AS eventType,
             Status AS status, VenueName AS venueName, StartsAt AS startsAt,
             PlannedBoutCount AS plannedBoutCount
           FROM compete.Events
           WHERE EndsAt >= SYSUTCDATETIME() AND Status <> 'cancelled'
           ORDER BY StartsAt`,
        ),
        query(
          `SELECT TOP 8
             NotificationId AS notificationId, NotificationType AS notificationType,
             Title AS title, Message AS message, ReadAt AS readAt, CreatedAt AS createdAt
           FROM compete.Notifications
           WHERE UserId = @userId
           ORDER BY CreatedAt DESC`,
          { userId: user.userId },
        ),
      ])

    return json({
      stats: {
        activeEvents: eventCount[0]?.count ?? 0,
        fighters: fighterCount[0]?.count ?? 0,
        gyms: gymCount[0]?.count ?? 0,
        openBouts: openBoutCount[0]?.count ?? 0,
      },
      events,
      notifications,
    })
  }

  if (parts[1] === 'gyms') {
    if (request.method === 'GET' && parts.length === 2) {
      return json({
        items: await query(
          `SELECT TOP (@limit)
             g.GymId AS gymId, g.Name AS name, g.Slug AS slug, g.Email AS email,
             g.Phone AS phone, g.TownCity AS townCity, g.CountryCode AS countryCode,
             g.Bio AS bio,
             (SELECT COUNT(*) FROM compete.FighterGymAssociations fga
              WHERE fga.GymId = g.GymId AND fga.EndedAt IS NULL) AS fighterCount
           FROM compete.Gyms g
           WHERE g.IsActive = 1
           ORDER BY g.Name`,
          { limit: parseLimit(url) },
        ),
      })
    }

    if (request.method === 'POST' && parts.length === 2) {
      requireRole(user, 'coach', 'promoter')
      const body = await parseBody(request, gymSchema)
      const gymId = randomUUID()
      const slug = `${slugify(body.name)}-${gymId.slice(0, 6)}`
      await execute(
        `INSERT compete.Gyms
           (GymId, Name, Slug, Email, Phone, WebsiteUrl, AddressLine1,
            TownCity, CountyRegion, Postcode, CountryCode, Bio, CreatedByUserId)
         VALUES
           (@gymId, @name, @slug, @email, @phone, @websiteUrl, @addressLine1,
            @townCity, @countyRegion, @postcode, @countryCode, @bio, @userId);
         INSERT compete.GymMembers (GymId, UserId, MembershipRole, IsPrimary)
         VALUES (@gymId, @userId, 'owner', 1);`,
        {
          gymId,
          slug,
          userId: user.userId,
          ...body,
          email: body.email ?? null,
          phone: body.phone ?? null,
          websiteUrl: body.websiteUrl ?? null,
          addressLine1: body.addressLine1 ?? null,
          townCity: body.townCity ?? null,
          countyRegion: body.countyRegion ?? null,
          postcode: body.postcode ?? null,
          bio: body.bio ?? null,
        },
      )
      await audit(user, 'gym.created', 'gym', gymId, correlationId, { name: body.name })
      return json({ gymId, slug }, 201)
    }

    if (request.method === 'GET' && parts.length === 3) {
      const gyms = await query(
        `SELECT
           GymId AS gymId, Name AS name, Slug AS slug, Email AS email,
           Phone AS phone, WebsiteUrl AS websiteUrl, AddressLine1 AS addressLine1,
           AddressLine2 AS addressLine2, TownCity AS townCity,
           CountyRegion AS countyRegion, Postcode AS postcode,
           CountryCode AS countryCode, Bio AS bio
         FROM compete.Gyms WHERE GymId = @gymId`,
        { gymId: parts[2] },
      )
      if (!gyms[0]) throw new ApiError(404, 'Gym not found.', 'gym_not_found')
      return json(gyms[0])
    }

    if (request.method === 'PATCH' && parts.length === 3) {
      requireRole(user, 'coach', 'promoter')
      const body = await parseBody(request, gymPatchSchema)
      await execute(
        `UPDATE compete.Gyms SET
           Name = COALESCE(@name, Name),
           Email = COALESCE(@email, Email),
           Phone = COALESCE(@phone, Phone),
           WebsiteUrl = COALESCE(@websiteUrl, WebsiteUrl),
           AddressLine1 = COALESCE(@addressLine1, AddressLine1),
           TownCity = COALESCE(@townCity, TownCity),
           CountyRegion = COALESCE(@countyRegion, CountyRegion),
           Postcode = COALESCE(@postcode, Postcode),
           CountryCode = COALESCE(@countryCode, CountryCode),
           Bio = COALESCE(@bio, Bio),
           UpdatedAt = SYSUTCDATETIME()
         WHERE GymId = @gymId`,
        {
          gymId: parts[2],
          name: body.name ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
          websiteUrl: body.websiteUrl ?? null,
          addressLine1: body.addressLine1 ?? null,
          townCity: body.townCity ?? null,
          countyRegion: body.countyRegion ?? null,
          postcode: body.postcode ?? null,
          countryCode: body.countryCode ?? null,
          bio: body.bio ?? null,
        },
      )
      await audit(user, 'gym.updated', 'gym', parts[2] ?? null, correlationId, body)
      return json({ gymId: parts[2] })
    }
  }

  if (parts[1] === 'fighters') {
    if (request.method === 'GET' && parts.length === 2) {
      const gymId = url.searchParams.get('gymId')
      return json({
        items: await query(
          `SELECT TOP (@limit)
             FighterId AS fighterId, FirstName AS firstName, LastName AS lastName,
             DateOfBirth AS dateOfBirth, HeightCm AS heightCm,
             CurrentWeightKg AS currentWeightKg, Stance AS stance,
             ExperienceSummary AS experienceSummary, GymId AS gymId, GymName AS gymName
           FROM compete.vw_FighterProfiles
           WHERE (@gymId IS NULL OR GymId = @gymId)
           ORDER BY LastName, FirstName`,
          { limit: parseLimit(url), gymId },
        ),
      })
    }

    if (request.method === 'POST' && parts.length === 2) {
      requireRole(user, 'coach', 'parent', 'fighter')
      const body = await parseBody(request, fighterSchema)
      const fighterId = randomUUID()
      const age = Math.floor(
        (Date.now() - new Date(body.dateOfBirth).getTime()) / 31_557_600_000,
      )
      await execute(
        `INSERT compete.Fighters
           (FighterId, ManagedByUserId, FirstName, LastName, DateOfBirth,
            Gender, Nationality, HeightCm, CurrentWeightKg, Stance,
            ExperienceSummary, Disabilities, MedicalConditions,
            EmergencyContactName, EmergencyContactPhone, Bio, IsMinor)
         VALUES
           (@fighterId, @userId, @firstName, @lastName, @dateOfBirth,
            @gender, @nationality, @heightCm, @currentWeightKg, @stance,
            @experienceSummary, @disabilities, @medicalConditions,
            @emergencyContactName, @emergencyContactPhone, @bio, @isMinor)`,
        {
          fighterId,
          userId: user.userId,
          isMinor: age < 18,
          ...Object.fromEntries(
            Object.entries(body).map(([key, value]) => [key, value ?? null]),
          ),
        },
      )
      if (body.gymId) {
        await execute(
          `INSERT compete.FighterGymAssociations (FighterId, GymId, IsPrimary)
           VALUES (@fighterId, @gymId, 1)`,
          { fighterId, gymId: body.gymId },
        )
      }
      await audit(user, 'fighter.created', 'fighter', fighterId, correlationId)
      return json({ fighterId }, 201)
    }

    if (request.method === 'GET' && parts.length === 3) {
      const fighters = await query(
        `SELECT
           f.FighterId AS fighterId, f.FirstName AS firstName, f.LastName AS lastName,
           f.DateOfBirth AS dateOfBirth, f.Gender AS gender, f.Nationality AS nationality,
           f.HeightCm AS heightCm, f.CurrentWeightKg AS currentWeightKg,
           f.Stance AS stance, f.ExperienceSummary AS experienceSummary,
           f.Disabilities AS disabilities, f.MedicalConditions AS medicalConditions,
           f.EmergencyContactName AS emergencyContactName,
           f.EmergencyContactPhone AS emergencyContactPhone, f.Bio AS bio,
           g.GymId AS gymId, g.Name AS gymName
         FROM compete.Fighters f
         LEFT JOIN compete.FighterGymAssociations fga
           ON fga.FighterId = f.FighterId AND fga.IsPrimary = 1 AND fga.EndedAt IS NULL
         LEFT JOIN compete.Gyms g ON g.GymId = fga.GymId
         WHERE f.FighterId = @fighterId`,
        { fighterId: parts[2] },
      )
      if (!fighters[0]) throw new ApiError(404, 'Fighter not found.', 'fighter_not_found')
      const records = await query(
        `SELECT Discipline AS discipline, Wins AS wins, Losses AS losses,
                Draws AS draws, NoContests AS noContests
         FROM compete.FighterRecords WHERE FighterId = @fighterId`,
        { fighterId: parts[2] },
      )
      return json({ ...fighters[0], records })
    }

    if (request.method === 'PATCH' && parts.length === 3) {
      requireRole(user, 'coach', 'parent', 'fighter')
      const body = await parseBody(request, fighterPatchSchema)
      await execute(
        `UPDATE compete.Fighters SET
           FirstName = COALESCE(@firstName, FirstName),
           LastName = COALESCE(@lastName, LastName),
           DateOfBirth = COALESCE(@dateOfBirth, DateOfBirth),
           Gender = COALESCE(@gender, Gender),
           Nationality = COALESCE(@nationality, Nationality),
           HeightCm = COALESCE(@heightCm, HeightCm),
           CurrentWeightKg = COALESCE(@currentWeightKg, CurrentWeightKg),
           Stance = COALESCE(@stance, Stance),
           ExperienceSummary = COALESCE(@experienceSummary, ExperienceSummary),
           Disabilities = COALESCE(@disabilities, Disabilities),
           MedicalConditions = COALESCE(@medicalConditions, MedicalConditions),
           EmergencyContactName = COALESCE(@emergencyContactName, EmergencyContactName),
           EmergencyContactPhone = COALESCE(@emergencyContactPhone, EmergencyContactPhone),
           Bio = COALESCE(@bio, Bio),
           UpdatedAt = SYSUTCDATETIME()
         WHERE FighterId = @fighterId`,
        {
          fighterId: parts[2],
          firstName: body.firstName ?? null,
          lastName: body.lastName ?? null,
          dateOfBirth: body.dateOfBirth ?? null,
          gender: body.gender ?? null,
          nationality: body.nationality ?? null,
          heightCm: body.heightCm ?? null,
          currentWeightKg: body.currentWeightKg ?? null,
          stance: body.stance ?? null,
          experienceSummary: body.experienceSummary ?? null,
          disabilities: body.disabilities ?? null,
          medicalConditions: body.medicalConditions ?? null,
          emergencyContactName: body.emergencyContactName ?? null,
          emergencyContactPhone: body.emergencyContactPhone ?? null,
          bio: body.bio ?? null,
        },
      )
      await audit(user, 'fighter.updated', 'fighter', parts[2] ?? null, correlationId, body)
      return json({ fighterId: parts[2] })
    }
  }

  if (parts[1] === 'events') {
    if (request.method === 'GET' && parts.length === 2) {
      return json({
        items: await query(
          `SELECT TOP (@limit)
             e.EventId AS eventId, e.Name AS name, e.EventType AS eventType,
             e.Status AS status, e.Description AS description,
             e.VenueName AS venueName, e.VenueAddress AS venueAddress,
             e.StartsAt AS startsAt, e.EndsAt AS endsAt,
             e.RosterDeadlineAt AS rosterDeadlineAt,
             e.PlannedBoutCount AS plannedBoutCount,
             (SELECT COUNT(*) FROM compete.Bouts b WHERE b.EventId = e.EventId) AS boutCount,
             (SELECT COUNT(*) FROM compete.Rosters r WHERE r.EventId = e.EventId) AS rosterCount
           FROM compete.Events e
           ORDER BY e.StartsAt DESC`,
          { limit: parseLimit(url) },
        ),
      })
    }

    if (request.method === 'POST' && parts.length === 2) {
      requireRole(user, 'promoter')
      const body = await parseBody(request, eventSchema)
      if (new Date(body.endsAt) <= new Date(body.startsAt)) {
        throw new ApiError(422, 'The event end must be after its start.', 'invalid_event_dates')
      }
      const eventId = randomUUID()
      await execute(
        `INSERT compete.Events
           (EventId, PromoterUserId, Name, EventType, Status, Description,
            VenueName, VenueAddress, StartsAt, EndsAt, DoorsOpenAt,
            RosterDeadlineAt, WeighInStartsAt, WeighInEndsAt,
            PlannedBoutCount, BoutSpacingMinutes, SocialUrl, VideoEmbedUrl)
         VALUES
           (@eventId, @userId, @name, @eventType, @status, @description,
            @venueName, @venueAddress, @startsAt, @endsAt, @doorsOpenAt,
            @rosterDeadlineAt, @weighInStartsAt, @weighInEndsAt,
            @plannedBoutCount, @boutSpacingMinutes, @socialUrl, @videoEmbedUrl)`,
        {
          eventId,
          userId: user.userId,
          ...Object.fromEntries(
            Object.entries(body).map(([key, value]) => [key, value ?? null]),
          ),
        },
      )
      await audit(user, 'event.created', 'event', eventId, correlationId)
      return json({ eventId }, 201)
    }

    if (request.method === 'GET' && parts.length === 3) {
      const events = await query(
        `SELECT
           EventId AS eventId, Name AS name, EventType AS eventType,
           Status AS status, Description AS description, VenueName AS venueName,
           VenueAddress AS venueAddress, StartsAt AS startsAt, EndsAt AS endsAt,
           DoorsOpenAt AS doorsOpenAt, RosterDeadlineAt AS rosterDeadlineAt,
           WeighInStartsAt AS weighInStartsAt, WeighInEndsAt AS weighInEndsAt,
           PlannedBoutCount AS plannedBoutCount, BoutSpacingMinutes AS boutSpacingMinutes,
           SocialUrl AS socialUrl, VideoEmbedUrl AS videoEmbedUrl
         FROM compete.Events WHERE EventId = @eventId`,
        { eventId: parts[2] },
      )
      if (!events[0]) throw new ApiError(404, 'Event not found.', 'event_not_found')
      return json(events[0])
    }

    if (request.method === 'PATCH' && parts.length === 3) {
      requireRole(user, 'promoter')
      const body = await parseBody(request, eventPatchSchema)
      await execute(
        `UPDATE compete.Events SET
           Name = COALESCE(@name, Name),
           EventType = COALESCE(@eventType, EventType),
           Status = COALESCE(@status, Status),
           Description = COALESCE(@description, Description),
           VenueName = COALESCE(@venueName, VenueName),
           VenueAddress = COALESCE(@venueAddress, VenueAddress),
           StartsAt = COALESCE(@startsAt, StartsAt),
           EndsAt = COALESCE(@endsAt, EndsAt),
           DoorsOpenAt = COALESCE(@doorsOpenAt, DoorsOpenAt),
           RosterDeadlineAt = COALESCE(@rosterDeadlineAt, RosterDeadlineAt),
           WeighInStartsAt = COALESCE(@weighInStartsAt, WeighInStartsAt),
           WeighInEndsAt = COALESCE(@weighInEndsAt, WeighInEndsAt),
           PlannedBoutCount = COALESCE(@plannedBoutCount, PlannedBoutCount),
           BoutSpacingMinutes = COALESCE(@boutSpacingMinutes, BoutSpacingMinutes),
           SocialUrl = COALESCE(@socialUrl, SocialUrl),
           VideoEmbedUrl = COALESCE(@videoEmbedUrl, VideoEmbedUrl),
           UpdatedAt = SYSUTCDATETIME()
         WHERE EventId = @eventId`,
        {
          eventId: parts[2],
          ...Object.fromEntries(
            Object.keys(eventSchema.shape).map((key) => [
              key,
              body[key as keyof typeof body] ?? null,
            ]),
          ),
        },
      )
      await audit(user, 'event.updated', 'event', parts[2] ?? null, correlationId, body)
      return json({ eventId: parts[2] })
    }

    if (parts.length === 4 && parts[3] === 'invitations') {
      const eventId = parts[2]
      if (request.method === 'GET') {
        return json({
          items: await query(
            `SELECT
               i.InvitationId AS invitationId, i.EventId AS eventId,
               i.GymId AS gymId, g.Name AS gymName, i.Status AS status,
               i.Message AS message, i.FighterCriteria AS fighterCriteria,
               i.SentAt AS sentAt, i.RespondedAt AS respondedAt
             FROM compete.RosterInvitations i
             JOIN compete.Gyms g ON g.GymId = i.GymId
             WHERE i.EventId = @eventId ORDER BY g.Name`,
            { eventId },
          ),
        })
      }
      if (request.method === 'POST') {
        requireRole(user, 'promoter')
        const body = await parseBody(request, invitationSchema)
        const invitationId = randomUUID()
        await execute(
          `INSERT compete.RosterInvitations
             (InvitationId, EventId, GymId, Status, Message, FighterCriteria)
           VALUES
             (@invitationId, @eventId, @gymId, 'sent', @message, @criteria)`,
          {
            invitationId,
            eventId,
            gymId: body.gymId,
            message: body.message ?? null,
            criteria: body.fighterCriteria
              ? JSON.stringify(body.fighterCriteria)
              : null,
          },
        )
        await audit(user, 'invitation.sent', 'invitation', invitationId, correlationId)
        return json({ invitationId }, 201)
      }
    }

    if (parts.length === 4 && parts[3] === 'media') {
      const eventId = parts[2]
      if (request.method === 'GET') {
        return json({
          items: await query(
            `SELECT EventMediaId AS eventMediaId, MediaType AS mediaType,
                    Title AS title, Url AS url, SortOrder AS sortOrder,
                    CreatedAt AS createdAt
             FROM compete.EventMedia WHERE EventId = @eventId
             ORDER BY SortOrder, CreatedAt`,
            { eventId },
          ),
        })
      }
      if (request.method === 'POST') {
        requireRole(user, 'promoter')
        const body = await parseBody(request, mediaSchema)
        if (body.mediaType === 'photo') {
          throw new ApiError(422, 'Use image for event media.', 'invalid_event_media_type')
        }
        const eventMediaId = randomUUID()
        await execute(
          `INSERT compete.EventMedia
             (EventMediaId, EventId, MediaType, Title, Url)
           VALUES (@eventMediaId, @eventId, @mediaType, @title, @url)`,
          {
            eventMediaId,
            eventId,
            mediaType: body.mediaType,
            title: body.title ?? null,
            url: body.url,
          },
        )
        await audit(user, 'event.media_added', 'event_media', eventMediaId, correlationId)
        return json({ eventMediaId }, 201)
      }
    }

    if (parts.length === 4 && parts[3] === 'rosters') {
      const eventId = parts[2]
      if (request.method === 'GET') {
        return json({
          items: await query(
            `SELECT
               r.RosterId AS rosterId, r.EventId AS eventId, r.GymId AS gymId,
               g.Name AS gymName, r.Status AS status, r.Notes AS notes,
               r.SubmittedAt AS submittedAt,
               COUNT(rf.RosterFighterId) AS fighterCount
             FROM compete.Rosters r
             JOIN compete.Gyms g ON g.GymId = r.GymId
             LEFT JOIN compete.RosterFighters rf ON rf.RosterId = r.RosterId
             WHERE r.EventId = @eventId
             GROUP BY r.RosterId, r.EventId, r.GymId, g.Name, r.Status,
                      r.Notes, r.SubmittedAt
             ORDER BY g.Name`,
            { eventId },
          ),
        })
      }
      if (request.method === 'POST') {
        requireRole(user, 'coach')
        const body = await parseBody(request, rosterSchema)
        const rosterId = randomUUID()
        await execute(
          `INSERT compete.Rosters
             (RosterId, EventId, GymId, SubmittedByUserId, Status, Notes, SubmittedAt)
           VALUES
             (@rosterId, @eventId, @gymId, @userId, @status, @notes, @submittedAt)`,
          {
            rosterId,
            eventId,
            gymId: body.gymId,
            userId: user.userId,
            status: body.submit ? 'submitted' : 'draft',
            notes: body.notes ?? null,
            submittedAt: body.submit ? new Date() : null,
          },
        )
        await audit(user, 'roster.created', 'roster', rosterId, correlationId)
        return json({ rosterId }, 201)
      }
    }

    if (parts.length === 4 && parts[3] === 'bouts') {
      const eventId = parts[2]
      if (request.method === 'GET') {
        return json({
          items: await query(
            `SELECT
               b.BoutId AS boutId, b.EventId AS eventId, b.BoutNumber AS boutNumber,
               b.Status AS status, b.Discipline AS discipline, b.BoutClass AS boutClass,
               b.NumberOfRounds AS numberOfRounds,
               b.RoundLengthSeconds AS roundLengthSeconds,
               b.WeightDivision AS weightDivision,
               b.ContractWeightKg AS contractWeightKg, b.BeltTitle AS beltTitle,
               b.ScheduledAt AS scheduledAt, b.RedFighterId AS redFighterId,
               CONCAT(red.FirstName, ' ', red.LastName) AS redFighter,
               b.BlueFighterId AS blueFighterId,
               CONCAT(blue.FirstName, ' ', blue.LastName) AS blueFighter,
               b.WinnerFighterId AS winnerFighterId, b.Decision AS decision
             FROM compete.Bouts b
             LEFT JOIN compete.Fighters red ON red.FighterId = b.RedFighterId
             LEFT JOIN compete.Fighters blue ON blue.FighterId = b.BlueFighterId
             WHERE b.EventId = @eventId ORDER BY b.BoutNumber`,
            { eventId },
          ),
        })
      }
      if (request.method === 'POST') {
        requireRole(user, 'promoter')
        const body = await parseBody(request, boutSchema)
        const boutId = randomUUID()
        await execute(
          `INSERT compete.Bouts
             (BoutId, EventId, BoutNumber, Status, Discipline, BoutClass,
              NumberOfRounds, RoundLengthSeconds, BreakLengthSeconds,
              WeightDivision, ContractWeightKg, BeltTitle, ScheduledAt,
              RedFighterId, BlueFighterId)
           VALUES
             (@boutId, @eventId, @boutNumber, @status, @discipline, @boutClass,
              @numberOfRounds, @roundLengthSeconds, @breakLengthSeconds,
              @weightDivision, @contractWeightKg, @beltTitle, @scheduledAt,
              @redFighterId, @blueFighterId)`,
          {
            boutId,
            eventId,
            ...Object.fromEntries(
              Object.entries(body).map(([key, value]) => [key, value ?? null]),
            ),
          },
        )
        await audit(user, 'bout.created', 'bout', boutId, correlationId)
        return json({ boutId }, 201)
      }
    }

    if (parts.length === 4 && parts[3] === 'weigh-ins' && request.method === 'GET') {
      return json({
        items: await query(
          `SELECT
             w.WeighInId AS weighInId, w.EventId AS eventId, w.FighterId AS fighterId,
             CONCAT(f.FirstName, ' ', f.LastName) AS fighterName,
             w.BoutId AS boutId, w.WeightKg AS weightKg, w.WeighedAt AS weighedAt,
             w.Status AS status, w.Notes AS notes
           FROM compete.WeighIns w
           JOIN compete.Fighters f ON f.FighterId = w.FighterId
           WHERE w.EventId = @eventId ORDER BY w.WeighedAt DESC`,
          { eventId: parts[2] },
        ),
      })
    }
  }

  if (
    request.method === 'POST' &&
    parts[1] === 'rosters' &&
    parts.length === 4 &&
    parts[3] === 'fighters'
  ) {
    requireRole(user, 'coach')
    const body = await parseBody(request, rosterFighterSchema)
    const rosterFighterId = randomUUID()
    await execute(
      `INSERT compete.RosterFighters
         (RosterFighterId, RosterId, FighterId, EnteredWeightKg,
          RequestedDiscipline, RequestedClass, AvailabilityNotes)
       VALUES
         (@rosterFighterId, @rosterId, @fighterId, @enteredWeightKg,
          @requestedDiscipline, @requestedClass, @availabilityNotes)`,
      {
        rosterFighterId,
        rosterId: parts[2],
        fighterId: body.fighterId,
        enteredWeightKg: body.enteredWeightKg ?? null,
        requestedDiscipline: body.requestedDiscipline ?? null,
        requestedClass: body.requestedClass ?? null,
        availabilityNotes: body.availabilityNotes ?? null,
      },
    )
    await audit(user, 'roster.fighter_added', 'roster_fighter', rosterFighterId, correlationId)
    return json({ rosterFighterId }, 201)
  }

  if (
    request.method === 'PATCH' &&
    parts[1] === 'invitations' &&
    parts.length === 3
  ) {
    requireRole(user, 'coach')
    const body = await parseBody(request, invitationResponseSchema)
    await execute(
      `UPDATE compete.RosterInvitations
       SET Status = @status, RespondedAt = SYSUTCDATETIME(),
           Message = CASE WHEN @responseMessage IS NULL THEN Message
                          ELSE CONCAT(COALESCE(Message, ''), CHAR(10), 'Response: ', @responseMessage) END
       WHERE InvitationId = @invitationId`,
      {
        invitationId: parts[2],
        status: body.status,
        responseMessage: body.responseMessage ?? null,
      },
    )
    const eventOwners = await query<{ promoterUserId: string; eventId: string }>(
      `SELECT e.PromoterUserId AS promoterUserId, e.EventId AS eventId
       FROM compete.RosterInvitations i
       JOIN compete.Events e ON e.EventId = i.EventId
       WHERE i.InvitationId = @invitationId`,
      { invitationId: parts[2] },
    )
    if (eventOwners[0]) {
      await execute(
        `INSERT compete.Notifications
           (UserId, NotificationType, Title, Message, RelatedEntityType, RelatedEntityId)
         VALUES
           (@userId, 'invitation_response', 'Gym responded to invitation',
            @message, 'event', @eventId)`,
        {
          userId: eventOwners[0].promoterUserId,
          message: `The roster invitation was ${body.status}.`,
          eventId: eventOwners[0].eventId,
        },
      )
    }
    await audit(user, 'invitation.responded', 'invitation', parts[2] ?? null, correlationId, body)
    return json({ invitationId: parts[2], status: body.status })
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/withdrawals') {
    requireRole(user, 'coach', 'fighter', 'parent')
    const body = await parseBody(request, withdrawalSchema)
    const withdrawalId = randomUUID()
    await execute(
      `INSERT compete.Withdrawals
         (WithdrawalId, FighterId, EventId, RosterFighterId, BoutId,
          WithdrawnByUserId, ReasonCategory, ReasonDetails)
       VALUES
         (@withdrawalId, @fighterId, @eventId, @rosterFighterId, @boutId,
          @userId, @reasonCategory, @reasonDetails);
       UPDATE compete.RosterFighters SET Status = 'withdrawn'
         WHERE RosterFighterId = @rosterFighterId;
       UPDATE compete.Bouts SET Status = 'cancelled', UpdatedAt = SYSUTCDATETIME()
         WHERE BoutId = @boutId;`,
      {
        withdrawalId,
        userId: user.userId,
        ...Object.fromEntries(
          Object.entries(body).map(([key, value]) => [key, value ?? null]),
        ),
      },
    )
    const promoters = await query<{ promoterUserId: string }>(
      `SELECT PromoterUserId AS promoterUserId FROM compete.Events WHERE EventId = @eventId`,
      { eventId: body.eventId },
    )
    if (promoters[0]) {
      await execute(
        `INSERT compete.Notifications
           (UserId, NotificationType, Title, Message, RelatedEntityType, RelatedEntityId)
         VALUES
           (@userId, 'fighter_withdrawn', 'Fighter withdrawn',
            @message, 'event', @eventId)`,
        {
          userId: promoters[0].promoterUserId,
          message: body.reasonDetails,
          eventId: body.eventId,
        },
      )
    }
    await audit(user, 'fighter.withdrawn', 'withdrawal', withdrawalId, correlationId, body)
    return json({ withdrawalId }, 201)
  }

  if (parts[1] === 'bouts' && parts.length === 4) {
    const boutId = parts[2]
    if (request.method === 'POST' && parts[3] === 'decision') {
      requireRole(user, 'promoter', 'judge')
      const body = await parseBody(request, decisionSchema)
      await execute(
        `UPDATE compete.Bouts
         SET WinnerFighterId = @winnerFighterId, Decision = @decision,
             DecisionNotes = @decisionNotes, Status = 'completed',
             UpdatedAt = SYSUTCDATETIME()
         WHERE BoutId = @boutId`,
        {
          boutId,
          winnerFighterId: body.winnerFighterId ?? null,
          decision: body.decision,
          decisionNotes: body.decisionNotes ?? null,
        },
      )
      await audit(user, 'bout.decision_recorded', 'bout', boutId, correlationId)
      return json({ boutId, status: 'completed' })
    }

    if (request.method === 'POST' && parts[3] === 'scorecards') {
      requireRole(user, 'judge')
      const body = await parseBody(request, scorecardSchema)
      const scorecardId = randomUUID()
      await execute(
        `INSERT compete.Scorecards
           (ScorecardId, BoutId, JudgeUserId, RedScore, BlueScore, Decision, Notes)
         VALUES
           (@scorecardId, @boutId, @userId, @redScore, @blueScore, @decision, @notes)`,
        {
          scorecardId,
          boutId,
          userId: user.userId,
          redScore: body.redScore ?? null,
          blueScore: body.blueScore ?? null,
          decision: body.decision ?? null,
          notes: body.notes ?? null,
        },
      )
      await audit(user, 'scorecard.submitted', 'scorecard', scorecardId, correlationId)
      return json({ scorecardId }, 201)
    }

    if (parts[3] === 'media') {
      if (request.method === 'GET') {
        return json({
          items: await query(
            `SELECT BoutMediaId AS boutMediaId, MediaType AS mediaType,
                    Title AS title, Url AS url, CreatedAt AS createdAt
             FROM compete.BoutMedia WHERE BoutId = @boutId
             ORDER BY CreatedAt DESC`,
            { boutId },
          ),
        })
      }
      if (request.method === 'POST') {
        const body = await parseBody(request, mediaSchema)
        if (!['photo', 'social', 'video'].includes(body.mediaType)) {
          throw new ApiError(422, 'Bout media must be photo, social or video.', 'invalid_bout_media_type')
        }
        const boutMediaId = randomUUID()
        await execute(
          `INSERT compete.BoutMedia
             (BoutMediaId, BoutId, MediaType, Title, Url, CreatedByUserId)
           VALUES
             (@boutMediaId, @boutId, @mediaType, @title, @url, @userId)`,
          {
            boutMediaId,
            boutId,
            mediaType: body.mediaType,
            title: body.title ?? null,
            url: body.url,
            userId: user.userId,
          },
        )
        await audit(user, 'bout.media_added', 'bout_media', boutMediaId, correlationId)
        return json({ boutMediaId }, 201)
      }
    }
  }

  if (parts[1] === 'bouts' && parts.length === 3 && request.method === 'PATCH') {
    requireRole(user, 'promoter')
    const body = await parseBody(request, boutPatchSchema)
    await execute(
      `UPDATE compete.Bouts SET
         BoutNumber = COALESCE(@boutNumber, BoutNumber),
         Status = COALESCE(@status, Status),
         Discipline = COALESCE(@discipline, Discipline),
         BoutClass = COALESCE(@boutClass, BoutClass),
         NumberOfRounds = COALESCE(@numberOfRounds, NumberOfRounds),
         RoundLengthSeconds = COALESCE(@roundLengthSeconds, RoundLengthSeconds),
         BreakLengthSeconds = COALESCE(@breakLengthSeconds, BreakLengthSeconds),
         WeightDivision = COALESCE(@weightDivision, WeightDivision),
         ContractWeightKg = COALESCE(@contractWeightKg, ContractWeightKg),
         BeltTitle = COALESCE(@beltTitle, BeltTitle),
         ScheduledAt = COALESCE(@scheduledAt, ScheduledAt),
         RedFighterId = COALESCE(@redFighterId, RedFighterId),
         BlueFighterId = COALESCE(@blueFighterId, BlueFighterId),
         UpdatedAt = SYSUTCDATETIME()
       WHERE BoutId = @boutId`,
      {
        boutId: parts[2],
        ...Object.fromEntries(
          Object.keys(boutSchema.shape).map((key) => [
            key,
            body[key as keyof typeof body] ?? null,
          ]),
        ),
      },
    )
    await audit(user, 'bout.updated', 'bout', parts[2] ?? null, correlationId, body)
    return json({ boutId: parts[2] })
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/weigh-ins') {
    requireRole(user, 'coach', 'fighter', 'promoter')
    const body = await parseBody(request, weighInSchema)
    const weighInId = randomUUID()
    await execute(
      `INSERT compete.WeighIns
         (WeighInId, EventId, FighterId, BoutId, WeightKg, WeighedAt, Notes)
       VALUES
         (@weighInId, @eventId, @fighterId, @boutId, @weightKg, @weighedAt, @notes)`,
      {
        weighInId,
        ...body,
        boutId: body.boutId ?? null,
        notes: body.notes ?? null,
      },
    )
    await audit(user, 'weigh_in.submitted', 'weigh_in', weighInId, correlationId)
    return json({ weighInId }, 201)
  }

  if (request.method === 'POST' && parts.join('/') === 'v1/waivers') {
    requireRole(user, 'fighter', 'parent', 'coach')
    const body = await parseBody(request, waiverSchema)
    const waiverId = randomUUID()
    await execute(
      `INSERT compete.WaiverDeclarations
         (WaiverId, EventId, FighterId, DeclaredByUserId, DeclarationVersion,
          Accepted, MedicalFitnessDeclared, GuardianConsent, SignedName, IpAddress)
       VALUES
         (@waiverId, @eventId, @fighterId, @userId, @declarationVersion,
          @accepted, @medicalFitnessDeclared, @guardianConsent, @signedName, @ipAddress)`,
      {
        waiverId,
        userId: user.userId,
        ipAddress: request.headers.get('x-nf-client-connection-ip'),
        ...body,
        guardianConsent: body.guardianConsent ?? null,
      },
    )
    await audit(user, 'waiver.signed', 'waiver', waiverId, correlationId)
    return json({ waiverId }, 201)
  }

  if (parts[1] === 'documents') {
    if (request.method === 'GET' && parts.length === 2) {
      const entityType = url.searchParams.get('entityType')
      const entityId = url.searchParams.get('entityId')
      if (!entityType || !entityId) {
        throw new ApiError(400, 'entityType and entityId are required.', 'missing_document_filter')
      }
      return json({
        items: await query(
          `SELECT
             DocumentId AS documentId, EntityType AS entityType, EntityId AS entityId,
             DocumentType AS documentType, FileName AS fileName,
             ContentType AS contentType, FileSizeBytes AS fileSizeBytes,
             IsPrivate AS isPrivate, CreatedAt AS createdAt
           FROM compete.Documents
           WHERE EntityType = @entityType AND EntityId = @entityId
           ORDER BY CreatedAt DESC`,
          { entityType, entityId },
        ),
      })
    }

    if (request.method === 'POST' && parts.length === 2) {
      const body = await parseBody(request, documentSchema)
      const content = Buffer.from(body.base64Content, 'base64')
      if (!content.length || content.length > 4 * 1024 * 1024) {
        throw new ApiError(
          413,
          'Documents must be between 1 byte and 4 MB when uploaded through the API.',
          'document_too_large',
        )
      }
      const documentId = randomUUID()
      const sha256 = createHash('sha256').update(content).digest('hex')
      await execute(
        `INSERT compete.Documents
           (DocumentId, OwnerUserId, EntityType, EntityId, DocumentType,
            FileName, ContentType, FileSizeBytes, Sha256, Content, IsPrivate)
         VALUES
           (@documentId, @userId, @entityType, @entityId, @documentType,
            @fileName, @contentType, @fileSizeBytes, @sha256, @content, @isPrivate)`,
        {
          documentId,
          userId: user.userId,
          entityType: body.entityType,
          entityId: body.entityId,
          documentType: body.documentType,
          fileName: body.fileName,
          contentType: body.contentType,
          fileSizeBytes: content.length,
          sha256,
          content,
          isPrivate: body.isPrivate,
        },
      )
      await audit(user, 'document.uploaded', 'document', documentId, correlationId, {
        entityType: body.entityType,
        entityId: body.entityId,
        fileName: body.fileName,
      })
      return json({ documentId, sha256, fileSizeBytes: content.length }, 201)
    }

    if (request.method === 'GET' && parts.length === 3) {
      const documents = await query<{
        fileName: string
        contentType: string
        content: Buffer
      }>(
        `SELECT FileName AS fileName, ContentType AS contentType, Content AS content
         FROM compete.Documents WHERE DocumentId = @documentId`,
        { documentId: parts[2] },
      )
      const document = documents[0]
      if (!document) throw new ApiError(404, 'Document not found.', 'document_not_found')
      return new Response(new Uint8Array(document.content), {
        headers: {
          'content-type': document.contentType,
          'content-disposition': `attachment; filename="${document.fileName.replace(/"/g, '')}"`,
          'cache-control': 'private, no-store',
        },
      })
    }
  }

  if (parts[1] === 'notifications') {
    if (request.method === 'GET' && parts.length === 2) {
      return json({
        items: await query(
          `SELECT TOP (@limit)
             NotificationId AS notificationId, NotificationType AS notificationType,
             Title AS title, Message AS message, RelatedEntityType AS relatedEntityType,
             RelatedEntityId AS relatedEntityId, ReadAt AS readAt, CreatedAt AS createdAt
           FROM compete.Notifications
           WHERE UserId = @userId ORDER BY CreatedAt DESC`,
          { userId: user.userId, limit: parseLimit(url) },
        ),
      })
    }
    if (
      request.method === 'POST' &&
      parts.length === 4 &&
      parts[3] === 'read'
    ) {
      await execute(
        `UPDATE compete.Notifications SET ReadAt = SYSUTCDATETIME()
         WHERE NotificationId = @notificationId AND UserId = @userId`,
        { notificationId: parts[2], userId: user.userId },
      )
      return new Response(null, { status: 204 })
    }
  }

  throw new ApiError(404, 'API route not found.', 'route_not_found')
}

export async function handleApiRequest(request: Request) {
  const correlationId = request.headers.get('x-correlation-id') ?? randomUUID()
  const started = Date.now()
  const parts = pathParts(request)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': getConfig().appOrigin,
        'access-control-allow-headers': 'authorization, content-type, x-correlation-id',
        'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      },
    })
  }

  try {
    const publicResponse = await handlePublic(request, parts)
    const response =
      publicResponse ??
      (await handleAuthenticated(
        request,
        parts,
        await requireAuth(request),
        correlationId,
      ))
    response.headers.set('x-correlation-id', correlationId)
    response.headers.set('access-control-allow-origin', getConfig().appOrigin)
    logger.info('HTTP {Method} {Path} responded {StatusCode}', {
      method: request.method,
      path: `/${parts.join('/')}`,
      statusCode: response.status,
      elapsedMs: Date.now() - started,
      correlationId,
    })
    return response
  } catch (error) {
    logger.error('HTTP request failed', {
      method: request.method,
      path: `/${parts.join('/')}`,
      elapsedMs: Date.now() - started,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    })
    const response = errorResponse(error, correlationId)
    response.headers.set('x-correlation-id', correlationId)
    response.headers.set('access-control-allow-origin', getConfig().appOrigin)
    return response
  }
}
