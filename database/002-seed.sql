SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @PromoterId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @CoachId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';
DECLARE @JudgeId UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';
DECLARE @GymId UNIQUEIDENTIFIER = '44444444-4444-4444-4444-444444444444';
DECLARE @EventId UNIQUEIDENTIFIER = '55555555-5555-5555-5555-555555555555';
DECLARE @RedId UNIQUEIDENTIFIER = '66666666-6666-6666-6666-666666666666';
DECLARE @BlueId UNIQUEIDENTIFIER = '77777777-7777-7777-7777-777777777777';

IF NOT EXISTS (SELECT 1 FROM compete.Users WHERE UserId = @PromoterId)
BEGIN
    INSERT compete.Users (UserId, Email, FirstName, LastName, EmailVerifiedAt)
    VALUES
        (@PromoterId, 'alex@northstarpromotions.test', 'Alex', 'Morgan', SYSUTCDATETIME()),
        (@CoachId, 'sam@foundrygym.test', 'Sam', 'Reed', SYSUTCDATETIME()),
        (@JudgeId, 'jordan@officials.test', 'Jordan', 'Blake', SYSUTCDATETIME());

    INSERT compete.UserRoles (UserId, RoleName)
    VALUES
        (@PromoterId, 'promoter'),
        (@CoachId, 'coach'),
        (@JudgeId, 'judge');

    INSERT compete.Gyms
        (GymId, Name, Slug, Email, Phone, TownCity, CountryCode, Bio, CreatedByUserId)
    VALUES
        (@GymId, 'The Foundry Fight Gym', 'the-foundry-fight-gym',
         'hello@foundrygym.test', '0161 555 0198', 'Manchester', 'GB',
         'Community Muay Thai and boxing gym with an active junior and adult team.', @CoachId);

    INSERT compete.GymMembers (GymId, UserId, MembershipRole, IsPrimary)
    VALUES (@GymId, @CoachId, 'owner', 1);

    INSERT compete.Fighters
        (FighterId, ManagedByUserId, FirstName, LastName, DateOfBirth, Gender,
         HeightCm, CurrentWeightKg, Stance, ExperienceSummary, Bio)
    VALUES
        (@RedId, @CoachId, 'Maya', 'Stone', '2001-04-18', 'female', 168, 60.2,
         'orthodox', '8 interclubs, 3 decision wins', 'Sharp technical fighter with strong ring composure.'),
        (@BlueId, @CoachId, 'Nia', 'Cole', '2000-09-03', 'female', 170, 60.7,
         'southpaw', '6 interclubs, 2 decision wins', 'Fast southpaw with an active lead hand.');

    INSERT compete.FighterGymAssociations (FighterId, GymId, IsPrimary)
    VALUES (@RedId, @GymId, 1), (@BlueId, @GymId, 1);

    INSERT compete.FighterRecords (FighterId, Discipline, Wins, Losses, Draws)
    VALUES (@RedId, 'Muay Thai', 3, 1, 0), (@BlueId, 'Muay Thai', 2, 1, 1);

    INSERT compete.Events
        (EventId, PromoterUserId, Name, EventType, Status, Description, VenueName,
         VenueAddress, StartsAt, EndsAt, DoorsOpenAt, RosterDeadlineAt,
         WeighInStartsAt, WeighInEndsAt, PlannedBoutCount, BoutSpacingMinutes)
    VALUES
        (@EventId, @PromoterId, 'North Star Fight Night 08', 'fight_night', 'matching',
         'A matched amateur and novice Muay Thai card featuring gyms from across the North West.',
         'Victoria Warehouse', 'Trafford Wharf Road, Manchester',
         DATEADD(day, 28, DATEADD(hour, 18, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2))),
         DATEADD(day, 28, DATEADD(hour, 23, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2))),
         DATEADD(day, 28, DATEADD(hour, 17, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2))),
         DATEADD(day, 14, SYSUTCDATETIME()),
         DATEADD(day, 28, DATEADD(hour, 10, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2))),
         DATEADD(day, 28, DATEADD(hour, 12, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2))),
         12, 18);

    INSERT compete.RosterInvitations (EventId, GymId, Status, Message, FighterCriteria)
    VALUES
        (@EventId, @GymId, 'accepted',
         'We would like The Foundry to join our August card.',
         '{"disciplines":["Muay Thai"],"classes":["N","C","B"],"weightRangeKg":{"min":50,"max":82}}');

    DECLARE @RosterId UNIQUEIDENTIFIER = NEWID();
    INSERT compete.Rosters (RosterId, EventId, GymId, SubmittedByUserId, Status, SubmittedAt)
    VALUES (@RosterId, @EventId, @GymId, @CoachId, 'submitted', SYSUTCDATETIME());

    INSERT compete.RosterFighters
        (RosterId, FighterId, EnteredWeightKg, RequestedDiscipline, RequestedClass, Status)
    VALUES
        (@RosterId, @RedId, 60.2, 'Muay Thai', 'N class', 'matched'),
        (@RosterId, @BlueId, 60.7, 'Muay Thai', 'N class', 'matched');

    INSERT compete.Bouts
        (EventId, BoutNumber, Status, Discipline, BoutClass, NumberOfRounds,
         RoundLengthSeconds, WeightDivision, ContractWeightKg, ScheduledAt,
         RedFighterId, BlueFighterId)
    VALUES
        (@EventId, 1, 'confirmed', 'Muay Thai', 'N class', 3, 120,
         'Lightweight', 61.0,
         DATEADD(day, 28, DATEADD(minute, 30, DATEADD(hour, 18, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2)))),
         @RedId, @BlueId);

    INSERT compete.Notifications (UserId, NotificationType, Title, Message, RelatedEntityType, RelatedEntityId)
    VALUES
        (@PromoterId, 'roster_submitted', 'Roster ready for review',
         'The Foundry Fight Gym submitted 2 fighters for North Star Fight Night 08.', 'event', @EventId),
        (@CoachId, 'bout_confirmed', 'Bout confirmed',
         'Maya Stone has been placed in bout 1 against Nia Cole.', 'event', @EventId);
END;
