/**
 * src/commands/admin/statusdeposit.js
 * Command /statusdeposit <invoice> — Cek status deposit secara manual.
 */

'use strict';

const premkuService = require('../../services/premkuService');
const { formatRupiah } = require('../../utils/formatter');
const logger = require('../../utils/logger');

async function statusDepositCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const invoice = args[0];

  if (!invoice) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\nGunakan: /statusdeposit <invoice>\n_Contoh: /statusdeposit ORD592817_',
      { parse_mode: 'Markdown' }
    );
  }

  const loadingMsg = await ctx.reply('⏳ Mengecek status deposit...');

  try {
    const result = await premkuService.checkDepositStatus(invoice);

    if (!result || result.success !== true) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply(`❌ ${result?.message || 'Deposit tidak ditemukan.'}`);
    }

    const d = result.data;

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    await ctx.replyWithMarkdown(
      `📊 *STATUS DEPOSIT*\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🧾 *Invoice* : \`${d.invoice}\`\n` +
      `📊 *Status*  : ${d.status.toUpperCase()}\n` +
      `💳 *Total*   : ${formatRupiah(d.total_bayar)}`
    );

  } catch (error) {
    logger.error('Admin:statusdeposit', error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ *Gagal cek status*\n\n${error.message}`, { parse_mode: 'Markdown' });
  }
}

module.exports = statusDepositCommand;
