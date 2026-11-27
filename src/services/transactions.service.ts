import { ApiError, apiRequest } from '@/lib/api'
import type { Transaction, CreateTransactionInput, TransactionFilter } from '@/types/transaction'
import { TRANSACTIONS_PER_PAGE } from '@/lib/constants'

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Get paginated transactions for a user, filtered by date range.
 */
export async function getTransactions(
  _userId: string,
  filter: TransactionFilter,
  page: number = 0
): Promise<{ data: Transaction[]; hasMore: boolean }> {
  const qs = buildQuery({
    startDate: filter.startDate,
    endDate: filter.endDate,
    accountId: filter.accountId,
    page,
    limit: TRANSACTIONS_PER_PAGE,
  })
  return apiRequest<{ data: Transaction[]; hasMore: boolean }>(`/transactions${qs}`)
}

/**
 * Get all transactions in a date range (for export/recap — no pagination).
 */
export async function getAllTransactionsInRange(
  _userId: string,
  filter: TransactionFilter
): Promise<Transaction[]> {
  const qs = buildQuery({
    startDate: filter.startDate,
    endDate: filter.endDate,
    accountId: filter.accountId,
  })
  return apiRequest<Transaction[]>(`/transactions/export${qs}`)
}

/**
 * Get transactions for a specific account.
 */
export async function getAccountTransactions(
  accountId: string,
  page: number = 0
): Promise<{ data: Transaction[]; hasMore: boolean }> {
  const qs = buildQuery({
    accountId,
    page,
    limit: TRANSACTIONS_PER_PAGE,
  })
  return apiRequest<{ data: Transaction[]; hasMore: boolean }>(`/transactions${qs}`)
}

/**
 * Get a single transaction by ID.
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    return await apiRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * Create a new transaction.
 */
export async function createTransaction(
  _userId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  return apiRequest<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * Update an existing transaction.
 */
export async function updateTransaction(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/**
 * Delete a transaction.
 */
export async function deleteTransaction(id: string): Promise<void> {
  await apiRequest<void>(`/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
