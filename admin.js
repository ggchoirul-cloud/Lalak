/**
 * src/commands/admin/admin.js
 * Command /admin — Panel utama admin dengan tombol navigasi.
 */

'use strict';

const { Markup } = require('telegraf');

async function adminCommand(ctx) {
  const message =
    `🛠️ *PANEL ADMIN*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Selamat datang di panel admin. Pilih menu di bawah atau gunakan command langsung:\n\n` +
    `📦 /addproduk <nama>|<harga>|<deskripsi>\n` +
    `✏️ /editproduk <id> <field> <value>\n` +
    `🗑️ /hapusproduk <id>\n` +
    `📋 /orders — Daftar order terbaru\n` +
    `👥 /users — Daftar user\n` +
    `📊 /statistik — Statistik penjualan\n\n` +
    `💎 *Akun Premium (dijual ke buyer via QRIS GoMerchant):*\n` +
    `📋 /listpremku — Lihat katalog Premku + ID produk\n` +
    `➕ /addpremium <id_premku>|<nama>|<harga>|<deskripsi> — Tambah produk\n` +
    `✏️ /editproduk <id> <field> <value> — Edit harga/nama (pakai ID lokal)\n\n` +
    `🔐 *Modal Saldo Premku (khusus admin, BUKAN saldo buyer):*\n` +
    `💰 /topupsaldo <nominal> — Isi modal saldo Premku\n` +
    `💳 /profilepremku — Cek sisa modal saldo Premku`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Order Terbaru', 'admin_orders'), Markup.button.callback('📊 Statistik', 'admin_stats')],
    [Markup.button.callback('👥 Daftar User', 'admin_users')],
    [Markup.button.callback('💰 Top Up Modal Premku', 'admin_topup_premku'), Markup.button.callback('💎 Cek Saldo Premku', 'admin_cek_saldo_premku')],
  ]);

  await ctx.replyWithMarkdown(message, keyboard);
}

module.exports = adminCommand;
