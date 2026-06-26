/**
 * src/commands/admin/topupsaldo.js
 * Command /topupsaldo <nominal> — Admin deposit saldo ke akun Premku.
 * Generate QRIS dari Premku, lalu auto-poll status pembayaran.
 */

'use strict';

const premkuService = require('../../services/premkuService');
const premkuRepository = require('../../database/premkuRepository');
const premkuPollingService = require('../../services/premkuPollingService');
const { validateDepositAmount } = require('../../utils/validator');
const { formatRupiah } = require('../../utils/formatter');
const logger = require('../../utils/logger');

async function topupSaldoCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const nominalRaw = args[0];

  if (!nominalRaw) {
    return ctx.reply(
      '⚠️ Format salah!\n\nGunakan: /topupsaldo <nominal>\nContoh: /topupsaldo 1000'
    );
  }

  const depositValidation = validateDepositAmount(nominalRaw);
  if (!depositValidation.valid) {
    return ctx.reply(`⚠️ ${depositValidation.error}`);
  }

  const loadingMsg = await ctx.reply('⏳ Membuat QRIS deposit...');

  try {
    const result = await premkuService.createDeposit(depositValidation.value);

    if (!result || result.success !== true) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply(`❌ ${result?.message || 'Gagal membuat deposit.'}`);
    }

    const d = result.data;

    // Simpan ke database untuk tracking
    await premkuRepository.createDeposit({
      invoice: d.invoice,
      adminTelegramId: ctx.from.id,
      amountReq: d.amount_req,
      kodeUnik: d.kode_unik,
      totalBayar: d.total_bayar,
      qrImage: d.qr_image,
      qrRaw: d.qr_raw,
      rawResponse: result,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    const message =
      `💰 DEPOSIT SALDO PREMKU\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Invoice      : ${d.invoice}\n` +
      `Nominal      : ${formatRupiah(d.amount_req)}\n` +
      `Kode Unik    : ${d.kode_unik}\n` +
      `Total Bayar  : ${formatRupiah(d.total_bayar)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 Scan QR di bawah untuk bayar\n` +
      `🔄 Status dicek otomatis setiap 10 detik`;

    await ctx.reply(message);

    // qr_image dari Premku berupa data URI base64 (data:image/png;base64,...)
    if (d.qr_image) {
      try {
        const base64Data = d.qr_image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        await ctx.replyWithPhoto({ source: buffer }, {
          caption: `Bayar ${formatRupiah(d.total_bayar)} untuk top up saldo Premku`,
        });
      } catch (imgErr) {
        logger.warn('Admin:topupsaldo', 'Gagal kirim QR image:', imgErr.message);
        await ctx.reply('⚠️ Gagal menampilkan gambar QR, tapi deposit tetap tercatat. Cek /statusdeposit.');
      }
    }

    // Mulai polling status deposit
    premkuPollingService.startDepositPolling(d.invoice, ctx.chat.id);

  } catch (error) {
    logger.error('Admin:topupsaldo', error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ Gagal membuat deposit\n\n${error.message}`);
  }
}

module.exports = topupSaldoCommand;
