export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    })
  }

  // MySQL error codes
  if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
    return res.status(409).json({ error: 'Data already exists', code: 'DUPLICATE_ENTRY' })
  }
  if (
    err?.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
    err?.code === 'ER_NO_REFERENCED_ROW_2' ||
    err?.errno === 3819 ||
    err?.errno === 1452
  ) {
    return res.status(400).json({ error: err.message || 'Invalid request data' })
  }

  console.error(err)
  return res.status(500).json({ error: 'Internal server error' })
}
