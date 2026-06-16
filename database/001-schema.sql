SET NOCOUNT ON;
SET XACT_ABORT ON;

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'compete')
    EXEC('CREATE SCHEMA compete');
GO

CREATE TABLE compete.Users (
    UserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Email NVARCHAR(320) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(50) NULL,
    DateOfBirth DATE NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    EmailVerifiedAt DATETIME2 NULL,
    LastLoginAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
GO

CREATE TABLE compete.UserRoles (
    UserRoleId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UserRoles PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    RoleName NVARCHAR(30) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserRoles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_UserRoles_RoleName CHECK (RoleName IN ('promoter','coach','fighter','judge','parent','admin')),
    CONSTRAINT UQ_UserRoles_User_Role UNIQUE (UserId, RoleName)
);
GO

CREATE TABLE compete.OtpChallenges (
    OtpChallengeId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OtpChallenges PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NULL,
    Email NVARCHAR(320) NOT NULL,
    Purpose NVARCHAR(30) NOT NULL,
    CodeHash CHAR(64) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    AttemptCount INT NOT NULL CONSTRAINT DF_OtpChallenges_AttemptCount DEFAULT 0,
    ConsumedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OtpChallenges_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_OtpChallenges_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_OtpChallenges_Purpose CHECK (Purpose IN ('login','register','email_change'))
);
GO

CREATE INDEX IX_OtpChallenges_Email_CreatedAt
    ON compete.OtpChallenges(Email, CreatedAt DESC);
GO

CREATE TABLE compete.Sessions (
    SessionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Sessions PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    TokenHash CHAR(64) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    RevokedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Sessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Sessions_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId)
);
GO

CREATE TABLE compete.Gyms (
    GymId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Gyms PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name NVARCHAR(200) NOT NULL,
    Slug NVARCHAR(220) NOT NULL,
    Email NVARCHAR(320) NULL,
    Phone NVARCHAR(50) NULL,
    WebsiteUrl NVARCHAR(500) NULL,
    AddressLine1 NVARCHAR(200) NULL,
    AddressLine2 NVARCHAR(200) NULL,
    TownCity NVARCHAR(120) NULL,
    CountyRegion NVARCHAR(120) NULL,
    Postcode NVARCHAR(20) NULL,
    CountryCode CHAR(2) NOT NULL CONSTRAINT DF_Gyms_CountryCode DEFAULT 'GB',
    Bio NVARCHAR(2000) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Gyms_IsActive DEFAULT 1,
    CreatedByUserId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Gyms_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Gyms_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Gyms_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT UQ_Gyms_Slug UNIQUE (Slug)
);
GO

CREATE TABLE compete.GymMembers (
    GymMemberId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GymMembers PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    GymId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    MembershipRole NVARCHAR(30) NOT NULL,
    IsPrimary BIT NOT NULL CONSTRAINT DF_GymMembers_IsPrimary DEFAULT 0,
    JoinedAt DATETIME2 NOT NULL CONSTRAINT DF_GymMembers_JoinedAt DEFAULT SYSUTCDATETIME(),
    LeftAt DATETIME2 NULL,
    CONSTRAINT FK_GymMembers_Gyms FOREIGN KEY (GymId) REFERENCES compete.Gyms(GymId),
    CONSTRAINT FK_GymMembers_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_GymMembers_Role CHECK (MembershipRole IN ('owner','coach','fighter','manager')),
    CONSTRAINT UQ_GymMembers_Gym_User_Role UNIQUE (GymId, UserId, MembershipRole)
);
GO

CREATE TABLE compete.Fighters (
    FighterId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Fighters PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NULL,
    ManagedByUserId UNIQUEIDENTIFIER NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Gender NVARCHAR(30) NULL,
    Nationality NVARCHAR(80) NULL,
    HeightCm DECIMAL(5,2) NULL,
    CurrentWeightKg DECIMAL(6,2) NULL,
    Stance NVARCHAR(20) NULL,
    ExperienceSummary NVARCHAR(2000) NULL,
    Disabilities NVARCHAR(2000) NULL,
    MedicalConditions NVARCHAR(2000) NULL,
    EmergencyContactName NVARCHAR(200) NULL,
    EmergencyContactPhone NVARCHAR(50) NULL,
    Bio NVARCHAR(2000) NULL,
    IsMinor BIT NOT NULL CONSTRAINT DF_Fighters_IsMinor DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_Fighters_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Fighters_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Fighters_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Fighters_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT FK_Fighters_ManagedBy FOREIGN KEY (ManagedByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_Fighters_Stance CHECK (Stance IS NULL OR Stance IN ('orthodox','southpaw','switch'))
);
GO

CREATE TABLE compete.FighterGymAssociations (
    FighterGymAssociationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FighterGymAssociations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    FighterId UNIQUEIDENTIFIER NOT NULL,
    GymId UNIQUEIDENTIFIER NOT NULL,
    IsPrimary BIT NOT NULL CONSTRAINT DF_FighterGymAssociations_IsPrimary DEFAULT 0,
    StartedAt DATE NOT NULL CONSTRAINT DF_FighterGymAssociations_StartedAt DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    EndedAt DATE NULL,
    CONSTRAINT FK_FighterGymAssociations_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_FighterGymAssociations_Gyms FOREIGN KEY (GymId) REFERENCES compete.Gyms(GymId)
);
GO

CREATE TABLE compete.FighterGuardians (
    FighterGuardianId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FighterGuardians PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    FighterId UNIQUEIDENTIFIER NOT NULL,
    GuardianUserId UNIQUEIDENTIFIER NOT NULL,
    Relationship NVARCHAR(50) NOT NULL,
    CanSignWaivers BIT NOT NULL CONSTRAINT DF_FighterGuardians_CanSignWaivers DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_FighterGuardians_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_FighterGuardians_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_FighterGuardians_Users FOREIGN KEY (GuardianUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT UQ_FighterGuardians_Fighter_User UNIQUE (FighterId, GuardianUserId)
);
GO

CREATE TABLE compete.FighterRecords (
    FighterRecordId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FighterRecords PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    FighterId UNIQUEIDENTIFIER NOT NULL,
    Discipline NVARCHAR(80) NOT NULL,
    Wins INT NOT NULL CONSTRAINT DF_FighterRecords_Wins DEFAULT 0,
    Losses INT NOT NULL CONSTRAINT DF_FighterRecords_Losses DEFAULT 0,
    Draws INT NOT NULL CONSTRAINT DF_FighterRecords_Draws DEFAULT 0,
    NoContests INT NOT NULL CONSTRAINT DF_FighterRecords_NoContests DEFAULT 0,
    Notes NVARCHAR(1000) NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_FighterRecords_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_FighterRecords_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT UQ_FighterRecords_Fighter_Discipline UNIQUE (FighterId, Discipline)
);
GO

CREATE TABLE compete.Events (
    EventId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Events PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PromoterUserId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(240) NOT NULL,
    EventType NVARCHAR(30) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Events_Status DEFAULT 'draft',
    Description NVARCHAR(MAX) NULL,
    VenueName NVARCHAR(200) NOT NULL,
    VenueAddress NVARCHAR(500) NULL,
    StartsAt DATETIME2 NOT NULL,
    EndsAt DATETIME2 NOT NULL,
    DoorsOpenAt DATETIME2 NULL,
    RosterDeadlineAt DATETIME2 NULL,
    WeighInStartsAt DATETIME2 NULL,
    WeighInEndsAt DATETIME2 NULL,
    PlannedBoutCount INT NULL,
    BoutSpacingMinutes INT NOT NULL CONSTRAINT DF_Events_BoutSpacing DEFAULT 15,
    SocialUrl NVARCHAR(500) NULL,
    VideoEmbedUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Events_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Events_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Events_Promoter FOREIGN KEY (PromoterUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_Events_Type CHECK (EventType IN ('interclub','seminar','fight_night','competition')),
    CONSTRAINT CK_Events_Status CHECK (Status IN ('draft','inviting','matching','published','live','completed','cancelled')),
    CONSTRAINT CK_Events_Dates CHECK (EndsAt > StartsAt)
);
GO

CREATE INDEX IX_Events_StartsAt ON compete.Events(StartsAt);
GO

CREATE TABLE compete.EventMedia (
    EventMediaId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_EventMedia PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    MediaType NVARCHAR(30) NOT NULL,
    Title NVARCHAR(200) NULL,
    Url NVARCHAR(1000) NOT NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_EventMedia_SortOrder DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EventMedia_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_EventMedia_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT CK_EventMedia_Type CHECK (MediaType IN ('image','social','video','promo'))
);
GO

CREATE TABLE compete.RosterInvitations (
    InvitationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RosterInvitations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    GymId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Invitations_Status DEFAULT 'sent',
    Message NVARCHAR(2000) NULL,
    FighterCriteria NVARCHAR(MAX) NULL,
    SentAt DATETIME2 NOT NULL CONSTRAINT DF_Invitations_SentAt DEFAULT SYSUTCDATETIME(),
    RespondedAt DATETIME2 NULL,
    CONSTRAINT FK_Invitations_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_Invitations_Gyms FOREIGN KEY (GymId) REFERENCES compete.Gyms(GymId),
    CONSTRAINT CK_Invitations_Status CHECK (Status IN ('draft','sent','viewed','accepted','declined','expired')),
    CONSTRAINT UQ_Invitations_Event_Gym UNIQUE (EventId, GymId)
);
GO

CREATE TABLE compete.Rosters (
    RosterId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Rosters PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    GymId UNIQUEIDENTIFIER NOT NULL,
    SubmittedByUserId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Rosters_Status DEFAULT 'draft',
    Notes NVARCHAR(2000) NULL,
    SubmittedAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Rosters_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Rosters_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_Rosters_Gyms FOREIGN KEY (GymId) REFERENCES compete.Gyms(GymId),
    CONSTRAINT FK_Rosters_SubmittedBy FOREIGN KEY (SubmittedByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_Rosters_Status CHECK (Status IN ('draft','submitted','reviewing','accepted','changes_requested','withdrawn')),
    CONSTRAINT UQ_Rosters_Event_Gym UNIQUE (EventId, GymId)
);
GO

CREATE TABLE compete.RosterFighters (
    RosterFighterId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RosterFighters PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    RosterId UNIQUEIDENTIFIER NOT NULL,
    FighterId UNIQUEIDENTIFIER NOT NULL,
    EnteredWeightKg DECIMAL(6,2) NULL,
    RequestedDiscipline NVARCHAR(80) NULL,
    RequestedClass NVARCHAR(80) NULL,
    AvailabilityNotes NVARCHAR(1000) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_RosterFighters_Status DEFAULT 'available',
    AddedAt DATETIME2 NOT NULL CONSTRAINT DF_RosterFighters_AddedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_RosterFighters_Rosters FOREIGN KEY (RosterId) REFERENCES compete.Rosters(RosterId),
    CONSTRAINT FK_RosterFighters_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT CK_RosterFighters_Status CHECK (Status IN ('available','shortlisted','matched','withdrawn','declined')),
    CONSTRAINT UQ_RosterFighters_Roster_Fighter UNIQUE (RosterId, FighterId)
);
GO

CREATE TABLE compete.Bouts (
    BoutId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Bouts PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    BoutNumber INT NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Bouts_Status DEFAULT 'proposed',
    Discipline NVARCHAR(80) NOT NULL,
    BoutClass NVARCHAR(80) NULL,
    NumberOfRounds INT NOT NULL,
    RoundLengthSeconds INT NOT NULL,
    BreakLengthSeconds INT NOT NULL CONSTRAINT DF_Bouts_BreakLength DEFAULT 60,
    WeightDivision NVARCHAR(80) NULL,
    ContractWeightKg DECIMAL(6,2) NULL,
    BeltTitle NVARCHAR(200) NULL,
    ScheduledAt DATETIME2 NULL,
    RedFighterId UNIQUEIDENTIFIER NULL,
    BlueFighterId UNIQUEIDENTIFIER NULL,
    WinnerFighterId UNIQUEIDENTIFIER NULL,
    Decision NVARCHAR(80) NULL,
    DecisionNotes NVARCHAR(2000) NULL,
    RefereeUserId UNIQUEIDENTIFIER NULL,
    PublishedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bouts_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bouts_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Bouts_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_Bouts_RedFighter FOREIGN KEY (RedFighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_Bouts_BlueFighter FOREIGN KEY (BlueFighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_Bouts_Winner FOREIGN KEY (WinnerFighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_Bouts_Referee FOREIGN KEY (RefereeUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_Bouts_Status CHECK (Status IN ('proposed','confirmed','published','in_progress','completed','cancelled')),
    CONSTRAINT CK_Bouts_Fighters CHECK (RedFighterId IS NULL OR BlueFighterId IS NULL OR RedFighterId <> BlueFighterId),
    CONSTRAINT UQ_Bouts_Event_Number UNIQUE (EventId, BoutNumber)
);
GO

CREATE TABLE compete.BoutOfficials (
    BoutOfficialId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BoutOfficials PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    BoutId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    OfficialRole NVARCHAR(30) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BoutOfficials_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BoutOfficials_Bouts FOREIGN KEY (BoutId) REFERENCES compete.Bouts(BoutId),
    CONSTRAINT FK_BoutOfficials_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_BoutOfficials_Role CHECK (OfficialRole IN ('referee','judge','timekeeper','inspector')),
    CONSTRAINT UQ_BoutOfficials_Bout_User_Role UNIQUE (BoutId, UserId, OfficialRole)
);
GO

CREATE TABLE compete.BoutMedia (
    BoutMediaId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BoutMedia PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    BoutId UNIQUEIDENTIFIER NOT NULL,
    MediaType NVARCHAR(30) NOT NULL,
    Title NVARCHAR(200) NULL,
    Url NVARCHAR(1000) NOT NULL,
    CreatedByUserId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BoutMedia_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BoutMedia_Bouts FOREIGN KEY (BoutId) REFERENCES compete.Bouts(BoutId),
    CONSTRAINT FK_BoutMedia_Users FOREIGN KEY (CreatedByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_BoutMedia_Type CHECK (MediaType IN ('photo','social','video'))
);
GO

CREATE TABLE compete.Withdrawals (
    WithdrawalId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Withdrawals PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    FighterId UNIQUEIDENTIFIER NOT NULL,
    EventId UNIQUEIDENTIFIER NOT NULL,
    RosterFighterId UNIQUEIDENTIFIER NULL,
    BoutId UNIQUEIDENTIFIER NULL,
    WithdrawnByUserId UNIQUEIDENTIFIER NOT NULL,
    ReasonCategory NVARCHAR(50) NOT NULL,
    ReasonDetails NVARCHAR(2000) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Withdrawals_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Withdrawals_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_Withdrawals_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_Withdrawals_RosterFighter FOREIGN KEY (RosterFighterId) REFERENCES compete.RosterFighters(RosterFighterId),
    CONSTRAINT FK_Withdrawals_Bout FOREIGN KEY (BoutId) REFERENCES compete.Bouts(BoutId),
    CONSTRAINT FK_Withdrawals_User FOREIGN KEY (WithdrawnByUserId) REFERENCES compete.Users(UserId)
);
GO

CREATE TABLE compete.WeighIns (
    WeighInId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_WeighIns PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    FighterId UNIQUEIDENTIFIER NOT NULL,
    BoutId UNIQUEIDENTIFIER NULL,
    WeightKg DECIMAL(6,2) NOT NULL,
    WeighedAt DATETIME2 NOT NULL,
    VerifiedByUserId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_WeighIns_Status DEFAULT 'submitted',
    Notes NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_WeighIns_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_WeighIns_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_WeighIns_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_WeighIns_Bouts FOREIGN KEY (BoutId) REFERENCES compete.Bouts(BoutId),
    CONSTRAINT FK_WeighIns_Verifier FOREIGN KEY (VerifiedByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_WeighIns_Status CHECK (Status IN ('submitted','verified','rejected','missed'))
);
GO

CREATE TABLE compete.WaiverDeclarations (
    WaiverId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Waivers PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EventId UNIQUEIDENTIFIER NOT NULL,
    FighterId UNIQUEIDENTIFIER NOT NULL,
    DeclaredByUserId UNIQUEIDENTIFIER NOT NULL,
    DeclarationVersion NVARCHAR(30) NOT NULL,
    Accepted BIT NOT NULL,
    MedicalFitnessDeclared BIT NOT NULL,
    GuardianConsent BIT NULL,
    SignedName NVARCHAR(200) NOT NULL,
    SignedAt DATETIME2 NOT NULL CONSTRAINT DF_Waivers_SignedAt DEFAULT SYSUTCDATETIME(),
    IpAddress NVARCHAR(64) NULL,
    CONSTRAINT FK_Waivers_Events FOREIGN KEY (EventId) REFERENCES compete.Events(EventId),
    CONSTRAINT FK_Waivers_Fighters FOREIGN KEY (FighterId) REFERENCES compete.Fighters(FighterId),
    CONSTRAINT FK_Waivers_Users FOREIGN KEY (DeclaredByUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT UQ_Waivers_Event_Fighter_Version UNIQUE (EventId, FighterId, DeclarationVersion)
);
GO

CREATE TABLE compete.Documents (
    DocumentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Documents PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    OwnerUserId UNIQUEIDENTIFIER NOT NULL,
    EntityType NVARCHAR(40) NOT NULL,
    EntityId UNIQUEIDENTIFIER NOT NULL,
    DocumentType NVARCHAR(50) NOT NULL,
    FileName NVARCHAR(260) NOT NULL,
    ContentType NVARCHAR(150) NOT NULL,
    FileSizeBytes BIGINT NOT NULL,
    Sha256 CHAR(64) NOT NULL,
    Content VARBINARY(MAX) NOT NULL,
    IsPrivate BIT NOT NULL CONSTRAINT DF_Documents_IsPrivate DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Documents_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Documents_Owner FOREIGN KEY (OwnerUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_Documents_EntityType CHECK (EntityType IN ('fighter','event','bout','weigh_in','waiver','gym')),
    CONSTRAINT CK_Documents_Size CHECK (FileSizeBytes > 0 AND FileSizeBytes <= 10485760)
);
GO

CREATE INDEX IX_Documents_Entity ON compete.Documents(EntityType, EntityId);
GO

CREATE TABLE compete.Scorecards (
    ScorecardId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Scorecards PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    BoutId UNIQUEIDENTIFIER NOT NULL,
    JudgeUserId UNIQUEIDENTIFIER NOT NULL,
    RedScore INT NULL,
    BlueScore INT NULL,
    Decision NVARCHAR(80) NULL,
    Notes NVARCHAR(1000) NULL,
    SubmittedAt DATETIME2 NOT NULL CONSTRAINT DF_Scorecards_SubmittedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Scorecards_Bouts FOREIGN KEY (BoutId) REFERENCES compete.Bouts(BoutId),
    CONSTRAINT FK_Scorecards_Judges FOREIGN KEY (JudgeUserId) REFERENCES compete.Users(UserId),
    CONSTRAINT UQ_Scorecards_Bout_Judge UNIQUE (BoutId, JudgeUserId)
);
GO

CREATE TABLE compete.Notifications (
    NotificationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    NotificationType NVARCHAR(60) NOT NULL,
    Title NVARCHAR(240) NOT NULL,
    Message NVARCHAR(2000) NOT NULL,
    RelatedEntityType NVARCHAR(40) NULL,
    RelatedEntityId UNIQUEIDENTIFIER NULL,
    ReadAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId)
);
GO

CREATE INDEX IX_Notifications_User_Unread ON compete.Notifications(UserId, ReadAt, CreatedAt DESC);
GO

CREATE TABLE compete.AuditLog (
    AuditLogId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLog PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NULL,
    Action NVARCHAR(100) NOT NULL,
    EntityType NVARCHAR(50) NOT NULL,
    EntityId UNIQUEIDENTIFIER NULL,
    DetailsJson NVARCHAR(MAX) NULL,
    CorrelationId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLog_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AuditLog_Users FOREIGN KEY (UserId) REFERENCES compete.Users(UserId),
    CONSTRAINT CK_AuditLog_Json CHECK (DetailsJson IS NULL OR ISJSON(DetailsJson) = 1)
);
GO

CREATE OR ALTER VIEW compete.vw_FighterProfiles AS
SELECT
    f.FighterId,
    f.UserId,
    f.FirstName,
    f.LastName,
    f.DateOfBirth,
    f.HeightCm,
    f.CurrentWeightKg,
    f.Stance,
    f.ExperienceSummary,
    g.GymId,
    g.Name AS GymName
FROM compete.Fighters f
LEFT JOIN compete.FighterGymAssociations fga
    ON fga.FighterId = f.FighterId AND fga.IsPrimary = 1 AND fga.EndedAt IS NULL
LEFT JOIN compete.Gyms g ON g.GymId = fga.GymId;
GO

CREATE OR ALTER VIEW compete.vw_EventFightCards AS
SELECT
    e.EventId,
    e.Name AS EventName,
    b.BoutId,
    b.BoutNumber,
    b.Status,
    b.Discipline,
    b.BoutClass,
    b.WeightDivision,
    b.NumberOfRounds,
    b.RoundLengthSeconds,
    b.ScheduledAt,
    CONCAT(r.FirstName, ' ', r.LastName) AS RedFighter,
    CONCAT(bl.FirstName, ' ', bl.LastName) AS BlueFighter,
    b.Decision
FROM compete.Events e
JOIN compete.Bouts b ON b.EventId = e.EventId
LEFT JOIN compete.Fighters r ON r.FighterId = b.RedFighterId
LEFT JOIN compete.Fighters bl ON bl.FighterId = b.BlueFighterId;
GO
