import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(__dirname, '../../sql/001_initial_schema.sql')

async function migrate() {
  const sql = await fs.readFile(schemaPath, 'utf8')
  const conn = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true,
  })

  try {
    const safeDbName = env.dbName.replace(/`/g, '')
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    await conn.query(`USE \`${safeDbName}\``)
    await conn.query(sql)
    console.log(`MySQL migration completed successfully on database "${safeDbName}".`)
  } finally {
    await conn.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exitCode = 1
})
