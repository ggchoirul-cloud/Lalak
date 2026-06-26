/**
 * src/commands/profile.js
 * Command /profile — Tampilkan profil merchant GoMerchant (bukan profil user Telegram).
 * Ini berguna untuk admin/owner cek kuota & plan GoMerchant mereka.
 */

'use strict';

const goMerchantService = require('../services/goMerchantService');
const logger = require('../utils/logger');

async function profileCommand(ctx) {
  logger.info('Command:profile', `User ${ctx.from.id} cek profil merchant`);

  const loadingMsg = await ctx.reply('⏳ Mengambil data profil...');

  try {
    const result = await goMerchantService.getProfile();

    if (!result || result.status !== 'Success') {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply(`❌ ${result?.message || 'Gagal mengambil profil.'}`);
    }

    const d = result.data;

    const message =
      `👤 *PROFIL MERCHANT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🏪 *Nama*  : ${d.name || 'N/A'}\n` +
      `📧 *Email* : ${d.email || 'N/A'}\n` +
      `🎭 *Role*  : ${d.role || 'N/A'}\n` +
      `📦 *Plan*  : ${d.plan || 'N/A'}\n` +
      `📊 *Usage* : ${d.usage ?? 'N/A'} / ${d.limit ?? 'N/A'} transaksi\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Data dari GoMerchant API_`;

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    await ctx.replyWithMarkdown(message);

  } catch (error) {
    logger.error('Command:profile', error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ *Gagal mengambil profil*\n\n${error.message}`, { parse_mode: 'Markdown' });
  }
}

module.exports = profileCommand;
