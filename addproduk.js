/**
 * src/commands/admin/addproduk.js
 * Command /addproduk <nama>|<harga>|<deskripsi> — Tambah produk baru.
 * Pemisah menggunakan karakter '|' agar nama produk bisa berisi spasi.
 */

'use strict';

const productRepository = require('../../database/productRepository');
const { validateHarga, validateText } = require('../../utils/validator');
const { formatRupiah } = require('../../utils/formatter');
const logger = require('../../utils/logger');

async function addProdukCommand(ctx) {
  const fullText = ctx.message.text.split(' ').slice(1).join(' ');
  const parts = fullText.split('|').map((p) => p.trim());

  if (parts.length < 2) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\n' +
      'Gunakan: `/addproduk Nama Produk|Harga|Deskripsi`\n\n' +
      '_Contoh:_\n`/addproduk Akun Premium 1 Bulan|25000|Akses penuh selama 1 bulan`',
      { parse_mode: 'Markdown' }
    );
  }

  const [nama, hargaRaw, deskripsi] = parts;

  const namaValidation = validateText(nama, 255);
  if (!namaValidation.valid) {
    return ctx.reply(`⚠️ ${namaValidation.error}`);
  }

  const hargaValidation = validateHarga(hargaRaw);
  if (!hargaValidation.valid) {
    return ctx.reply(`⚠️ ${hargaValidation.error}`);
  }

  const product = await productRepository.createProduct({
    nama,
    harga: hargaValidation.value,
    deskripsi: deskripsi || null,
  });

  logger.success('Admin:addproduk', `Produk baru ditambahkan: ${product.nama} (ID: ${product.id})`);

  await ctx.replyWithMarkdown(
    `✅ *Produk Ditambahkan*\n\n` +
    `🆔 ID: ${product.id}\n` +
    `📦 Nama: ${product.nama}\n` +
    `💰 Harga: ${formatRupiah(product.harga)}\n` +
    `📝 Deskripsi: ${product.deskripsi || '-'}`
  );
}

module.exports = addProdukCommand;
