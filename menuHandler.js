/**
 * src/handlers/menuHandler.js
 * ============================================================
 * Menangani callback_data dari tombol menu utama:
 * 'menu_order', 'menu_profile', 'menu_history', 'menu_help'
 *
 * Cukup delegasikan ke command yang sudah ada agar tidak duplikasi logika.
 * ============================================================
 */

'use strict';

const orderCommand = require('../commands/order');
const profileCommand = require('../commands/profile');
const historyCommand = require('../commands/history');
const helpCommand = require('../commands/help');
const akunPremiumCommand = require('../commands/akunpremium');

async function handleMenuCallback(ctx) {
  const action = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  switch (action) {
    case 'menu_order':
      return orderCommand(ctx);
    case 'menu_premium':
      return akunPremiumCommand(ctx);
    case 'menu_profile':
      return profileCommand(ctx);
    case 'menu_history':
      return historyCommand(ctx);
    case 'menu_help':
      return helpCommand(ctx);
    default:
      return ctx.reply('❓ Menu tidak dikenal.');
  }
}

module.exports = { handleMenuCallback };
