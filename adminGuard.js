/**
 * src/middlewares/adminGuard.js
 * ============================================================
 * Middleware untuk membatasi akses command admin.
 * Hanya telegram_id yang ada di config.adminIds yang boleh lewat.
 * ============================================================
 */

'use strict';

const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Cek apakah telegram_id termasuk admin.
 * @param {number} telegramId
 * @returns {boolean}
 */
function isAdmin(telegramId) {
  return config.adminIds.includes(telegramId);
}

/**
 * Middleware Telegraf: hentikan request jika bukan admin.
 */
async function adminGuard(ctx, next) {
  const telegramId = ctx.from?.id;

  if (!telegramId || !isAdmin(telegramId)) {
    logger.warn('AdminGuard', `Akses ditolak untuk user: ${telegramId}`);
    return ctx.reply('🚫 Command ini khusus untuk admin.');
  }

  return next();
}

module.exports = { adminGuard, isAdmin };
