/**
 * src/bot/index.js
 * ============================================================
 * Inisialisasi instance Telegraf dan registrasi seluruh
 * command, handler callback, dan middleware.
 *
 * File ini TIDAK menjalankan bot.launch() — itu dilakukan di
 * index.js (entry point utama) setelah database siap.
 * ============================================================
 */

'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config/config');
const logger = require('../utils/logger');

// Commands - User
const startCommand = require('../commands/start');
const menuCommand = require('../commands/menu');
const orderCommand = require('../commands/order');
const profileCommand = require('../commands/profile');
const historyCommand = require('../commands/history');
const cancelCommand = require('../commands/cancel');
const helpCommand = require('../commands/help');
const akunPremiumCommand = require('../commands/akunpremium');
const historyPremiumCommand = require('../commands/historypremium');

// Commands - Admin
const adminCommand = require('../commands/admin/admin');
const addProdukCommand = require('../commands/admin/addproduk');
const editProdukCommand = require('../commands/admin/editproduk');
const hapusProdukCommand = require('../commands/admin/hapusproduk');
const ordersCommand = require('../commands/admin/orders');
const usersCommand = require('../commands/admin/users');
const statistikCommand = require('../commands/admin/statistik');
const editHargaCommand = require('../commands/admin/editharga');
const profilePremkuCommand = require('../commands/admin/profilepremku');
const topupSaldoCommand = require('../commands/admin/topupsaldo');
const statusDepositCommand = require('../commands/admin/statusdeposit');
const batalkanDepositCommand = require('../commands/admin/batalkandeposit');

// Handlers (callback query / tombol inline)
const { handleProductSelection, handleCancelPayment } = require('../handlers/orderHandler');
const { handleMenuCallback } = require('../handlers/menuHandler');
const { handleAdminCallback } = require('../handlers/adminHandler');

// Middleware
const { adminGuard } = require('../middlewares/adminGuard');

/**
 * Buat dan konfigurasi instance bot Telegraf.
 * @returns {import('telegraf').Telegraf}
 */
function createBot() {
  const bot = new Telegraf(config.botToken);

  // ============================================================
  // Middleware global: log setiap update masuk
  // ============================================================
  bot.use((ctx, next) => {
    const user = ctx.from ? `${ctx.from.id} (@${ctx.from.username || ctx.from.first_name})` : 'unknown';
    const text = ctx.message?.text || ctx.callbackQuery?.data || '[non-text]';
    logger.info('Bot', `Update dari ${user}: ${text}`);
    return next();
  });

  // ============================================================
  // Command — User
  // ============================================================
  bot.command('start', startCommand);
  bot.command('menu', menuCommand);
  bot.command('order', orderCommand);
  bot.command('profile', profileCommand);
  bot.command('history', historyCommand);
  bot.command('cancel', cancelCommand);
  bot.command('help', helpCommand);
  bot.command('akunpremium', akunPremiumCommand);
  bot.command('historypremium', historyPremiumCommand);

  // ============================================================
  // Command — Admin (dilindungi adminGuard middleware)
  // ============================================================
  bot.command('admin', adminGuard, adminCommand);
  bot.command('addproduk', adminGuard, addProdukCommand);
  bot.command('editproduk', adminGuard, editProdukCommand);
  bot.command('editharga', adminGuard, editHargaCommand);
  bot.command('hapusproduk', adminGuard, hapusProdukCommand);
  bot.command('orders', adminGuard, ordersCommand);
  bot.command('users', adminGuard, usersCommand);
  bot.command('statistik', adminGuard, statistikCommand);
  bot.command('profilepremku', adminGuard, profilePremkuCommand);
  bot.command('topupsaldo', adminGuard, topupSaldoCommand);
  bot.command('statusdeposit', adminGuard, statusDepositCommand);
  bot.command('batalkandeposit', adminGuard, batalkanDepositCommand);

  // ============================================================
  // Callback Query — Tombol inline
  // ============================================================

  // Pemilihan produk: callback_data 'product_<id>'
  bot.action(/^product_\d+$/, handleProductSelection);

  // Pemilihan akun premium: callback_data 'premiumproduct_<id>'
  // (QRIS GoMerchant dengan harga lokal, fulfillment Premku otomatis setelah lunas)
  bot.action(/^premiumproduct_\d+$/, handleProductSelection);

  // Batalkan pembayaran: callback_data 'cancel_<ref_id>'
  bot.action(/^cancel_(.+)$/, handleCancelPayment);

  // Menu utama: 'menu_order', 'menu_profile', 'menu_history', 'menu_help'
  bot.action(/^menu_/, handleMenuCallback);

  // Panel admin: 'admin_orders', 'admin_users', 'admin_stats'
  bot.action(/^admin_/, handleAdminCallback);

  // ============================================================
  // Pesan teks tidak dikenal
  // ============================================================
  bot.on('text', (ctx) => {
    if (ctx.message.text.startsWith('/')) {
      return ctx.reply('❓ Command tidak dikenal.\n\nKetik /help untuk daftar command.');
    }
    ctx.reply('💬 Ketik /menu untuk melihat menu utama, atau /help untuk bantuan.');
  });

  // ============================================================
  // Global error handler
  // ============================================================
  bot.catch((error, ctx) => {
    logger.error('Bot', 'Error tidak tertangani:', error.message);
    console.error(error.stack);
    if (ctx) {
      ctx.reply('❌ Terjadi kesalahan internal. Silakan coba lagi atau hubungi admin.').catch(() => {});
    }
  });

  return bot;
}

module.exports = { createBot };
