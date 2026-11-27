import crypto from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

const TRANSACTION_SELECT = `
  SELECT
    t.id, t.user_id, t.type, t.account_id, t.destination_account_id, t.category_id,
    t.amount, t.transaction_date, t.notes, t.created_at, t.updated_at,
    a.name AS account_name, a.type AS account_type, a.icon AS account_icon,
    da.name AS dest_account_name, da.type AS dest_account_type,
    c.name AS category_name, c.icon AS category_icon
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  LEFT JOIN accounts da ON da.id = t.destination_account_id
  LEFT JOIN categories c ON c.id = t.category_id
`

function formatTransaction(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    account_id: row.account_id,
    destination_account_id: row.destination_account_id,
    category_id: row.category_id,
    amount: Number(row.amount),
    transaction_date: row.transaction_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    accounts: row.account_name
      ? { name: row.account_name, type: row.account_type, icon: row.account_icon }
      : null,
    destination_accounts: row.dest_account_name
      ? { name: row.dest_account_name, type: row.dest_account_type }
      : null,
    categories: row.category_name
      ? { name: row.category_name, icon: row.category_icon }
      : null,
  }
}

async function getFormattedTransactionById(id, userId) {
  const [rows] = await pool.query(
    `${TRANSACTION_SELECT}
     WHERE t.id = ? AND t.user_id = ?`,
    [id, userId]
  )
  return rows[0] ? formatTransaction(rows[0]) : null
}

async function validateOwnership(userId, { account_id, destination_account_id, category_id }) {
  if (account_id) {
    const [rows] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [account_id, userId]
    )
    if (!rows[0]) throw new HttpError(400, 'Rekening tidak ditemukan')
  }
  if (destination_account_id) {
    const [rows] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [destination_account_id, userId]
    )
    if (!rows[0]) throw new HttpError(400, 'Rekening tujuan tidak ditemukan')
  }
  if (category_id) {
    const [rows] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [category_id, userId]
    )
    if (!rows[0]) throw new HttpError(400, 'Kategori tidak ditemukan')
  }
}

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { startDate, endDate, accountId } = req.query
    const page = Math.max(0, Number.parseInt(String(req.query.page ?? '0'), 10) || 0)
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20))

    const conditions = ['t.user_id = ?']
    const values = [userId]

    if (startDate) {
      conditions.push('t.transaction_date >= ?')
      values.push(String(startDate))
    }
    if (endDate) {
      conditions.push('t.transaction_date <= ?')
      values.push(String(endDate))
    }
    if (accountId) {
      conditions.push('(t.account_id = ? OR t.destination_account_id = ?)')
      values.push(String(accountId), String(accountId))
    }

    const offset = page * limit
    values.push(limit + 1, offset)

    const [rows] = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      values
    )

    const hasMore = rows.length > limit
    const sliced = hasMore ? rows.slice(0, limit) : rows
    res.json({
      data: sliced.map(formatTransaction),
      hasMore,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/export', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { startDate, endDate, accountId } = req.query

    const conditions = ['t.user_id = ?']
    const values = [userId]

    if (startDate) {
      conditions.push('t.transaction_date >= ?')
      values.push(String(startDate))
    }
    if (endDate) {
      conditions.push('t.transaction_date <= ?')
      values.push(String(endDate))
    }
    if (accountId) {
      conditions.push('(t.account_id = ? OR t.destination_account_id = ?)')
      values.push(String(accountId), String(accountId))
    }

    const [rows] = await pool.query(
      `${TRANSACTION_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      values
    )

    res.json(rows.map(formatTransaction))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const tx = await getFormattedTransactionById(req.params.id, req.user.id)
    if (!tx) return res.status(404).json({ error: 'Transaction not found' })
    res.json(tx)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const {
      type,
      account_id,
      destination_account_id = null,
      category_id = null,
      amount,
      transaction_date,
      notes = null,
    } = req.body ?? {}

    if (!['income', 'expense', 'transfer'].includes(type)) {
      throw new HttpError(400, 'Tipe transaksi tidak valid')
    }
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new HttpError(400, 'Jumlah transaksi harus lebih dari 0')
    }
    if (!account_id) throw new HttpError(400, 'Rekening wajib dipilih')
    if (type === 'transfer' && (!destination_account_id || destination_account_id === account_id)) {
      throw new HttpError(400, 'Rekening tujuan transfer tidak valid')
    }

    await validateOwnership(userId, { account_id, destination_account_id, category_id })

    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO transactions
        (id, user_id, type, account_id, destination_account_id, category_id, amount, transaction_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        type,
        account_id,
        type === 'transfer' ? destination_account_id : null,
        type === 'transfer' ? null : (category_id || null),
        Math.trunc(numericAmount),
        transaction_date || new Date().toISOString().split('T')[0],
        notes || null,
      ]
    )

    const created = await getFormattedTransactionById(id, userId)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id
    const existing = await getFormattedTransactionById(req.params.id, userId)
    if (!existing) throw new HttpError(404, 'Transaction not found')

    const nextType = req.body?.type ?? existing.type
    const nextAccountId = req.body?.account_id ?? existing.account_id
    const nextDestId =
      nextType === 'transfer'
        ? (req.body?.destination_account_id !== undefined
            ? req.body.destination_account_id
            : existing.destination_account_id)
        : null
    const nextCatId =
      nextType === 'transfer'
        ? null
        : (req.body?.category_id !== undefined ? req.body.category_id : existing.category_id)
    const nextAmount =
      req.body?.amount !== undefined ? Math.trunc(Number(req.body.amount)) : existing.amount
    const nextDate = req.body?.transaction_date ?? existing.transaction_date
    const nextNotes = req.body?.notes !== undefined ? req.body.notes : existing.notes

    if (!['income', 'expense', 'transfer'].includes(nextType)) {
      throw new HttpError(400, 'Tipe transaksi tidak valid')
    }
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new HttpError(400, 'Jumlah transaksi harus lebih dari 0')
    }

    await validateOwnership(userId, {
      account_id: nextAccountId,
      destination_account_id: nextDestId,
      category_id: nextCatId,
    })

    await pool.query(
      `UPDATE transactions
       SET type = ?,
           account_id = ?,
           destination_account_id = ?,
           category_id = ?,
           amount = ?,
           transaction_date = ?,
           notes = ?,
           updated_at = NOW(3)
       WHERE id = ? AND user_id = ?`,
      [nextType, nextAccountId, nextDestId, nextCatId || null, nextAmount, nextDate, nextNotes || null, req.params.id, userId]
    )

    const updated = await getFormattedTransactionById(req.params.id, userId)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) throw new HttpError(404, 'Transaction not found')
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
