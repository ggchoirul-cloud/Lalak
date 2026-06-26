/**
 * src/services/paymentCheckerService.js
 * ============================================================
 * Mengelola auto-polling status pembayaran untuk setiap order
 * yang masih PENDING, dan auto-expire job global.
 *
 * Desain:
 * - Setiap order punya 1 interval timer sendiri (per ref_id).
 * - Timer disimpan di Map agar bisa dihentikan manual (saat cancel)
 *   atau otomatis (saat paid/expired/max attempts).
 * - Saat bot restart, semua order PENDING yang belum expired
 *   di-reattach pollingnya lewat resumePendingOrders().
 * - Sebuah cron-like interval terpisah (checkExpiredOrders) berjalan
 *   setiap 1 menit untuk menyapu order yang lewat expired_at namun
 *   tidak sempat tertangkap polling (misal bot down saat itu).
 * ============================================================
 */

'use strict';

const goMerchantService = require('./goMerchantService');
const orderRepository = require('../database/orderRepository');
const paymentRepository = require('../database/paymentRepository');
const productRepository = require('../database/productRepository');
const config = require('../config/config');
const logger = require('../utils/logger');
const { formatRupiah, formatDate } = require('../utils/formatter');

// Map<ref_id, intervalId> — daftar polling yang sedang aktif
const activePollings = new Map();

// Referensi instance bot Telegraf, diset lewat init()
let botInstance = null;

/**
 * Inisialisasi service dengan instance bot (dipanggil dari bot/index.js).
 * @param {import('telegraf').Telegraf} bot
 */
function init(bot) {
  botInstance = bot;
  logger.info('PaymentChecker', 'Service diinisialisasi dengan instance bot.');
}

/**
 * Kirim notifikasi pembayaran berhasil ke user, lalu hapus invoice+QRIS lama.
 * @param {object} order - Row order dari database
 * @param {object} paymentData - data dari response GoMerchant /status
 */
async function notifyPaymentSuccess(order, paymentData) {
  const chatId = order.chat_id;

  // Hapus pesan invoice & QRIS lama (sudah tidak relevan)
  await deleteOrderMessages(order);

  const message =
    `✅ *PEMBAYARAN BERHASIL!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔖 *Order ID*    : \`${order.ref_id}\`\n` +
    `📦 *Produk*      : ${order.product_nama}\n` +
    `💰 *Nominal*     : ${formatRupiah(paymentData.amount)}\n` +
    `💳 *Total Bayar* : ${formatRupiah(paymentData.total_amount)}\n` +
    `📅 *Waktu Bayar* : ${formatDate(paymentData.paid_at)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Terima kasih telah melakukan pembayaran! 🎉_`;

  try {
    await botInstance.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('PaymentChecker', `Gagal kirim notifikasi sukses ke ${chatId}:`, error.message);
  }

  // Notifikasi ke semua admin
  await notifyAdmins(
    `💰 Pembayaran Masuk\n\n` +
    `Order: ${order.ref_id}\n` +
    `Produk: ${order.product_nama}\n` +
    `Nominal: ${formatRupiah(paymentData.total_amount)}\n` +
    `User: ${order.chat_id}`
  );

  // ============================================================
  // Hook fulfillment akun premium: jika produk order ini terhubung
  // ke Premku (is_premku_product = true), lanjutkan dengan order
  // ke Premku menggunakan saldo admin sebagai modal, lalu kirim
  // akun ke buyer begitu siap. Ini terpisah dari paymentChecker
  // generic agar tidak mencampur logic GoMerchant dengan Premku.
  // ============================================================
  try {
    const product = await productRepository.getProductById(order.product_id);
    if (product?.is_premku_product && product.premku_product_id) {
      const premiumFulfillment = require('./premiumFulfillmentService');
      await premiumFulfillment.fulfillPremiumOrder(order, product);
    }
  } catch (error) {
    logger.error('PaymentChecker', `Gagal trigger fulfillment akun premium untuk ${order.ref_id}:`, error.message);
  }
}

/**
 * Kirim notifikasi expired ke user dan hapus invoice+QRIS.
 * @param {object} order
 */
async function notifyPaymentExpired(order) {
  const chatId = order.chat_id;

  await deleteOrderMessages(order);

  try {
    await botInstance.telegram.sendMessage(
      chatId,
      `⏰ *Pesanan Kadaluarsa*\n\n` +
      `Order \`${order.ref_id}\` untuk produk *${order.product_nama}* telah kadaluarsa karena tidak dibayar tepat waktu.\n\n` +
      `Gunakan /order untuk membuat pesanan baru.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('PaymentChecker', `Gagal kirim notifikasi expired ke ${chatId}:`, error.message);
  }
}

/**
 * Hapus pesan invoice & foto QRIS terkait order dari chat Telegram.
 * @param {object} order
 */
async function deleteOrderMessages(order) {
  if (order.invoice_message_id) {
    try {
      await botInstance.telegram.deleteMessage(order.chat_id, order.invoice_message_id);
    } catch (error) {
      logger.warn('PaymentChecker', `Gagal hapus invoice msg ${order.invoice_message_id}:`, error.message);
    }
  }
  if (order.qris_message_id) {
    try {
      await botInstance.telegram.deleteMessage(order.chat_id, order.qris_message_id);
    } catch (error) {
      logger.warn('PaymentChecker', `Gagal hapus QRIS msg ${order.qris_message_id}:`, error.message);
    }
  }
}

/**
 * Kirim pesan ke semua admin yang terdaftar di config.adminIds.
 * @param {string} message
 */
async function notifyAdmins(message) {
  for (const adminId of config.adminIds) {
    try {
      await botInstance.telegram.sendMessage(adminId, message);
    } catch (error) {
      logger.warn('PaymentChecker', `Gagal kirim notifikasi ke admin ${adminId}:`, error.message);
    }
  }
}

/**
 * Mulai polling status pembayaran untuk satu order.
 * Dipanggil setelah order+QRIS berhasil dibuat, atau saat resume.
 *
 * @param {string} refId
 */
function startPolling(refId) {
  if (activePollings.has(refId)) {
    logger.warn('PaymentChecker', `Polling untuk ${refId} sudah berjalan, skip duplikasi.`);
    return;
  }

  let attempt = 0;
  const { checkIntervalMs, maxCheckAttempts } = config.payment;

  logger.info('PaymentChecker', `Mulai polling: ${refId} (interval ${checkIntervalMs}ms)`);

  const intervalId = setInterval(async () => {
    attempt++;

    // Pastikan polling belum dihentikan dari luar (misal user cancel)
    if (!activePollings.has(refId)) {
      clearInterval(intervalId);
      return;
    }

    try {
      const order = await orderRepository.findByRefId(refId);

      // Order sudah tidak PENDING lagi (mungkin dibatalkan manual) -> stop
      if (!order || order.status !== 'PENDING') {
        stopPolling(refId);
        return;
      }

      const result = await goMerchantService.checkStatus(refId);
      const d = result?.data;

      if (d?.payment_status === 'paid') {
        stopPolling(refId);
        logger.success('PaymentChecker', `Pembayaran berhasil: ${refId}`);

        await orderRepository.updateStatus(refId, 'PAID');
        await paymentRepository.updatePaymentStatus(refId, 'paid', d.paid_at);

        await notifyPaymentSuccess(order, d);
        return;
      }

      // Cek apakah sudah lewat waktu expired (double-check selain cron)
      const isExpiredByTime = new Date(order.expired_at) <= new Date();

      if (isExpiredByTime || attempt >= maxCheckAttempts) {
        stopPolling(refId);
        logger.info('PaymentChecker', `Order expired/timeout: ${refId}`);

        await orderRepository.updateStatus(refId, 'EXPIRED');
        await paymentRepository.updatePaymentStatus(refId, 'expired');

        await notifyPaymentExpired(order);
      }

    } catch (error) {
      logger.error('PaymentChecker', `Error polling ${refId} (attempt ${attempt}):`, error.message);
      if (attempt >= maxCheckAttempts) {
        stopPolling(refId);
      }
    }
  }, checkIntervalMs);

  activePollings.set(refId, intervalId);
}

/**
 * Hentikan polling untuk satu order (dipanggil saat paid/expired/cancel).
 * @param {string} refId
 */
function stopPolling(refId) {
  if (activePollings.has(refId)) {
    clearInterval(activePollings.get(refId));
    activePollings.delete(refId);
    logger.info('PaymentChecker', `Polling dihentikan: ${refId}`);
  }
}

/**
 * Saat bot baru start, ambil semua order PENDING dari database
 * dan mulai ulang pollingnya. Ini penting agar order yang dibuat
 * sebelum bot restart tidak "hilang" dari pengecekan.
 */
async function resumePendingOrders() {
  try {
    const pendingOrders = await orderRepository.getPendingOrders();
    logger.info('PaymentChecker', `Melanjutkan polling untuk ${pendingOrders.length} order PENDING...`);

    for (const order of pendingOrders) {
      startPolling(order.ref_id);
    }
  } catch (error) {
    logger.error('PaymentChecker', 'Gagal resume pending orders:', error.message);
  }
}

/**
 * Job berkala (tiap 1 menit) untuk menyapu order PENDING yang
 * sudah lewat expired_at tapi entah kenapa belum tertangkap polling
 * individual (misal bot mati lalu hidup lagi tepat di waktu kritis).
 */
function startExpiredSweeper() {
  const SWEEP_INTERVAL_MS = 60 * 1000; // 1 menit

  setInterval(async () => {
    try {
      const expiredOrders = await orderRepository.getExpiredPendingOrders();

      for (const order of expiredOrders) {
        stopPolling(order.ref_id);
        await orderRepository.updateStatus(order.ref_id, 'EXPIRED');
        await paymentRepository.updatePaymentStatus(order.ref_id, 'expired');
        await notifyPaymentExpired(order);
        logger.info('PaymentChecker', `[Sweeper] Order disapu sebagai expired: ${order.ref_id}`);
      }
    } catch (error) {
      logger.error('PaymentChecker', '[Sweeper] Error:', error.message);
    }
  }, SWEEP_INTERVAL_MS);

  logger.info('PaymentChecker', 'Expired sweeper job dimulai (interval 1 menit).');
}

module.exports = {
  init,
  startPolling,
  stopPolling,
  resumePendingOrders,
  startExpiredSweeper,
  deleteOrderMessages,
  notifyAdmins,
};
