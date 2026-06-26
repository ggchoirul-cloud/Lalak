/**
 * src/commands/history.js
 * Command /history — Tampilkan riwayat order milik user yang bersangkutan.
 */

'use strict';

const userRepository = require('../database/userRepository');
const orderRepository = require('../database/orderRepository');
const { formatRupiah, formatDate, getStatusLabel } = require('../utils/formatter');
const logger = require('../utils/logger');

async function historyCommand(ctx) {
  logger.info('Command:history', `User ${ctx.from.id} cek riwayat order`);

  const user = await userRepository.findOrCreateUser(ctx.from);
  const orders = await orderRepository.getOrdersByUser(user.id, 10);

  if (orders.length === 0) {
    return ctx.reply('📋 Kamu belum memiliki riwayat order.\n\nGunakan /order untuk mulai memesan.');
  }

  let message = `📋 *RIWAYAT ORDER* (10 terakhir)\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const order of orders) {
    message +=
      `🔖 \`${order.ref_id}\`\n` +
      `📦 ${order.product_nama}\n` +
      `💰 ${formatRupiah(order.harga)} • ${getStatusLabel(order.status)}\n` +
      `📅 ${formatDate(order.created_at)}\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n_Gunakan /order untuk pesanan baru_`;

  await ctx.replyWithMarkdown(message);
}

module.exports = historyCommand;
