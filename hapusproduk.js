/**
 * src/commands/admin/hapusproduk.js
 * Command /hapusproduk <id> — Hapus produk dari database.
 */

'use strict';

const productRepository = require('../../database/productRepository');
const { validateId } = require('../../utils/validator');
const logger = require('../../utils/logger');

async function hapusProdukCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);
  const idRaw = args[0];

  if (!idRaw) {
    return ctx.reply(
      '⚠️ *Format salah!*\n\nGunakan: /hapusproduk <id>\n_Contoh: /hapusproduk 3_',
      { parse_mode: 'Markdown' }
    );
  }

  const idValidation = validateId(idRaw);
  if (!idValidation.valid) {
    return ctx.reply('⚠️ ID produk tidak valid.');
  }

  const existing = await productRepository.getProductById(idValidation.value);
  if (!existing) {
    return ctx.reply('❌ Produk tidak ditemukan.');
  }

  try {
    await productRepository.deleteProduct(idValidation.value);
    logger.success('Admin:hapusproduk', `Produk "${existing.nama}" (ID: ${idValidation.value}) dihapus`);

    await ctx.replyWithMarkdown(`✅ Produk *"${existing.nama}"* berhasil dihapus.`);
  } catch (error) {
    // Kemungkinan gagal karena foreign key constraint (ada order yang referensi produk ini)
    logger.error('Admin:hapusproduk', error.message);
    await ctx.reply(
      `❌ Gagal menghapus produk. Kemungkinan produk ini sudah memiliki riwayat order.\n\n` +
      `Saran: ubah status menjadi nonaktif saja dengan:\n/editproduk ${idValidation.value} status nonaktif`
    );
  }
}

module.exports = hapusProdukCommand;
