/**
 * src/commands/akunpremium.js
 * Command /akunpremium — Tampilkan daftar akun premium dari tabel
 * products LOKAL (bukan langsung dari Premku API), dengan harga yang
 * sudah diset admin sendiri lewat /addpremium atau /editproduk.
 *
 * Saat user klik produk, buyer akan diminta bayar QRIS GoMerchant
 * dengan harga lokal ini. Setelah lunas, sistem baru order ke Premku
 * di belakang layar menggunakan saldo admin sebagai modal.
 */

'use strict';

const { Markup } = require('telegraf');
const productRepository = require('../database/productRepository');
const { formatRupiah } = require('../utils/formatter');
const logger = require('../utils/logger');

async function akunPremiumCommand(ctx) {
  logger.info('Command:akunpremium', `User ${ctx.from.id} membuka daftar akun premium`);

  const products = await productRepository.getActivePremkuLinkedProducts();

  if (products.length === 0) {
    return ctx.reply('📦 Belum ada akun premium yang tersedia saat ini. Coba lagi nanti.');
  }

  const message =
    `💎 *AKUN PREMIUM TERSEDIA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Pilih produk yang ingin dibeli:`;

  // callback_data 'premiumproduct_<id_lokal>' — pakai ID produk lokal,
  // BUKAN premku_product_id, karena dari sisi buyer ini transaksi
  // GoMerchant biasa dulu.
  const buttons = products.map((p) => [
    Markup.button.callback(`${p.nama} — ${formatRupiah(p.harga)}`, `premiumproduct_${p.id}`)
  ]);

  await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
}

module.exports = akunPremiumCommand;
