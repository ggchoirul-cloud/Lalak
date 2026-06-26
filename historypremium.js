/**
 * src/commands/historypremium.js
 * Command /historypremium — Riwayat pembelian akun premium milik user,
 * diambil dari tabel `orders` (GoMerchant) untuk produk yang
 * is_premku_product = true. Status fulfillment Premku (premku_order_status)
 * ditampilkan terpisah dari status pembayaran GoMerchant (status).
 */

'use strict';

const userRepository = require('../database/userRepository');
const orderRepository = require('../database/orderRepository');
const { formatRupiah, formatDate, getStatusLabel } = require('../utils/formatter');
const logger = require('../utils/logger');

function getFulfillmentLabel(premkuStatus) {
  switch (premkuStatus) {
    case 'SUCCESS': return '✅ Akun terkirim';
    case 'PENDING': return '⏳ Akun sedang disiapkan';
    case 'FAILED':  return '⚠️ Perlu bantuan admin';
    default:        return '—';
  }
}

async function historyPremiumCommand(ctx) {
  logger.info('Command:historypremium', `User ${ctx.from.id} cek riwayat akun premium`);

  const user = await userRepository.findOrCreateUser(ctx.from);
  const orders = await orderRepository.getPremiumOrdersByUser(user.id, 10);

  if (orders.length === 0) {
    return ctx.reply('💎 Kamu belum pernah membeli akun premium.\n\nGunakan /akunpremium untuk mulai membeli.');
  }

  let message = `💎 RIWAYAT AKUN PREMIUM (10 terakhir)\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const order of orders) {
    message +=
      `${order.product_nama}\n` +
      `💰 ${formatRupiah(order.harga)} • ${formatDate(order.created_at)}\n` +
      `Pembayaran: ${getStatusLabel(order.status)}\n` +
      `Akun: ${getFulfillmentLabel(order.premku_order_status)}\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\nGunakan /akunpremium untuk beli lagi`;

  await ctx.reply(message);
}

module.exports = historyPremiumCommand;
