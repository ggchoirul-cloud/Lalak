/**
 * src/commands/order.js
 * Command /order — Tampilkan daftar produk aktif sebagai tombol pilihan.
 * Saat user klik produk, ditangani oleh handler callback 'product_<id>'
 * di src/handlers/orderHandler.js
 */

'use strict';

const { Markup } = require('telegraf');
const productRepository = require('../database/productRepository');
const { formatRupiah } = require('../utils/formatter');
const logger = require('../utils/logger');

async function orderCommand(ctx) {
  logger.info('Command:order', `User ${ctx.from.id} membuka daftar produk`);

  const products = await productRepository.getActiveProducts();

  if (products.length === 0) {
    return ctx.reply('📦 Saat ini belum ada produk yang tersedia. Coba lagi nanti.');
  }

  const message =
    `🛒 *DAFTAR PRODUK*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Pilih produk yang ingin dipesan:`;

  // Buat satu tombol per produk, format: "Nama - Rp xxx"
  const buttons = products.map((p) => [
    Markup.button.callback(`${p.nama} — ${formatRupiah(p.harga)}`, `product_${p.id}`)
  ]);

  await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
}

module.exports = orderCommand;
