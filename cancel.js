/**
 * src/commands/cancel.js
 * Command /cancel <ref_id> — Batalkan order PENDING secara manual via command.
 * (Selain lewat tombol inline "Batalkan Pembayaran" di invoice)
 */

'use strict';

const orderRepository = require('../database/orderRepository');
const paymentRepository = require('../database/paymentRepository');
const paymentChecker = require('../services/paymentCheckerService');
const userRepository = require('../database/userRepository');
const logger = require('../utils/logger');

async function cancelCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const refId = args[0];

  if (!refId) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\nGunakan: /cancel <ref_id>\n_Contoh: /cancel ORD-1234567890-ABCDE_',
      { parse_mode: 'Markdown' }
    );
  }

  const order = await orderRepository.findByRefId(refId);

  if (!order) {
    return ctx.reply('❌ Order tidak ditemukan. Periksa kembali ref_id-nya.');
  }

  const user = await userRepository.findOrCreateUser(ctx.from);
  if (order.user_id !== user.id) {
    return ctx.reply('🚫 Kamu tidak memiliki akses untuk membatalkan order ini.');
  }

  if (order.status !== 'PENDING') {
    return ctx.reply(`⚠️ Order ini sudah berstatus *${order.status}*, tidak bisa dibatalkan.`, { parse_mode: 'Markdown' });
  }

  // Hentikan polling & hapus pesan invoice/QRIS
  paymentChecker.stopPolling(refId);
  await paymentChecker.deleteOrderMessages(order);

  await orderRepository.updateStatus(refId, 'CANCELLED');
  await paymentRepository.updatePaymentStatus(refId, 'cancelled');

  logger.info('Command:cancel', `Order ${refId} dibatalkan oleh user ${ctx.from.id}`);

  await ctx.reply(
    `✅ *Order Dibatalkan*\n\nOrder \`${refId}\` berhasil dibatalkan.`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = cancelCommand;
