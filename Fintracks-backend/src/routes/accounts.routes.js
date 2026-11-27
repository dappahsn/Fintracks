import crypto from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const [rows] = await pool.query(
      `SELECT
        a.id, a.user_id, a.name, a.type, a.icon, a.initial_balance, a.created_at, a.updated_at,
        (
          a.initial_balance
          + COALESCE((
            SELECT SUM(CASE
              WHEN t.account_id = a.id AND t.type = 'income' THEN t.amount
              WHEN t.account_id = a.id AND t.type IN ('expense', 'transfer') THEN -t.amount
              WHEN t.destination_account_id = a.id AND t.type = 'transfer' THEN t.amount
              ELSE 0
            END)
            FROM transactions t
            WHERE t.user_id = ? AND (t.account_id = a.id OR t.destination_account_id = a.id)
          ), 0)
        ) AS current_balance
       FROM accounts a
       WHERE a.user_id = ?
       ORDER BY a.created_at ASC`,
      [userId, userId]
    )
    res.json(
      rows.map((r) => ({
        ...r,
        initial_balance: Number(r.initial_balance),
        current_balance: Number(r.current_balance),
      }))
    )
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const [accountRows] = await pool.query(
      `SELECT id, user_id, name, type, icon, initial_balance, created_at, updated_at
       FROM accounts
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    const account = accountRows[0]
    if (!account) return res.status(404).json({ error: 'Account not found' })

    const [balanceRows] = await pool.query(
      `SELECT COALESCE(SUM(CASE
        WHEN account_id = ? AND type = 'income' THEN amount
        WHEN account_id = ? AND type IN ('expense', 'transfer') THEN -amount
        WHEN destination_account_id = ? AND type = 'transfer' THEN amount
        ELSE 0
      END), 0) AS net_change
      FROM transactions
      WHERE user_id = ? AND (account_id = ? OR destination_account_id = ?)`,
      [id, id, id, userId, id, id]
    )

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0)
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    const [statsRows] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS monthly_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS monthly_expense
       FROM transactions
       WHERE user_id = ?
         AND account_id = ?
         AND type IN ('income', 'expense')
         AND transaction_date >= ?
         AND transaction_date <= ?`,
      [userId, id, startDate, endStr]
    )

    const initialBalance = Number(account.initial_balance)
    const currentBalance = initialBalance + Number(balanceRows[0]?.net_change ?? 0)

    res.json({
      account: { ...account, initial_balance: initialBalance },
      currentBalance,
      monthlyIncome: Number(statsRows[0]?.monthly_income ?? 0),
      monthlyExpense: Number(statsRows[0]?.monthly_expense ?? 0),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const type = String(req.body?.type || '').trim()
    const icon = req.body?.icon ?? null
    const initialBalance = Number(req.body?.initial_balance ?? 0)

    if (!name) throw new HttpError(400, 'Nama rekening wajib diisi')
    if (!['bank', 'cash', 'ewallet', 'other'].includes(type)) {
      throw new HttpError(400, 'Jenis rekening tidak valid')
    }
    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      throw new HttpError(400, 'Saldo awal tidak valid')
    }

    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO accounts (id, user_id, name, type, icon, initial_balance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, type, icon, Math.trunc(initialBalance)]
    )

    const [rows] = await pool.query(
      `SELECT id, user_id, name, type, icon, initial_balance, created_at, updated_at
       FROM accounts WHERE id = ?`,
      [id]
    )
    res.status(201).json({ ...rows[0], initial_balance: Number(rows[0].initial_balance) })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const updates = []
    const values = []

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) throw new HttpError(400, 'Nama rekening wajib diisi')
      updates.push('name = ?')
      values.push(name)
    }
    if (req.body?.type !== undefined) {
      const type = String(req.body.type).trim()
      if (!['bank', 'cash', 'ewallet', 'other'].includes(type)) {
        throw new HttpError(400, 'Jenis rekening tidak valid')
      }
      updates.push('type = ?')
      values.push(type)
    }
    if (req.body?.icon !== undefined) {
      updates.push('icon = ?')
      values.push(req.body.icon)
    }

    if (updates.length === 0) {
      throw new HttpError(400, 'Tidak ada data yang diperbarui')
    }

    updates.push('updated_at = NOW(3)')
    values.push(req.params.id, req.user.id)

    const [result] = await pool.query(
      `UPDATE accounts
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ?`,
      values
    )

    if (result.affectedRows === 0) throw new HttpError(404, 'Account not found')

    const [rows] = await pool.query(
      `SELECT id, user_id, name, type, icon, initial_balance, created_at, updated_at
       FROM accounts WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    )
    res.json({ ...rows[0], initial_balance: Number(rows[0].initial_balance) })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const [existing] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    )
    if (!existing[0]) throw new HttpError(404, 'Account not found')

    const [txRows] = await pool.query(
      `SELECT 1 FROM transactions
       WHERE user_id = ? AND (account_id = ? OR destination_account_id = ?)
       LIMIT 1`,
      [userId, id, id]
    )
    if (txRows.length > 0) {
      throw new HttpError(409, 'ACCOUNT_HAS_TRANSACTIONS', 'ACCOUNT_HAS_TRANSACTIONS')
    }

    await pool.query('DELETE FROM accounts WHERE id = ? AND user_id = ?', [id, userId])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
