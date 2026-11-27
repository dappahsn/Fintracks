import crypto from 'node:crypto'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, withTransaction } from '../db/pool.js'
import { env } from '../config/env.js'
import { seedUserDefaults } from '../constants/defaults.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

const router = Router()

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

function sanitizeUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const fullName = String(req.body?.full_name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!fullName) throw new HttpError(400, 'Nama lengkap wajib diisi')
    if (!email || !email.includes('@')) throw new HttpError(400, 'Email tidak valid')
    if (password.length < 6) throw new HttpError(400, 'Password minimal 6 karakter')

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = crypto.randomUUID()

    const user = await withTransaction(async (conn) => {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email])
      if (existing.length > 0) {
        throw new HttpError(409, 'Email sudah terdaftar', 'EMAIL_EXISTS')
      }

      await conn.query(
        `INSERT INTO users (id, full_name, email, password_hash)
         VALUES (?, ?, ?, ?)`,
        [userId, fullName, email, passwordHash]
      )
      await seedUserDefaults(conn, userId)

      const [rows] = await conn.query(
        `SELECT id, full_name, email, avatar_url, created_at
         FROM users WHERE id = ?`,
        [userId]
      )
      return rows[0]
    })

    const token = signToken(user)
    res.status(201).json({ token, user: sanitizeUser(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      throw new HttpError(400, 'Email dan password wajib diisi')
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, email, password_hash, avatar_url, created_at
       FROM users
       WHERE email = ?`,
      [email]
    )

    const user = rows[0]
    if (!user) {
      throw new HttpError(401, 'Email atau password salah', 'INVALID_CREDENTIALS')
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      throw new HttpError(401, 'Email atau password salah', 'INVALID_CREDENTIALS')
    }

    await seedUserDefaults(pool, user.id)
    const token = signToken(user)
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, avatar_url, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    )
    if (!rows[0]) throw new HttpError(401, 'User not found')
    res.json({ user: sanitizeUser(rows[0]) })
  } catch (err) {
    next(err)
  }
})

router.post('/ensure-defaults', requireAuth, async (req, res, next) => {
  try {
    await withTransaction((conn) => seedUserDefaults(conn, req.user.id))
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
