/**
 * src/database/userRepository.js
 * ============================================================
 * Query layer untuk tabel `users`.
 * Semua akses database terkait user terpusat di sini.
 * ============================================================
 */

'use strict';

const { query } = require('./pool');

/**
 * Cari user berdasarkan telegram_id. Jika tidak ada, buat baru.
 * Dipanggil di awal setiap interaksi user dengan bot.
 *
 * @param {object} tgUser - Object ctx.from dari Telegraf
 * @returns {Promise<object>} Row user dari database
 */
async function findOrCreateUser(tgUser) {
  const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [tgUser.id]);

  if (existing.rows.length > 0) {
    // Update info jika username/nama berubah
    const user = existing.rows[0];
    if (user.username !== tgUser.username || user.first_name !== tgUser.first_name) {
      await query(
        `UPDATE users SET username = $1, first_name = $2, last_name = $3, updated_at = NOW()
         WHERE telegram_id = $4`,
        [tgUser.username || null, tgUser.first_name || null, tgUser.last_name || null, tgUser.id]
      );
    }
    return user;
  }

  const result = await query(
    `INSERT INTO users (telegram_id, username, first_name, last_name)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [tgUser.id, tgUser.username || null, tgUser.first_name || null, tgUser.last_name || null]
  );

  console.log(`[DB] User baru terdaftar: ${tgUser.id} (${tgUser.first_name})`);
  return result.rows[0];
}

/**
 * Cek apakah user di-ban.
 * @param {number} telegramId
 * @returns {Promise<boolean>}
 */
async function isBanned(telegramId) {
  const result = await query('SELECT is_banned FROM users WHERE telegram_id = $1', [telegramId]);
  return result.rows.length > 0 ? result.rows[0].is_banned : false;
}

/**
 * Ambil semua user (untuk admin /users).
 * @param {number} limit
 * @param {number} offset
 */
async function getAllUsers(limit = 20, offset = 0) {
  const result = await query(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

/**
 * Hitung total user terdaftar.
 */
async function countUsers() {
  const result = await query('SELECT COUNT(*) as total FROM users');
  return parseInt(result.rows[0].total, 10);
}

module.exports = { findOrCreateUser, isBanned, getAllUsers, countUsers };
