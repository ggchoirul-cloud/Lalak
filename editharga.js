/**
 * /editharga <id> <harga_baru>
 * 
 * Edit harga produk akun premium dengan cepat.
 * Misal: /editharga 1 2500
 */

'use strict';

const db = require('../../database/pool');
const logger = require('../../utils/logger');
const { formatRupiah } = require('../../utils/formatter');

async function editHargaCommand(ctx) {
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length < 2) {
    return ctx.reply(
      '⚠️ Format: /editharga <id> <harga_baru>\n\n' +
      'Contoh:\n' +
      '/editharga 1 2500\n' +
      '/editharga 2 15000'
    );
  }

  const id = parseInt(args[0], 10);
  const hargaBaru = parseInt(args[1], 10);

  if (isNaN(id) || isNaN(hargaBaru)) {
    return ctx.reply('⚠️ ID dan harga harus berupa angka.');
  }

  if (hargaBaru <= 0 || hargaBaru > 50000000) {
    return ctx.reply('⚠️ Harga harus antara Rp 1 - Rp 50.000.000');
  }

  try {
    // Cek produk ada
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return ctx.reply(`⚠️ Produk ID ${id} tidak ditemukan.`);
    }

    const product = result.rows[0];
    const hargaLama = product.harga;

    // Update langsung ke database
    await db.query('UPDATE products SET harga = $1, updated_at = NOW() WHERE id = $2', [
      hargaBaru,
      id
    ]);

    logger.success('Admin:editharga', `Harga produk ${id} diubah: ${hargaLama} → ${hargaBaru}`);

    return ctx.reply(
      `✅ Harga Diperbarui\n\n` +
      `Produk   : ${product.nama}\n` +
      `Harga Lama: ${formatRupiah(hargaLama)}\n` +
      `Harga Baru: ${formatRupiah(hargaBaru)}\n\n` +
      `Buyer yang beli SETELAH perubahan ini akan bayar harga baru.`
    );

  } catch (error) {
    logger.error('Admin:editharga', error.message);
    return ctx.reply(`❌ Error: ${error.message}`);
  }
}

module.exports = editHargaCommand;
