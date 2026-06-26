/**
 * src/commands/start.js
 * Command /start — Sambutan awal + registrasi user ke database.
 */

'use strict';

const { Markup } = require('telegraf');
const userRepository = require('../database/userRepository');
const logger = require('../utils/logger');

async function startCommand(ctx) {
  const user = await userRepository.findOrCreateUser(ctx.from);
  logger.info('Command:start', `User ${ctx.from.id} (${ctx.from.first_name})`);

  const name = ctx.from.first_name || 'Pengguna';

  const message =
    `🤖 *Selamat datang, ${name}!*\n\n` +
    `Bot Auto Order ini terintegrasi dengan *GoMerchant* untuk pemesanan dan pembayaran QRIS otomatis.\n\n` +
    `Gunakan menu di bawah atau ketik /help untuk daftar command lengkap.`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Order Produk', 'menu_order'), Markup.button.callback('💎 Akun Premium', 'menu_premium')],
    [Markup.button.callback('👤 Profil', 'menu_profile'), Markup.button.callback('📋 Riwayat', 'menu_history')],
    [Markup.button.callback('📞 Bantuan', 'menu_help')],
  ]);

  await ctx.replyWithMarkdown(message, keyboard);
}

module.exports = startCommand;
