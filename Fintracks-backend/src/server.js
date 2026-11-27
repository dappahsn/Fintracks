import { env } from './config/env.js'
import app from './app.js'

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Fintracks API running on http://localhost:${env.port}`)
  })
}

export default app
