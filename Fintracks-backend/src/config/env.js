import 'dotenv/config'

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) return null
  const url = new URL(rawUrl)
  const sslParam = url.searchParams.get('ssl') || url.searchParams.get('ssl-mode')
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    database: url.pathname ? url.pathname.replace(/^\/+/, '') : 'fintracks',
    user: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    sslRequested: Boolean(sslParam && sslParam !== 'false' && sslParam !== 'DISABLED'),
  }
}

const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL || '')
const sslEnabled = process.env.DB_SSL === 'true' || Boolean(parsedUrl?.sslRequested)
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'

export const env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbHost: parsedUrl?.host || process.env.DB_HOST || 'localhost',
  dbPort: parsedUrl?.port || Number(process.env.DB_PORT || 3306),
  dbName: parsedUrl?.database || process.env.DB_NAME || 'fintracks',
  dbUser: parsedUrl?.user || process.env.DB_USER || 'root',
  dbPassword: parsedUrl?.password ?? process.env.DB_PASSWORD ?? '',
  dbSsl: sslEnabled ? { rejectUnauthorized } : undefined,
  jwtSecret: process.env.JWT_SECRET || 'dev-fintracks-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}

export function buildMysqlConnectionConfig({ includeDatabase = true } = {}) {
  return {
    host: env.dbHost,
    port: env.dbPort,
    ...(includeDatabase ? { database: env.dbName } : {}),
    user: env.dbUser,
    password: env.dbPassword,
    ...(env.dbSsl ? { ssl: env.dbSsl } : {}),
  }
}
