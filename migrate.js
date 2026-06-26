/**
 * src/database/migrate.js
 * ============================================================
 * Migration runner sederhana.
 * Membaca semua file .sql di folder /migrations secara berurutan
 * (berdasarkan nama file) dan menjalankannya ke database.
 *
 * Bisa dijalankan dua cara:
 * 1. Manual via CLI: npm run migrate
 * 2. Otomatis dipanggil dari index.js saat bot start (runMigrations
 *    diexport agar bisa dipakai di tempat lain tanpa process.exit).
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

/**
 * Jalankan semua migration yang belum pernah dijalankan.
 * TIDAK memanggil process.exit atau pool.end() — aman dipanggil
 * dari index.js sebelum bot.launch().
 *
 * @returns {Promise<{ executedCount: number, totalFiles: number }>}
 */
async function runMigrations() {
  console.log('[MIGRATE] Memulai proses migrasi database...');

  // Buat tabel pencatat migration yang sudah dijalankan
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Ambil daftar migration yang sudah pernah dijalankan
  const { rows: executedRows } = await pool.query('SELECT filename FROM _migrations');
  const executedSet = new Set(executedRows.map((r) => r.filename));

  // Baca semua file .sql, urutkan berdasarkan nama (001_, 002_, dst)
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[MIGRATE] Tidak ada file migration ditemukan.');
    return { executedCount: 0, totalFiles: 0 };
  }

  let executedCount = 0;

  for (const file of files) {
    if (executedSet.has(file)) {
      console.log(`[MIGRATE] ⏭️  Skip (sudah pernah dijalankan): ${file}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[MIGRATE] ▶️  Menjalankan: ${file}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[MIGRATE] ✅ Berhasil: ${file}`);
      executedCount++;
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw new Error(`Migration gagal pada ${file}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  console.log(`[MIGRATE] Selesai. ${executedCount} migration baru dijalankan, ${files.length - executedCount} dilewati.`);
  return { executedCount, totalFiles: files.length };
}

// ============================================================
// Mode CLI: hanya jalan jika file ini dieksekusi langsung
// (node src/database/migrate.js atau npm run migrate)
// ============================================================
if (require.main === module) {
  (async () => {
    try {
      const connected = await testConnection();
      if (!connected) {
        console.error('[MIGRATE] Migrasi dibatalkan karena koneksi database gagal.');
        process.exit(1);
      }
      await runMigrations();
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('[MIGRATE] Error fatal:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { runMigrations };
