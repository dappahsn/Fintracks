# Fintracks Backend (Node.js + Express.js + MySQL)

Backend REST API untuk aplikasi **Fintracks** sebagai pengganti Supabase.

## Setup

1. Install dependensi:
   ```bash
   npm install
   ```

2. Pastikan MySQL Server berjalan, lalu salin `.env.example` ke `.env` dan sesuaikan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, serta `JWT_SECRET`:
   ```env
   PORT=4000
   CORS_ORIGIN=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=fintracks
   DB_USER=root
   DB_PASSWORD=
   JWT_SECRET=ganti-dengan-secret-aman
   ```

3. Jalankan migrasi database & tabel SQL (`sql/001_initial_schema.sql`):
   ```bash
   npm run db:migrate
   ```

4. Jalankan server:
   ```bash
   npm run dev
   ```

## Endpoint Utama

- `GET /` & `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/accounts`, `GET /api/accounts/:id`, `POST /api/accounts`, `PATCH /api/accounts/:id`, `DELETE /api/accounts/:id`
- `GET /api/transactions`, `GET /api/transactions/export`, `GET /api/transactions/:id`, `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`
- `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `GET /api/recap/summary`, `GET /api/recap/breakdown`
- `GET /api/settings`, `PATCH /api/settings`, `GET /api/settings/reminder`, `PATCH /api/settings/reminder`
- `GET /api/backup`, `POST /api/backup/restore`, `DELETE /api/backup/all-data`
