import { apiRequest } from '@/lib/api'
import type { UserSettings, Reminder } from '@/types/settings'

export async function getUserSettings(_userId: string): Promise<UserSettings | null> {
  return apiRequest<UserSettings | null>('/settings')
}

export async function updateUserSettings(
  _userId: string,
  updates: Partial<Pick<UserSettings, 'language' | 'theme' | 'accent_color' | 'currency'>>
): Promise<UserSettings> {
  return apiRequest<UserSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function getReminder(_userId: string): Promise<Reminder | null> {
  return apiRequest<Reminder | null>('/settings/reminder')
}

export async function updateReminder(
  _userId: string,
  updates: { enabled: boolean; time?: string | null }
): Promise<Reminder> {
  return apiRequest<Reminder>('/settings/reminder', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}
