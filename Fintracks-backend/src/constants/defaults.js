import crypto from 'node:crypto'

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Makanan', icon: '🍔' },
  { name: 'Transportasi', icon: '🚗' },
  { name: 'Belanja', icon: '🛍️' },
  { name: 'Tagihan', icon: '📄' },
  { name: 'Hiburan', icon: '🎬' },
  { name: 'Kesehatan', icon: '🏥' },
  { name: 'Pendidikan', icon: '📚' },
  { name: 'Lainnya', icon: '📦' },
]

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Gaji', icon: '💰' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Bonus', icon: '🎁' },
  { name: 'Hadiah', icon: '🎀' },
  { name: 'Investasi', icon: '📈' },
  { name: 'Lainnya', icon: '📦' },
]

/**
 * Ensure default user_settings, reminders, and categories exist for a user.
 */
export async function seedUserDefaults(conn, userId) {
  await conn.query(
    `INSERT IGNORE INTO user_settings (id, user_id, language, theme, accent_color, currency)
     VALUES (?, ?, 'id', 'light', 'blue', 'IDR')`,
    [crypto.randomUUID(), userId]
  )

  await conn.query(
    `INSERT IGNORE INTO reminders (id, user_id, enabled, time)
     VALUES (?, ?, 0, NULL)`,
    [crypto.randomUUID(), userId]
  )

  const [existingCats] = await conn.query(
    `SELECT id FROM categories WHERE user_id = ? LIMIT 1`,
    [userId]
  )

  if (existingCats.length === 0) {
    const categories = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense' })),
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income' })),
    ]

    for (const cat of categories) {
      await conn.query(
        `INSERT INTO categories (id, user_id, name, type, icon, is_default)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [crypto.randomUUID(), userId, cat.name, cat.type, cat.icon]
      )
    }
  }
}
