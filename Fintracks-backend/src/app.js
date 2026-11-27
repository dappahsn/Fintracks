import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import accountsRoutes from './routes/accounts.routes.js'
import transactionsRoutes from './routes/transactions.routes.js'
import categoriesRoutes from './routes/categories.routes.js'
import recapRoutes from './routes/recap.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import backupRoutes from './routes/backup.routes.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    })
  )
  app.use(express.json({ limit: '5mb' }))

  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'Fintracks API (Express + MySQL) is running',
      health: '/api/health',
    })
  })

  app.get('/api/health', async (_req, res, next) => {
    try {
      await pool.query('SELECT 1')
      res.json({ status: 'ok', database: 'mysql' })
    } catch (err) {
      next(err)
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/accounts', accountsRoutes)
  app.use('/api/transactions', transactionsRoutes)
  app.use('/api/categories', categoriesRoutes)
  app.use('/api/recap', recapRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/backup', backupRoutes)

  app.use(errorHandler)

  return app
}
