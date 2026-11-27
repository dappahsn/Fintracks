import { apiRequest } from '@/lib/api'

export interface AuthUser {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  created_at?: string
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  })
}

export async function registerWithPassword(
  fullName: string,
  email: string,
  password: string
): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: fullName, email, password }),
    skipAuthRedirect: true,
  })
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>('/auth/me')
  return res.user
}

/**
 * Ensure user default settings, reminders, and categories exist.
 */
export async function ensureUserProfile(_user?: AuthUser): Promise<void> {
  await apiRequest<{ ok: boolean }>('/auth/ensure-defaults', {
    method: 'POST',
  })
}
