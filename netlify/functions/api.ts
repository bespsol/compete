import type { Config } from '@netlify/functions'
import { handleApiRequest } from '../../src/server/api'

export default async (request: Request) => handleApiRequest(request)

export const config: Config = {
  path: '/api/*',
}
