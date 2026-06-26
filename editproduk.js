/**
 * src/commands/admin/editproduk.js
 * Command /editproduk <id> <field> <value...> — Edit field tertentu produk.
 * Field yang diizinkan: nama, harga, deskripsi, kategori, status
 */

'use strict';

const productRepository = require('../../database/productRepository');
const { validateId, validateHarga } = require('../../utils/validator');
const { formatRupiah } = require('../../utils/formatter');
const logger = require('../../utils/logger');

const ALLOWED_FIELDS = ['nama', 'harga', 'deskripsi', 'kategori', 'status'];

async function editProdukCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length < 3) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\n' +
      'Gunakan: `/editproduk <id> <field> <value>`\n\n' +
      `_Field yang diizinkan:_ ${ALLOWED_FIELDS.join(', ')}\n\n` +
      '_Contoh:_\n`/editproduk 1 harga 30000`\n`/editproduk 1 status nonaktif`',
      { parse_mode: 'Markdown' }
    );
  }

  const [idRaw, field, ...valueParts] = args;
  const value = valueParts.join(' ');

  const idValidation = validateId(idRaw);
  if (!idValidation.valid) {
    return ctx.reply('⚠️ ID produk tidak valid.');
  }

  if (!ALLOWED_FIELDS.includes(field)) {
    return ctx.reply(`⚠️ Field "${field}" tidak diizinkan.\n\nField valid: ${ALLOWED_FIELDS.join(', ')}`);
  }

  const existingProduct = await productRepository.getProductById(idValidation.value);
  if (!existingProduct) {
    return ctx.reply('❌ Produk tidak ditemukan.');
  }

  // Validasi khusus untuk field harga
  let finalValue = value;
  if (field === 'harga') {
    const hargaValidation = validateHarga(value);
    if (!hargaValidation.valid) {
      return ctx.reply(`⚠️ ${hargaValidation.error}`);
    }
    finalValue = hargaValidation.value;
  }

  // Validasi khusus untuk field status
  if (field === 'status' && !['aktif', 'nonaktif'].includes(value)) {
    return ctx.reply('⚠️ Status hanya boleh "aktif" atau "nonaktif".');
  }

  const updated = await productRepository.updateProduct(idValidation.value, { [field]: finalValue });

  logger.success('Admin:editproduk', `Produk ${idValidation.value} diupdate: ${field} = ${finalValue}`);

  await ctx.replyWithMarkdown(
    `✅ *Produk Diperbarui*\n\n` +
    `🆔 ID: ${updated.id}\n` +
    `📦 Nama: ${updated.nama}\n` +
    `💰 Harga: ${formatRupiah(updated.harga)}\n` +
    `🏷️ Kategori: ${updated.kategori}\n` +
    `📊 Status: ${updated.status}`
  );
}

module.exports = editProdukCommand;
