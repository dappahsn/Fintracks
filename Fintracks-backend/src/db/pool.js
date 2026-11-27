import mysql from 'mysql2/promise'
import { buildMysqlConnectionConfig } from '../config/env.js'

export const pool = mysql.createPool({
  ...buildMysqlConnectionConfig({ includeDatabase: true }),
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: ['DATE', 'TIME'],
})

export async function withTransaction(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
