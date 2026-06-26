/**
 * src/commands/help.js
 * Command /help — Tampilkan daftar command yang tersedia.
 */

'use strict';

const { isAdmin } = require('../middlewares/adminGuard');

async function helpCommand(ctx) {
  let message =
    `📞 *BANTUAN*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*Command User:*\n` +
    `/start — Mulai bot & tampilkan sambutan\n` +
    `/menu — Tampilkan menu utama\n` +
    `/order — Pesan produk baru\n` +
    `/profile — Lihat profil merchant\n` +
    `/history — Riwayat order kamu\n` +
    `/cancel <ref\\_id> — Batalkan order pending\n` +
    `/akunpremium — Beli akun premium (Capcut, Netflix, dll)\n` +
    `/historypremium — Riwayat pembelian akun premium\n` +
    `/help — Tampilkan bantuan ini\n`;

  if (isAdmin(ctx.from.id)) {
    message +=
      `\n*Command Admin:*\n` +
      `/admin — Panel admin\n` +
      `/addproduk <nama>|<harga>|<deskripsi> — Tambah produk\n` +
      `/editproduk <id> <field> <value> — Edit produk\n` +
      `/editharga <id> <harga_baru> — Edit harga produk premium (CEPAT)\n` +
      `/hapusproduk <id> — Hapus produk\n` +
      `/orders — Daftar order terbaru\n` +
      `/users — Daftar user terdaftar\n` +
      `/statistik — Statistik penjualan\n` +
      `\n*Command Admin — Akun Premium:*\n` +
      `/listpremku — Lihat katalog Premku + ID produk\n` +
      `/addpremium <id\\_premku>|<nama>|<harga>|<deskripsi> — Tambah produk premium\n` +
      `/profilepremku — Cek modal saldo Premku\n` +
      `/topupsaldo <nominal> — Isi modal saldo Premku\n` +
      `/statusdeposit <invoice> — Cek status deposit modal\n` +
      `/batalkandeposit <invoice> — Batalkan deposit modal\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n_Pembayaran QRIS dicek otomatis setiap 10 detik_`;

  await ctx.replyWithMarkdown(message);
}

module.exports = helpCommand;
