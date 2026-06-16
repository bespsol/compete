import { z } from 'zod'

export const roleSchema = z.enum([
  'promoter',
  'coach',
  'fighter',
  'judge',
  'parent',
  'admin',
])

export const registerSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).optional(),
  role: roleSchema,
})

export const requestOtpSchema = z.object({
  email: z.email(),
  purpose: z.enum(['login', 'register']).default('login'),
})

export const verifyOtpSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
})

export const gymSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email().optional(),
  phone: z.string().max(50).optional(),
  websiteUrl: z.url().optional(),
  addressLine1: z.string().max(200).optional(),
  townCity: z.string().max(120).optional(),
  countyRegion: z.string().max(120).optional(),
  postcode: z.string().max(20).optional(),
  countryCode: z.string().length(2).default('GB'),
  bio: z.string().max(2000).optional(),
})
export const gymPatchSchema = gymSchema.partial()

export const fighterSchema = z.object({
  gymId: z.uuid().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.iso.date(),
  gender: z.string().max(30).optional(),
  nationality: z.string().max(80).optional(),
  heightCm: z.number().positive().max(250).optional(),
  currentWeightKg: z.number().positive().max(300).optional(),
  stance: z.enum(['orthodox', 'southpaw', 'switch']).optional(),
  experienceSummary: z.string().max(2000).optional(),
  disabilities: z.string().max(2000).optional(),
  medicalConditions: z.string().max(2000).optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
})
export const fighterPatchSchema = fighterSchema.omit({ gymId: true }).partial()

export const eventSchema = z.object({
  name: z.string().trim().min(3).max(240),
  eventType: z.enum(['interclub', 'seminar', 'fight_night', 'competition']),
  status: z
    .enum(['draft', 'inviting', 'matching', 'published', 'live', 'completed', 'cancelled'])
    .default('draft'),
  description: z.string().max(10_000).optional(),
  venueName: z.string().trim().min(2).max(200),
  venueAddress: z.string().max(500).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  doorsOpenAt: z.iso.datetime().optional(),
  rosterDeadlineAt: z.iso.datetime().optional(),
  weighInStartsAt: z.iso.datetime().optional(),
  weighInEndsAt: z.iso.datetime().optional(),
  plannedBoutCount: z.number().int().positive().max(300).optional(),
  boutSpacingMinutes: z.number().int().min(1).max(180).default(15),
  socialUrl: z.url().optional(),
  videoEmbedUrl: z.url().optional(),
})
export const eventPatchSchema = eventSchema.partial()

export const mediaSchema = z.object({
  mediaType: z.enum(['image', 'social', 'video', 'promo', 'photo']),
  title: z.string().max(200).optional(),
  url: z.url().max(1000),
})

export const invitationSchema = z.object({
  gymId: z.uuid(),
  message: z.string().max(2000).optional(),
  fighterCriteria: z
    .object({
      disciplines: z.array(z.string().max(80)).default([]),
      classes: z.array(z.string().max(80)).default([]),
      weightRangeKg: z
        .object({ min: z.number().positive(), max: z.number().positive() })
        .optional(),
      ages: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
})

export const invitationResponseSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  responseMessage: z.string().max(1000).optional(),
})

export const rosterSchema = z.object({
  gymId: z.uuid(),
  notes: z.string().max(2000).optional(),
  submit: z.boolean().default(false),
})

export const rosterFighterSchema = z.object({
  fighterId: z.uuid(),
  enteredWeightKg: z.number().positive().max(300).optional(),
  requestedDiscipline: z.string().max(80).optional(),
  requestedClass: z.string().max(80).optional(),
  availabilityNotes: z.string().max(1000).optional(),
})

export const boutSchema = z.object({
  boutNumber: z.number().int().positive(),
  discipline: z.string().min(2).max(80),
  boutClass: z.string().max(80).optional(),
  numberOfRounds: z.number().int().min(1).max(20),
  roundLengthSeconds: z.number().int().min(30).max(1800),
  breakLengthSeconds: z.number().int().min(0).max(600).default(60),
  weightDivision: z.string().max(80).optional(),
  contractWeightKg: z.number().positive().max(300).optional(),
  beltTitle: z.string().max(200).optional(),
  scheduledAt: z.iso.datetime().optional(),
  redFighterId: z.uuid().optional(),
  blueFighterId: z.uuid().optional(),
  status: z
    .enum(['proposed', 'confirmed', 'published', 'in_progress', 'completed', 'cancelled'])
    .default('proposed'),
})
export const boutPatchSchema = boutSchema.partial()

export const withdrawalSchema = z.object({
  fighterId: z.uuid(),
  eventId: z.uuid(),
  boutId: z.uuid().optional(),
  rosterFighterId: z.uuid().optional(),
  reasonCategory: z.string().min(2).max(50),
  reasonDetails: z.string().min(10).max(2000),
})

export const decisionSchema = z.object({
  winnerFighterId: z.uuid().nullable().optional(),
  decision: z.string().min(2).max(80),
  decisionNotes: z.string().max(2000).optional(),
})

export const scorecardSchema = z.object({
  redScore: z.number().int().min(0).max(1000).optional(),
  blueScore: z.number().int().min(0).max(1000).optional(),
  decision: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
})

export const weighInSchema = z.object({
  eventId: z.uuid(),
  fighterId: z.uuid(),
  boutId: z.uuid().optional(),
  weightKg: z.number().positive().max(300),
  weighedAt: z.iso.datetime(),
  notes: z.string().max(1000).optional(),
})

export const waiverSchema = z.object({
  eventId: z.uuid(),
  fighterId: z.uuid(),
  declarationVersion: z.string().min(1).max(30),
  accepted: z.literal(true),
  medicalFitnessDeclared: z.boolean(),
  guardianConsent: z.boolean().optional(),
  signedName: z.string().min(2).max(200),
})

export const documentSchema = z.object({
  entityType: z.enum(['fighter', 'event', 'bout', 'weigh_in', 'waiver', 'gym']),
  entityId: z.uuid(),
  documentType: z.string().min(2).max(50),
  fileName: z.string().min(1).max(260),
  contentType: z.string().min(3).max(150),
  base64Content: z.string().min(4),
  isPrivate: z.boolean().default(true),
})
