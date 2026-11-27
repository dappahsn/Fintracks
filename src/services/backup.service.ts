import { apiRequest } from '@/lib/api'
import type { BackupData, BackupPreview } from '@/types/backup'
import { validateBackupJson } from '@/utils/validation'

/**
 * Create a JSON backup of all user data and trigger download.
 * Excludes any authentication tokens or secrets.
 */
export async function createBackup(_userId: string): Promise<void> {
  const backup = await apiRequest<BackupData>('/backup')

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  link.href = url
  link.download = `fintracks-backup-${dateStr}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Validate and preview a backup file before restoring.
 */
export function previewBackup(json: unknown): { preview: BackupPreview | null; error?: string } {
  const { valid, error } = validateBackupJson(json)
  if (!valid) return { preview: null, error }

  const data = json as BackupData
  return {
    preview: {
      accountCount: data.accounts.length,
      transactionCount: data.transactions.length,
      categoryCount: data.categories.length,
      createdAt: data.metadata.created_at,
      version: data.metadata.version,
    },
  }
}

/**
 * Restore data from a backup. Uses current authenticated user on the server.
 */
export async function restoreBackup(_userId: string, json: BackupData): Promise<void> {
  await apiRequest<{ ok: boolean }>('/backup/restore', {
    method: 'POST',
    body: JSON.stringify(json),
  })
}

/**
 * Delete all financial data for the current user.
 */
export async function deleteAllData(_userId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/backup/all-data', {
    method: 'DELETE',
  })
}
