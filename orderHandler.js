/**
 * src/handlers/orderHandler.js
 * ============================================================
 * Menangani callback_data 'product_<id>' — saat user memilih
 * produk dari daftar /order.
 *
 * Alur:
 * 1. Validasi produk masih aktif
 * 2. Buat order + QRIS via orderService
 * 3. Kirim invoice (teks) + foto QRIS + tombol Batalkan
 * 4. Simpan message_id agar bisa dihapus nanti
 * 5. Mulai auto polling status pembayaran
 * ============================================================
 */

'use strict';

const { Markup } = require('telegraf');
const productRepository = require('../database/productRepository');
const orderRepository = require('../database/orderRepository');
const paymentRepository = require('../database/paymentRepository');
const userRepository = require('../database/userRepository');
const orderService = require('../services/orderService');
const paymentChecker = require('../services/paymentCheckerService');
const { formatRupiah, formatDate } = require('../utils/formatter');
const { checkRateLimit } = require('../utils/rateLimiter');
const logger = require('../utils/logger');

/**
 * Handler saat user klik salah satu tombol produk.
 * @param {import('telegraf').Context} ctx
 */
async function handleProductSelection(ctx) {
  // Support dua prefix: 'product_<id>' (order biasa) dan
  // 'premiumproduct_<id>' (akun premium via QRIS GoMerchant +
  // fulfillment Premku otomatis setelah lunas).
  const productId = parseInt(ctx.callbackQuery.data.replace(/^(premiumproduct_|product_)/, ''), 10);
  const telegramId = ctx.from.id;

  // Rate limit: cegah double-click yang membuat order ganda
  if (!checkRateLimit(telegramId, 3000)) {
    return ctx.answerCbQuery('⏳ Tunggu sebentar sebelum order lagi.');
  }

  await ctx.answerCbQuery();

  const product = await productRepository.getProductById(productId);

  if (!product || product.status !== 'aktif') {
    return ctx.reply('❌ Produk tidak tersedia atau sudah dihapus.');
  }

  const user = await userRepository.findOrCreateUser(ctx.from);
  const customerName = `${ctx.from.first_name || 'User'} (TG-${telegramId})`;

  const loadingMsg = await ctx.reply(`⏳ Membuat order untuk *${product.nama}*...`, { parse_mode: 'Markdown' });

  try {
    const { order, goMerchantData } = await orderService.createOrderWithPayment({
      user,
      product,
      chatId: ctx.chat.id,
      customerName,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    // Kirim invoice
    const invoiceMessage =
      `🧾 *INVOICE PESANAN*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔖 *Order ID*    : \`${order.ref_id}\`\n` +
      `📦 *Produk*      : ${product.nama}\n` +
      `💰 *Harga*       : ${formatRupiah(goMerchantData.amount)}\n` +
      `🔢 *Kode Unik*   : ${goMerchantData.unique_code}\n` +
      `💳 *Total Bayar* : ${formatRupiah(goMerchantData.total_amount)}\n` +
      `📊 *Status*      : ⏳ PENDING\n` +
      `⏰ *Expired*     : ${formatDate(goMerchantData.expires_at)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 Scan QR Code di bawah untuk membayar\n` +
      `🔄 Status dicek otomatis setiap 10 detik`;

    const cancelButton = Markup.inlineKeyboard([
      Markup.button.callback('❌ Batalkan Pembayaran', `cancel_${order.ref_id}`)
    ]);

    const invoiceSent = await ctx.replyWithMarkdown(invoiceMessage, cancelButton);

    // Kirim foto QRIS
    const qrImage = goMerchantData.payment_detail?.qr_image;
    const qrString = goMerchantData.payment_detail?.qr_string;
    let qrisMsgId = null;

    if (qrImage) {
      try {
        const qrisSent = await ctx.replyWithPhoto(qrImage, {
          caption: `💳 Bayar *${formatRupiah(goMerchantData.total_amount)}* • Order: \`${order.ref_id}\``,
          parse_mode: 'Markdown',
        });
        qrisMsgId = qrisSent.message_id;
      } catch (photoErr) {
        logger.warn('OrderHandler', 'Gagal kirim foto QRIS, fallback ke link:', photoErr.message);
        const fallback = await ctx.reply(`🖼️ *Link QRIS:*\n${qrImage}`, { parse_mode: 'Markdown' });
        qrisMsgId = fallback.message_id;
      }
    } else if (qrString) {
      const sent = await ctx.reply(`🔳 *QR String:*\n\`${qrString}\``, { parse_mode: 'Markdown' });
      qrisMsgId = sent.message_id;
    }

    // Simpan message_id ke database agar bisa dihapus nanti (saat paid/expired/cancel)
    await orderRepository.updateMessageIds(order.ref_id, invoiceSent.message_id, qrisMsgId);

    // Mulai auto polling
    paymentChecker.startPolling(order.ref_id);

    logger.success('OrderHandler', `Invoice terkirim untuk order: ${order.ref_id}`);

  } catch (error) {
    logger.error('OrderHandler', `Gagal proses order produk ${productId}:`, error.message);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id); } catch (_) {}
    await ctx.reply(`❌ *Gagal membuat order*\n\n${error.message}`, { parse_mode: 'Markdown' });
  }
}

/**
 * Handler tombol "❌ Batalkan Pembayaran" pada invoice.
 * callback_data format: 'cancel_<ref_id>'
 * @param {import('telegraf').Context} ctx
 */
async function handleCancelPayment(ctx) {
  const refId = ctx.callbackQuery.data.replace('cancel_', '');

  const order = await orderRepository.findByRefId(refId);

  if (!order) {
    await ctx.answerCbQuery('❌ Order tidak ditemukan.');
    return;
  }

  if (order.status !== 'PENDING') {
    await ctx.answerCbQuery(`Order sudah berstatus ${order.status}.`);
    return;
  }

  logger.info('OrderHandler', `User ${ctx.from.id} membatalkan order: ${refId}`);

  // Hentikan polling
  paymentChecker.stopPolling(refId);

  // Hapus pesan invoice + foto QRIS
  await paymentChecker.deleteOrderMessages(order);

  // Update status di database
  await orderRepository.updateStatus(refId, 'CANCELLED');
  await paymentRepository.updatePaymentStatus(refId, 'cancelled');

  await ctx.answerCbQuery('✅ Pembayaran dibatalkan');

  await ctx.reply(
    `❌ *Pembayaran Dibatalkan*\n\n` +
    `Order \`${refId}\` telah dibatalkan.\nQRIS sudah tidak berlaku.\n\n` +
    `Gunakan /order untuk membuat pesanan baru.`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { handleProductSelection, handleCancelPayment };
