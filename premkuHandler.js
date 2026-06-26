/**
 * src/handlers/premkuHandler.js
 * ============================================================
 * Menangani callback_data 'premku_<id>' — saat user memilih
 * akun premium dari daftar /akunpremium.
 *
 * PENTING — Alur order Premku bersifat ASYNC:
 * 1. Cek stok produk masih ada
 * 2. Panggil /order -> saldo LANGSUNG terpotong, status "Pending"
 *    (response TIDAK berisi akun sama sekali di tahap ini)
 * 3. Simpan riwayat ke database dengan status PENDING
 * 4. Mulai polling /status setiap 10 detik sampai status berubah
 *    jadi "success" (baru di titik ini akun didapat) atau "failed"
 * 5. Begitu sukses, kirim kredensial akun ke user via pesan terpisah
 *
 * Catatan keamanan: kredensial akun (username/password) dikirim
 * sebagai PLAIN TEXT (tanpa parse_mode Markdown) karena bisa
 * mengandung karakter spesial yang merusak parsing Telegram.
 * ============================================================
 */

'use strict';

const premkuService = require('../services/premkuService');
const premkuRepository = require('../database/premkuRepository');
const userRepository = require('../database/userRepository');
const paymentChecker = require('../services/paymentCheckerService');
const premkuOrderPolling = require('../services/premkuOrderPollingService');
const { formatRupiah, generateRefId } = require('../utils/formatter');
const { checkRateLimit } = require('../utils/rateLimiter');
const logger = require('../utils/logger');

/**
 * Handler saat user klik salah satu tombol akun premium.
 * @param {import('telegraf').Context} ctx
 */
async function handlePremkuSelection(ctx) {
  const premkuProductId = parseInt(ctx.callbackQuery.data.replace('premku_', ''), 10);
  const telegramId = ctx.from.id;

  // Rate limit: cegah double-click yang memicu order ganda
  if (!checkRateLimit(telegramId, 3000)) {
    return ctx.answerCbQuery('⏳ Tunggu sebentar sebelum order lagi.');
  }

  await ctx.answerCbQuery();

  const loadingMsg = await ctx.reply('⏳ Memproses pesanan akun premium...');

  try {
    // 1. Cek stok dulu sebelum mencoba order
    const stockResult = await premkuService.checkStock(premkuProductId);
    if (!stockResult || stockResult.success !== true || stockResult.stock <= 0) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply('❌ Stok produk ini sudah habis. Coba produk lain.');
    }

    const user = await userRepository.findOrCreateUser(ctx.from);
    const refId = generateRefId();

    // 2. Buat order — saldo LANGSUNG terpotong, status awal "Pending"
    const result = await premkuService.createOrder({
      productId: premkuProductId,
      qty: 1,
      refId,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    if (!result || result.success !== true) {
      const errMsg = result?.message || 'Order gagal.';
      logger.warn('PremkuHandler', `Order gagal untuk produk ${premkuProductId}: ${errMsg}`);

      // Simpan sebagai riwayat gagal juga, agar admin bisa lihat di log
      await premkuRepository.createPremkuOrder({
        refId,
        userId: user.id,
        premkuProductId,
        productNama: stockResult.product || 'Unknown',
        qty: 1,
        price: 0,
        total: 0,
        status: 'FAILED',
        rawResponse: result,
      });

      if (errMsg.toLowerCase().includes('saldo')) {
        await paymentChecker.notifyAdmins(
          `⚠️ Saldo Premku Tidak Cukup\n\nUser ${ctx.from.id} mencoba beli produk ID ${premkuProductId} tapi saldo tidak mencukupi. Segera lakukan deposit lewat /topupsaldo.`
        );
        return ctx.reply('❌ Maaf, stok/saldo sistem sedang tidak tersedia. Admin sudah diberi tahu, coba lagi nanti.');
      }

      return ctx.reply(`❌ ${errMsg}`);
    }

    // 3. Simpan riwayat dengan status PENDING (akun belum didapat di sini)
    await premkuRepository.createPremkuOrder({
      refId,
      userId: user.id,
      premkuProductId,
      productNama: result.product || stockResult.product || 'Unknown',
      qty: result.qty ?? 1,
      price: result.price ?? 0,
      total: result.total ?? 0,
      status: 'PENDING',
      invoice: result.invoice,
      accounts: null,
      balanceBefore: result.balance_before,
      balanceAfter: result.balance_after,
      rawResponse: result,
    });

    logger.info('PremkuHandler', `Order dibuat (pending): ${result.product} untuk user ${telegramId}, invoice ${result.invoice}`);

    // 4. Beri tahu user order sedang diproses — plain text, hindari nama
    //    produk dengan karakter spesial Markdown
    await ctx.reply(
      `⏳ ORDER DITERIMA\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Produk  : ${result.product}\n` +
      `Total   : ${formatRupiah(result.total)}\n` +
      `Invoice : ${result.invoice}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Akun sedang diproses oleh sistem provider. Kamu akan menerima detail akun secara otomatis begitu siap (biasanya dalam hitungan detik).`
    );

    // 5. Mulai polling status order sampai dapat akun (atau gagal/timeout).
    //    ctx.chat.id di sini adalah chat BUYER (yang klik tombol produk),
    //    sehingga akun otomatis terkirim ke buyer begitu status "success".
    premkuOrderPolling.startOrderPolling(result.invoice, ctx.chat.id, { refId });

    // Notifikasi admin
    await paymentChecker.notifyAdmins(
      `💎 Order Akun Premium Baru\n\nProduk: ${result.product}\nTotal: ${formatRupiah(result.total)}\nSisa saldo Premku: ${formatRupiah(result.balance_after)}\nInvoice: ${result.invoice}`
    );

  } catch (error) {
    logger.error('PremkuHandler', `Gagal proses order produk ${premkuProductId}:`, error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ Gagal memproses order\n\n${error.message}`);
  }
}

module.exports = { handlePremkuSelection };
