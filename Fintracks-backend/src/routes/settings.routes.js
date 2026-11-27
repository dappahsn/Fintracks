import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()
router.use(requireAuth)

function formatReminder(row) {
  if (!row) return null
  return {
    ...row,
    enabled: Boolean(row.enabled),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [req.user.id]
    )
    res.json(rows[0] ?? null)
  } catch (err) {
    next(err)
  }
})

router.patch('/', async (req, res, next) => {
  try {
    const updates = []
    const values = []

    if (req.body?.language !== undefined) {
      if (!['id', 'en'].includes(req.body.language)) throw new HttpError(400, 'Bahasa tidak valid')
      updates.push('language = ?')
      values.push(req.body.language)
    }
    if (req.body?.theme !== undefined) {
      if (!['system', 'light', 'dark'].includes(req.body.theme)) throw new HttpError(400, 'Tema tidak valid')
      updates.push('theme = ?')
      values.push(req.body.theme)
    }
    if (req.body?.accent_color !== undefined) {
      if (!['blue', 'green', 'purple', 'orange', 'red'].includes(req.body.accent_color)) {
        throw new HttpError(400, 'Warna aksen tidak valid')
      }
      updates.push('accent_color = ?')
      values.push(req.body.accent_color)
    }
    if (req.body?.currency !== undefined) {
      updates.push('currency = ?')
      values.push(String(req.body.currency))
    }

    if (updates.length === 0) throw new HttpError(400, 'Tidak ada pengaturan yang diperbarui')

    updates.push('updated_at = NOW(3)')
    values.push(req.user.id)

    const [result] = await pool.query(
      `UPDATE user_settings
       SET ${updates.join(', ')}
       WHERE user_id = ?`,
      values
    )

    if (result.affectedRows === 0) throw new HttpError(404, 'Settings not found')

    const [rows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

router.get('/reminder', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM reminders WHERE user_id = ?',
      [req.user.id]
    )
    res.json(formatReminder(rows[0] ?? null))
  } catch (err) {
    next(err)
  }
})

router.patch('/reminder', async (req, res, next) => {
  try {
    const enabled = req.body?.enabled ? 1 : 0
    const time = req.body?.time ?? null

    const [result] = await pool.query(
      `UPDATE reminders
       SET enabled = ?, time = COALESCE(?, time), updated_at = NOW(3)
       WHERE user_id = ?`,
      [enabled, time, req.user.id]
    )

    if (result.affectedRows === 0) throw new HttpError(404, 'Reminder not found')

    const [rows] = await pool.query(
      'SELECT * FROM reminders WHERE user_id = ?',
      [req.user.id]
    )
    res.json(formatReminder(rows[0]))
  } catch (err) {
    next(err)
  }
})

export default router
