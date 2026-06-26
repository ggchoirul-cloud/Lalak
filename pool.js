/**
 * src/database/pool.js
 * ============================================================
 * Koneksi pool PostgreSQL menggunakan library 'pg'.
 * Semua query database melewati pool ini agar koneksi
 * dapat digunakan kembali secara efisien.
 * ============================================================
 */

'use strict';

const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Batas koneksi simultan ke database
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ============================================================
// Log error pada level pool (misal koneksi terputus)
// ============================================================
pool.on('error', (err) => {
  console.error('[DATABASE] Pool error tidak terduga:', err.message);
});

/**
 * Jalankan query SQL menggunakan pool.
 * @param {string} text - Query SQL dengan placeholder $1, $2, dst.
 * @param {Array} params - Parameter untuk query
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query OK (${duration}ms): ${text.split('\n')[0].trim()}`);
    return result;
  } catch (error) {
    console.error(`[DB] Query Error: ${error.message}`);
    console.error(`[DB] Query: ${text}`);
    throw error;
  }
}

/**
 * Tes koneksi database. Dipanggil saat startup.
 */
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('[DATABASE] ✅ Koneksi PostgreSQL berhasil.');
    return true;
  } catch (error) {
    console.error('[DATABASE] ❌ Gagal konek ke PostgreSQL:', error.message);
    return false;
  }
}

module.exports = { pool, query, testConnection };
