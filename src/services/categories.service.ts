import { apiRequest } from '@/lib/api'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category'

export async function getCategories(
  _userId: string,
  type?: 'income' | 'expense'
): Promise<Category[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiRequest<Category[]>(`/categories${qs}`)
}

export async function createCategory(
  _userId: string,
  data: CreateCategoryInput
): Promise<Category> {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<Category> {
  return apiRequest<Category>(`/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest<void>(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
