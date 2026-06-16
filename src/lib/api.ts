const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const TOKEN_KEY = 'compete.session'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export function getSessionToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setSessionToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearSessionToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  if (options.auth !== false) {
    const token = getSessionToken()
    if (token) headers.set('authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiClientError('The server returned an unexpected response.', response.status, 'unexpected_response')
    }
    return (await response.blob()) as T
  }

  const data = await response.json()
  if (!response.ok) {
    throw new ApiClientError(
      data.error?.message ?? 'The request failed.',
      response.status,
      data.error?.code ?? 'request_failed',
      data.error?.details,
    )
  }
  return data as T
}

export function formatDate(value: string, includeTime = true) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
