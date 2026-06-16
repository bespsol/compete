import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const schemaPath = new URL('../database/001-schema.sql', import.meta.url)
const collectionPath = new URL(
  '../postman/COMPETE.postman_collection.json',
  import.meta.url,
)

test('SQL schema contains the complete operational model', async () => {
  const schema = await readFile(schemaPath, 'utf8')
  const tables = [
    'Users',
    'UserRoles',
    'OtpChallenges',
    'Sessions',
    'Gyms',
    'GymMembers',
    'Fighters',
    'FighterGymAssociations',
    'FighterGuardians',
    'FighterRecords',
    'Events',
    'EventMedia',
    'RosterInvitations',
    'Rosters',
    'RosterFighters',
    'Bouts',
    'BoutOfficials',
    'BoutMedia',
    'Withdrawals',
    'WeighIns',
    'WaiverDeclarations',
    'Documents',
    'Scorecards',
    'Notifications',
    'AuditLog',
  ]

  for (const table of tables) {
    assert.match(schema, new RegExp(`CREATE TABLE compete\\.${table}\\b`))
  }
  assert.match(schema, /Content VARBINARY\(MAX\) NOT NULL/)
})

test('Postman collection covers every API operation', async () => {
  const collection = JSON.parse(await readFile(collectionPath, 'utf8'))
  const requests = collection.item.flatMap((folder) => folder.item)
  const keys = new Set(
    requests.map((item) => {
      const url = item.request.url.raw.replace('{{baseUrl}}', '')
      return `${item.request.method} ${url}`
    }),
  )

  const expected = [
    'GET /health',
    'POST /auth/register',
    'POST /auth/request-otp',
    'POST /auth/verify-otp',
    'GET /auth/me',
    'POST /auth/logout',
    'GET /dashboard',
    'GET /gyms',
    'POST /gyms',
    'GET /gyms/{{gymId}}',
    'PATCH /gyms/{{gymId}}',
    'GET /fighters',
    'POST /fighters',
    'GET /fighters/{{fighterId}}',
    'PATCH /fighters/{{fighterId}}',
    'GET /events',
    'POST /events',
    'GET /events/{{eventId}}',
    'PATCH /events/{{eventId}}',
    'GET /events/{{eventId}}/invitations',
    'POST /events/{{eventId}}/invitations',
    'PATCH /invitations/{{invitationId}}',
    'GET /events/{{eventId}}/media',
    'POST /events/{{eventId}}/media',
    'GET /events/{{eventId}}/rosters',
    'POST /events/{{eventId}}/rosters',
    'POST /rosters/{{rosterId}}/fighters',
    'GET /events/{{eventId}}/bouts',
    'POST /events/{{eventId}}/bouts',
    'PATCH /bouts/{{boutId}}',
    'GET /bouts/{{boutId}}/media',
    'POST /bouts/{{boutId}}/media',
    'POST /bouts/{{boutId}}/decision',
    'POST /bouts/{{boutId}}/scorecards',
    'POST /withdrawals',
    'GET /events/{{eventId}}/weigh-ins',
    'POST /weigh-ins',
    'POST /waivers',
    'GET /documents?entityType=fighter&entityId={{fighterId}}',
    'POST /documents',
    'GET /documents/{{documentId}}',
    'GET /notifications',
    'POST /notifications/{{notificationId}}/read',
  ]

  for (const operation of expected) {
    assert.ok(keys.has(operation), `Missing Postman request: ${operation}`)
  }
})
