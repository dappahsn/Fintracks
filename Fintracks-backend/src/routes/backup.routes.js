import crypto from 'node:crypto'
import { Router } from 'express'
import { pool, withTransaction } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { seedUserDefaults } from '../constants/defaults.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const [[accounts], [transactions], [categories], [settings], [reminders]] = await Promise.all([
      pool.query(
        'SELECT id, name, type, icon, initial_balance, created_at, updated_at FROM accounts WHERE user_id = ?',
        [userId]
      ),
      pool.query(
        'SELECT id, type, account_id, destination_account_id, category_id, amount, transaction_date, notes, created_at, updated_at FROM transactions WHERE user_id = ?',
        [userId]
      ),
      pool.query(
        'SELECT id, name, type, icon, is_default, created_at FROM categories WHERE user_id = ?',
        [userId]
      ),
      pool.query(
        'SELECT language, theme, accent_color, currency, created_at, updated_at FROM user_settings WHERE user_id = ?',
        [userId]
      ),
      pool.query(
        'SELECT enabled, time, created_at, updated_at FROM reminders WHERE user_id = ?',
        [userId]
      ),
    ])

    res.json({
      metadata: {
        version: 1,
        created_at: new Date().toISOString(),
        app: 'fintracks-app',
      },
      accounts: accounts.map((a) => ({ ...a, initial_balance: Number(a.initial_balance) })),
      transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
      categories: categories.map((c) => ({ ...c, is_default: Boolean(c.is_default) })),
      settings: settings[0] ?? null,
      reminders: reminders[0] ? { ...reminders[0], enabled: Boolean(reminders[0].enabled) } : null,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/restore', async (req, res, next) => {
  try {
    const userId = req.user.id
    const data = req.body

    if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.transactions) || !Array.isArray(data.categories)) {
      throw new HttpError(400, 'Format backup tidak valid')
    }

    await withTransaction(async (conn) => {
      const accountIdMap = new Map()
      const categoryIdMap = new Map()

      for (const cat of data.categories) {
        const newCatId = crypto.randomUUID()
        await conn.query(
          `INSERT INTO categories (id, user_id, name, type, icon, is_default)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newCatId, userId, cat.name, cat.type, cat.icon ?? null, cat.is_default ? 1 : 0]
        )
        categoryIdMap.set(cat.id, newCatId)
      }

      for (const acc of data.accounts) {
        const newAccId = crypto.randomUUID()
        await conn.query(
          `INSERT INTO accounts (id, user_id, name, type, icon, initial_balance)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newAccId, userId, acc.name, acc.type, acc.icon ?? null, Math.trunc(Number(acc.initial_balance ?? 0))]
        )
        accountIdMap.set(acc.id, newAccId)
      }

      for (const t of data.transactions) {
        const accountId = accountIdMap.get(t.account_id) ?? t.account_id
        const destId = t.destination_account_id
          ? (accountIdMap.get(t.destination_account_id) ?? t.destination_account_id)
          : null
        const catId = t.category_id
          ? (categoryIdMap.get(t.category_id) ?? t.category_id)
          : null

        await conn.query(
          `INSERT INTO transactions
            (id, user_id, type, account_id, destination_account_id, category_id, amount, transaction_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            userId,
            t.type,
            accountId,
            destId,
            catId,
            Math.trunc(Number(t.amount)),
            t.transaction_date,
            t.notes ?? null,
          ]
        )
      }
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.delete('/all-data', async (req, res, next) => {
  try {
    const userId = req.user.id
    await withTransaction(async (conn) => {
      await conn.query('DELETE FROM transactions WHERE user_id = ?', [userId])
      await conn.query('DELETE FROM accounts WHERE user_id = ?', [userId])
      await conn.query('DELETE FROM categories WHERE user_id = ?', [userId])
      await seedUserDefaults(conn, userId)
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
