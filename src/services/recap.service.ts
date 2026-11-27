import { apiRequest } from '@/lib/api'
import type { TransactionFilter } from '@/types/transaction'

export interface RecapSummary {
  income: number
  expense: number
  difference: number
}

export interface CategoryBreakdownItem {
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  amount: number
  percentage: number
}

/**
 * Get recap summary: total income, total expense, and difference.
 * Transfer is EXCLUDED from both income and expense.
 */
export async function getRecapSummary(
  _userId: string,
  filter: TransactionFilter
): Promise<RecapSummary> {
  const qs = new URLSearchParams({
    startDate: filter.startDate,
    endDate: filter.endDate,
  })
  return apiRequest<RecapSummary>(`/recap/summary?${qs.toString()}`)
}

/**
 * Get category breakdown for a given type (income or expense).
 * Returns sorted by amount descending with percentage.
 */
export async function getCategoryBreakdown(
  _userId: string,
  type: 'income' | 'expense',
  filter: TransactionFilter
): Promise<CategoryBreakdownItem[]> {
  const qs = new URLSearchParams({
    type,
    startDate: filter.startDate,
    endDate: filter.endDate,
  })
  return apiRequest<CategoryBreakdownItem[]>(`/recap/breakdown?${qs.toString()}`)
}
