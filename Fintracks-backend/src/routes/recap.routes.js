import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query
    const conditions = [`user_id = ?`, `type IN ('income', 'expense')`]
    const values = [req.user.id]

    if (startDate) {
      conditions.push('transaction_date >= ?')
      values.push(String(startDate))
    }
    if (endDate) {
      conditions.push('transaction_date <= ?')
      values.push(String(endDate))
    }

    const [rows] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE ${conditions.join(' AND ')}`,
      values
    )

    const income = Number(rows[0]?.income ?? 0)
    const expense = Number(rows[0]?.expense ?? 0)
    res.json({ income, expense, difference: income - expense })
  } catch (err) {
    next(err)
  }
})

router.get('/breakdown', async (req, res, next) => {
  try {
    const type = String(req.query.type || '')
    const { startDate, endDate } = req.query

    if (!['income', 'expense'].includes(type)) {
      throw new HttpError(400, 'Tipe rekap tidak valid')
    }

    const conditions = ['t.user_id = ?', 't.type = ?', 't.category_id IS NOT NULL']
    const values = [req.user.id, type]

    if (startDate) {
      conditions.push('t.transaction_date >= ?')
      values.push(String(startDate))
    }
    if (endDate) {
      conditions.push('t.transaction_date <= ?')
      values.push(String(endDate))
    }

    const [rows] = await pool.query(
      `SELECT
        c.id AS categoryId,
        COALESCE(c.name, 'Lainnya') AS categoryName,
        c.icon AS categoryIcon,
        SUM(t.amount) AS amount
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY c.id, c.name, c.icon
       ORDER BY amount DESC`,
      values
    )

    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0)
    const result = rows.map((r) => {
      const amount = Number(r.amount)
      return {
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        categoryIcon: r.categoryIcon,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
