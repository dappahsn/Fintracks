const TOKEN_STORAGE_KEY = 'fintracks_auth_token'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '')

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const { skipAuthRedirect, headers, ...rest } = options
  const token = getAuthToken()

  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Content-Type') && rest.body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let payload: { error?: string; code?: string } | unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { error: text }
    }
  }

  if (!response.ok) {
    const errPayload = (payload ?? {}) as { error?: string; code?: string }
    if (response.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
      setAuthToken(null)
      window.dispatchEvent(new CustomEvent('fintracks:unauthorized'))
    }
    throw new ApiError(
      response.status,
      errPayload.error || `Request failed (${response.status})`,
      errPayload.code
    )
  }

  return payload as T
}
