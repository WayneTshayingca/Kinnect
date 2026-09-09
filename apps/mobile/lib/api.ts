import { getSession } from '@kinnect/core'

// Some operations can't run from the client at all: dependents and observers
// have no auth_user_id, so RLS blocks a direct insert. Those go through the
// web app's service-role /api/* routes, which authenticate the caller with
// their Supabase bearer token and then use the service role server-side.
//
// See apps/web/app/api/members/route.ts for the contract.
const API_URL = process.env.EXPO_PUBLIC_API_URL

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Calls a web-app API route with the current user's bearer token attached.
 * Throws ApiError with the server's message on a non-2xx response.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set — cannot reach the Kinnect server',
      0
    )
  }

  const session = await getSession()
  const token = session?.access_token
  if (!token) throw new ApiError('You are not signed in', 401)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0)
  }

  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : {}

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return data as T
}
