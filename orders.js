/**
 * src/commands/admin/orders.js
 * Command /orders [status] — Daftar order terbaru, bisa difilter status.
 */

'use strict';

const orderRepository = require('../../database/orderRepository');
const { formatRupiah, formatDate, getStatusLabel } = require('../../utils/formatter');

const VALID_STATUSES = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'];

async function ordersCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const filterStatus = args[0] ? args[0].toUpperCase() : null;

  if (filterStatus && !VALID_STATUSES.includes(filterStatus)) {
    return ctx.reply(
      `⚠️ Status tidak valid.\n\nGunakan salah satu: ${VALID_STATUSES.join(', ')}\n` +
      `_Contoh: /orders PENDING_`,
      { parse_mode: 'Markdown' }
    );
  }

  const orders = await orderRepository.getAllOrders(filterStatus, 15);

  if (orders.length === 0) {
    return ctx.reply('📋 Tidak ada order ditemukan.');
  }

  let message = `📋 *DAFTAR ORDER* ${filterStatus ? `(${filterStatus})` : '(15 terbaru)'}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const order of orders) {
    message +=
      `🔖 \`${order.ref_id}\`\n` +
      `👤 ${order.first_name || 'Unknown'} (@${order.username || '-'})\n` +
      `📦 ${order.product_nama} • ${formatRupiah(order.harga)}\n` +
      `📊 ${getStatusLabel(order.status)}\n` +
      `📅 ${formatDate(order.created_at)}\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n_Filter: /orders PENDING | PAID | EXPIRED | CANCELLED_`;

  await ctx.replyWithMarkdown(message);
}

module.exports = ordersCommand;
