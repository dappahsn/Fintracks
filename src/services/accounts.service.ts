import { ApiError, apiRequest } from '@/lib/api'
import type { Account } from '@/types/account'

export interface AccountWithCurrentBalance extends Account {
  current_balance: number
}

/**
 * Get all accounts for the current user.
 */
export async function getAccounts(_userId?: string): Promise<Account[]> {
  return apiRequest<AccountWithCurrentBalance[]>('/accounts')
}

/**
 * Get single account with computed balance & monthly stats.
 */
export async function getAccountById(accountId: string, _userId?: string) {
  try {
    return await apiRequest<{
      account: Account
      currentBalance: number
      monthlyIncome: number
      monthlyExpense: number
    }>(`/accounts/${encodeURIComponent(accountId)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * Compute the current balance for a single account.
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const detail = await getAccountById(accountId)
  if (!detail) throw new Error('Account not found')
  return detail.currentBalance
}

/**
 * Get account balances for all accounts in a batch.
 */
export async function getAccountsWithBalances(_userId?: string): Promise<AccountWithCurrentBalance[]> {
  return apiRequest<AccountWithCurrentBalance[]>('/accounts')
}

/**
 * Create a new account.
 */
export async function createAccount(
  _userId: string,
  data: { name: string; type: string; icon?: string | null; initial_balance: number }
): Promise<Account> {
  return apiRequest<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Update an account (name, type, icon only — balance is derived).
 */
export async function updateAccount(
  accountId: string,
  data: { name?: string; type?: string; icon?: string | null }
): Promise<Account> {
  return apiRequest<Account>(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Delete an account (only if no transactions exist).
 */
export async function deleteAccount(accountId: string): Promise<void> {
  await apiRequest<void>(`/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}
