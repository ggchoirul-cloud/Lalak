/**
 * src/commands/admin/statistik.js
 * Command /statistik — Ringkasan statistik penjualan & order.
 */

'use strict';

const orderRepository = require('../../database/orderRepository');
const userRepository = require('../../database/userRepository');
const { formatRupiah } = require('../../utils/formatter');

async function statistikCommand(ctx) {
  const stats = await orderRepository.getOrderStats();
  const totalUsers = await userRepository.countUsers();

  const message =
    `📊 *STATISTIK BOT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👥 *Total User*       : ${totalUsers}\n\n` +
    `📦 *Total Order*      : ${stats.total_order}\n` +
    `✅ *Lunas*            : ${stats.total_paid}\n` +
    `⏳ *Pending*          : ${stats.total_pending}\n` +
    `⏰ *Expired*          : ${stats.total_expired}\n` +
    `❌ *Dibatalkan*       : ${stats.total_cancelled}\n\n` +
    `💰 *Total Revenue*    : ${formatRupiah(stats.total_revenue)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Data real-time dari database_`;

  await ctx.replyWithMarkdown(message);
}

module.exports = statistikCommand;
