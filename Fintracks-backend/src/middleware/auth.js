import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.slice(7).trim()
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.user = { id: payload.sub, email: payload.email }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
