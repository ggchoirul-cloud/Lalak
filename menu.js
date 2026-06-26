/**
 * src/commands/menu.js
 * Command /menu — Tampilkan menu utama dengan inline keyboard.
 */

'use strict';

const { Markup } = require('telegraf');

async function menuCommand(ctx) {
  const message =
    `📋 *MENU UTAMA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Pilih salah satu menu di bawah ini:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Order Produk', 'menu_order'), Markup.button.callback('💎 Akun Premium', 'menu_premium')],
    [Markup.button.callback('👤 Profil', 'menu_profile'), Markup.button.callback('📋 Riwayat', 'menu_history')],
    [Markup.button.callback('📞 Bantuan', 'menu_help')],
  ]);

  await ctx.replyWithMarkdown(message, keyboard);
}

module.exports = menuCommand;
