# Fintracks Backend (Node.js + Express.js + MySQL)

Backend REST API untuk aplikasi **Fintracks** berbasis **Node.js**, **Express.js**, dan **MySQL / TiDB Cloud**.

## Setup Lokal

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
   DB_SSL=false
   JWT_SECRET=ganti-dengan-secret-aman
   ```
   *(Untuk database cloud seperti TiDB Cloud, Anda juga bisa mengisi `DATABASE_URL` dan mengaktifkan `DB_SSL=true`.)*

3. Jalankan migrasi database & tabel SQL (`sql/001_initial_schema.sql`):
   ```bash
   npm run db:migrate
   ```

4. Jalankan server:
   ```bash
   npm run dev
   ```

## Deploy di Vercel

- Import repository `dappahsn/Fintracks` dengan **Root Directory:** `Fintracks-backend` dan **Application Preset:** `Express`.
- Gunakan [api/index.js](api/index.js) dan [vercel.json](vercel.json) yang sudah tersedia.
- Isi Environment Variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `JWT_SECRET`, `CORS_ORIGIN`).

## Endpoint Utama

- `GET /` & `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/ensure-defaults`
- `GET /api/accounts`, `GET /api/accounts/:id`, `POST /api/accounts`, `PATCH /api/accounts/:id`, `DELETE /api/accounts/:id`
- `GET /api/transactions`, `GET /api/transactions/:id`, `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`
- `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `GET /api/recap/summary`, `GET /api/recap/breakdown`
- `GET /api/settings`, `PATCH /api/settings`, `GET /api/settings/reminder`, `PATCH /api/settings/reminder`
- `GET /api/backup`, `POST /api/backup/restore`, `DELETE /api/backup/all-data`
