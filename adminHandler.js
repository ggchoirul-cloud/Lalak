/**
 * src/handlers/adminHandler.js
 * ============================================================
 * Menangani callback_data dari tombol panel admin:
 * 'admin_orders', 'admin_stats', 'admin_users',
 * 'admin_topup_premku', 'admin_cek_saldo_premku'
 * ============================================================
 */

'use strict';

const { isAdmin } = require('../middlewares/adminGuard');
const ordersCommand = require('../commands/admin/orders');
const usersCommand = require('../commands/admin/users');
const statistikCommand = require('../commands/admin/statistik');
const profilePremkuCommand = require('../commands/admin/profilepremku');

async function handleAdminCallback(ctx) {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCbQuery('🚫 Akses ditolak.');
  }

  const action = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  switch (action) {
    case 'admin_orders':
      return ordersCommand(ctx);
    case 'admin_users':
      return usersCommand(ctx);
    case 'admin_stats':
      return statistikCommand(ctx);
    case 'admin_cek_saldo_premku':
      return profilePremkuCommand(ctx);
    case 'admin_topup_premku':
      // Tombol Telegram tidak bisa menangkap input teks bebas secara
      // langsung, jadi di sini kita tampilkan instruksi + contoh
      // command yang tinggal di-tap untuk diisi nominalnya.
      return ctx.reply(
        '💰 Ketik command berikut dengan nominal yang diinginkan:\n\n' +
        '/topupsaldo 1000\n\n' +
        'Contoh lain:\n/topupsaldo 50000\n/topupsaldo 100000'
      );
    default:
      return ctx.reply('❓ Aksi admin tidak dikenal.');
  }
}

module.exports = { handleAdminCallback };
