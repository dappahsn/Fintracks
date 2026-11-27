import crypto from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

function formatCategory(row) {
  return {
    ...row,
    is_default: Boolean(row.is_default),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type) : null
    const values = [req.user.id]
    let sql = `
      SELECT id, user_id, name, type, icon, is_default, created_at
      FROM categories
      WHERE user_id = ?
    `
    if (type) {
      if (!['income', 'expense'].includes(type)) {
        throw new HttpError(400, 'Tipe kategori tidak valid')
      }
      sql += ' AND type = ?'
      values.push(type)
    }
    sql += ' ORDER BY is_default DESC, name ASC'

    const [rows] = await pool.query(sql, values)
    res.json(rows.map(formatCategory))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const type = String(req.body?.type || '').trim()
    const icon = req.body?.icon ?? null

    if (!name) throw new HttpError(400, 'Nama kategori wajib diisi')
    if (!['income', 'expense'].includes(type)) throw new HttpError(400, 'Tipe kategori tidak valid')

    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO categories (id, user_id, name, type, icon, is_default)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, req.user.id, name, type, icon]
    )

    const [rows] = await pool.query(
      `SELECT id, user_id, name, type, icon, is_default, created_at
       FROM categories WHERE id = ?`,
      [id]
    )
    res.status(201).json(formatCategory(rows[0]))
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
      if (!name) throw new HttpError(400, 'Nama kategori wajib diisi')
      updates.push('name = ?')
      values.push(name)
    }
    if (req.body?.type !== undefined) {
      const type = String(req.body.type).trim()
      if (!['income', 'expense'].includes(type)) throw new HttpError(400, 'Tipe kategori tidak valid')
      updates.push('type = ?')
      values.push(type)
    }
    if (req.body?.icon !== undefined) {
      updates.push('icon = ?')
      values.push(req.body.icon)
    }

    if (updates.length === 0) throw new HttpError(400, 'Tidak ada data yang diperbarui')

    values.push(req.params.id, req.user.id)
    const [result] = await pool.query(
      `UPDATE categories
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ?`,
      values
    )

    if (result.affectedRows === 0) throw new HttpError(404, 'Category not found')

    const [rows] = await pool.query(
      `SELECT id, user_id, name, type, icon, is_default, created_at
       FROM categories WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    )
    res.json(formatCategory(rows[0]))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) throw new HttpError(404, 'Category not found')
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
