/**
 * src/commands/admin/profilepremku.js
 * Command /profilepremku — Cek saldo & profil akun Premku (admin only).
 */

'use strict';

const premkuService = require('../../services/premkuService');
const { formatRupiah, formatDate } = require('../../utils/formatter');
const logger = require('../../utils/logger');

async function profilePremkuCommand(ctx) {
  const loadingMsg = await ctx.reply('⏳ Mengambil profil Premku...');

  try {
    const result = await premkuService.getProfile();

    if (!result || result.success !== true) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply(`❌ ${result?.message || 'Gagal mengambil profil.'}`);
    }

    const d = result.data;

    const message =
      `💎 PROFIL PREMKU\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 Username   : ${d.username}\n` +
      `📱 WhatsApp   : ${d.whatsapp}\n` +
      `💰 Saldo      : ${formatRupiah(d.saldo)}\n` +
      `📅 Terdaftar  : ${formatDate(d.registered_at)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Saldo rendah? Gunakan /topupsaldo <nominal>`;

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    await ctx.reply(message);

  } catch (error) {
    logger.error('Admin:profilepremku', error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ Gagal mengambil profil\n\n${error.message}`);
  }
}

module.exports = profilePremkuCommand;
