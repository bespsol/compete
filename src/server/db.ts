import sql from 'mssql'
import { getConfig } from './config'

export type SqlValues = Record<string, unknown>

let poolPromise: Promise<InstanceType<typeof sql.ConnectionPool>> | undefined

function getPool() {
  if (!poolPromise) {
    const config = getConfig()
    poolPromise = new sql.ConnectionPool({
      ...config.sql,
      options: {
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
      },
      pool: { min: 0, max: 10, idleTimeoutMillis: 30_000 },
    }).connect()
  }
  return poolPromise
}

export async function query<T>(
  statement: string,
  values: SqlValues = {},
): Promise<T[]> {
  const pool = await getPool()
  const request = pool.request()
  for (const [name, value] of Object.entries(values)) {
    request.input(name, value as never)
  }
  const result = await request.query<T>(statement)
  return result.recordset
}

export async function execute(
  statement: string,
  values: SqlValues = {},
): Promise<number> {
  const pool = await getPool()
  const request = pool.request()
  for (const [name, value] of Object.entries(values)) {
    request.input(name, value as never)
  }
  const result = await request.query(statement)
  return result.rowsAffected.reduce((total, value) => total + value, 0)
}
