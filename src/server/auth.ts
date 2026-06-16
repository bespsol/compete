import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { getConfig } from './config'
import { execute, query } from './db'
import { ApiError } from './http'

type UserRow = {
  userId: string
  email: string
  firstName: string
  lastName: string
  sessionId: string
  expiresAt: Date
}

export type AuthUser = {
  userId: string
  email: string
  firstName: string
  lastName: string
  sessionId: string
  roles: string[]
}

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function generateOtp() {
  return randomInt(100000, 1000000).toString()
}

export function hashOtp(email: string, code: string) {
  return hashValue(`${email.toLowerCase()}:${code}:${getConfig().otpPepper}`)
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value: string) {
  return createHmac('sha256', getConfig().jwtSecret)
    .update(value)
    .digest('base64url')
}

function issueToken(userId: string, sessionId: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    sub: userId,
    sid: sessionId,
    iss: 'compete',
    aud: 'compete-web',
    iat: now,
    exp: now + 8 * 60 * 60,
  })
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${sign(unsigned)}`
}

function verifyToken(token: string) {
  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) throw new Error('Malformed token')
  const expected = Buffer.from(sign(`${header}.${payload}`))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid signature')
  }
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub?: string
    sid?: string
    iss?: string
    aud?: string
    exp?: number
  }
  if (
    !claims.sub ||
    !claims.sid ||
    claims.iss !== 'compete' ||
    claims.aud !== 'compete-web' ||
    !claims.exp ||
    claims.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error('Invalid claims')
  }
  return claims
}

export async function createSession(userId: string) {
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const token = issueToken(userId, sessionId)

  await execute(
    `INSERT compete.Sessions (SessionId, UserId, TokenHash, ExpiresAt)
     VALUES (@sessionId, @userId, @tokenHash, @expiresAt)`,
    { sessionId, userId, tokenHash: hashValue(token), expiresAt },
  )
  return { token, expiresAt }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const value = request.headers.get('authorization')
  if (!value?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication is required.', 'authentication_required')
  }

  const token = value.slice(7)
  try {
    const claims = verifyToken(token)
    const sessionId = claims.sid as string
    const userId = claims.sub as string
    const users = await query<UserRow>(
      `SELECT
         u.UserId AS userId, u.Email AS email, u.FirstName AS firstName,
         u.LastName AS lastName, s.SessionId AS sessionId, s.ExpiresAt AS expiresAt
       FROM compete.Sessions s
       JOIN compete.Users u ON u.UserId = s.UserId
       WHERE s.SessionId = @sessionId AND s.UserId = @userId
         AND s.TokenHash = @tokenHash AND s.RevokedAt IS NULL
         AND s.ExpiresAt > SYSUTCDATETIME() AND u.IsActive = 1`,
      { sessionId, userId, tokenHash: hashValue(token) },
    )
    if (!users[0]) throw new Error('Session not found')

    const roles = await query<{ roleName: string }>(
      `SELECT RoleName AS roleName FROM compete.UserRoles WHERE UserId = @userId`,
      { userId },
    )
    return { ...users[0], roles: roles.map((role) => role.roleName) }
  } catch {
    throw new ApiError(401, 'The session is invalid or has expired.', 'invalid_session')
  }
}

export function requireRole(user: AuthUser, ...roles: string[]) {
  if (!roles.some((role) => user.roles.includes(role)) && !user.roles.includes('admin')) {
    throw new ApiError(403, 'You do not have permission to perform this action.', 'forbidden')
  }
}
