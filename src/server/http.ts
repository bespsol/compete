import { ZodError, type ZodType } from 'zod'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'request_failed',
    public details?: unknown,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

export async function parseBody<T>(request: Request, schema: ZodType<T>) {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    throw new ApiError(400, 'A JSON request body is required.', 'invalid_json')
  }

  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ApiError(
      422,
      'The request did not pass validation.',
      'validation_failed',
      result.error.flatten(),
    )
  }
  return result.data
}

export function errorResponse(error: unknown, correlationId: string) {
  if (error instanceof ApiError) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          correlationId,
        },
      },
      error.status,
    )
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: 'validation_failed',
          message: 'The request did not pass validation.',
          details: error.flatten(),
          correlationId,
        },
      },
      422,
    )
  }

  return json(
    {
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred.',
        correlationId,
      },
    },
    500,
  )
}

export function pathParts(request: Request) {
  let path = new URL(request.url).pathname
  path = path.replace(/^\/\.netlify\/functions\/api/, '')
  path = path.replace(/^\/api/, '')
  return path.split('/').filter(Boolean)
}
