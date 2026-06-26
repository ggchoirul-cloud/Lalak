/**
 * src/utils/rateLimiter.js
 * ============================================================
 * Rate limiter sederhana berbasis in-memory Map.
 * Mencegah user melakukan spam command secara berlebihan.
 *
 * Catatan: in-memory berarti limit reset jika bot di-restart.
 * Untuk skala besar/multi-instance, ganti dengan Redis.
 * ============================================================
 */

'use strict';

const userLastAction = new Map(); // telegram_id -> timestamp aksi terakhir

/**
 * Cek apakah user boleh melakukan aksi (belum melebihi rate limit).
 * @param {number} telegramId
 * @param {number} cooldownMs - Jeda minimum antar aksi (ms)
 * @returns {boolean} true jika boleh lanjut, false jika masih cooldown
 */
function checkRateLimit(telegramId, cooldownMs = 2000) {
  const now = Date.now();
  const lastAction = userLastAction.get(telegramId);

  if (lastAction && now - lastAction < cooldownMs) {
    return false; // Masih dalam cooldown
  }

  userLastAction.set(telegramId, now);
  return true;
}

// Bersihkan entry lama setiap 10 menit agar Map tidak terus membesar
setInterval(() => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [telegramId, lastAction] of userLastAction.entries()) {
    if (now - lastAction > TEN_MINUTES) {
      userLastAction.delete(telegramId);
    }
  }
}, 10 * 60 * 1000);

module.exports = { checkRateLimit };
