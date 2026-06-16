declare module 'mssql' {
  type SqlConfig = Record<string, unknown>

  class Request {
    input(name: string, value: unknown): Request
    query<T = Record<string, unknown>>(
      statement: string,
    ): Promise<{ recordset: T[]; rowsAffected: number[] }>
  }

  class ConnectionPool {
    constructor(config: SqlConfig)
    connect(): Promise<ConnectionPool>
    request(): Request
  }

  const sql: {
    ConnectionPool: typeof ConnectionPool
  }

  export default sql
}
