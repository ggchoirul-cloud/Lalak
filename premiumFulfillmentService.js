/**
 * src/services/premiumFulfillmentService.js
 * ============================================================
 * Menjembatani pembayaran QRIS GoMerchant (yang dibayar buyer)
 * dengan order akun premium ke Premku (dibayar dari saldo admin).
 *
 * Dipanggil oleh paymentCheckerService setelah payment GoMerchant
 * terkonfirmasi PAID untuk produk yang is_premku_product = true.
 *
 * Alur:
 * 1. Order ke Premku menggunakan premku_product_id dari produk lokal
 * 2. Premku ASYNC — saldo admin terpotong, status "Pending"
 * 3. Polling /status sampai "success" (dapat akun) atau "failed"
 * 4. Kirim akun ke chat buyer (bukan ke admin)
 *
 * Jika Premku gagal/saldo admin tidak cukup, buyer SUDAH bayar
 * lewat GoMerchant — admin WAJIB segera diberi tahu untuk refund
 * manual atau top up saldo Premku lalu fulfill manual.
 * ============================================================
 */

'use strict';

const premkuService = require('./premkuService');
const orderRepository = require('../database/orderRepository');
const config = require('../config/config');
const logger = require('../utils/logger');
const { formatRupiah, generateRefId } = require('../utils/formatter');

const activeFulfillmentPollings = new Map(); // premkuInvoice -> intervalId
let botInstance = null;

/**
 * Inisialisasi dengan instance bot. Dipanggil dari index.js.
 * @param {import('telegraf').Telegraf} bot
 */
function init(bot) {
  botInstance = bot;
  logger.info('PremiumFulfillment', 'Service diinisialisasi dengan instance bot.');
}

/**
 * Mulai proses fulfillment: order ke Premku, lalu poll sampai dapat akun.
 * @param {object} order - Row order dari tabel `orders` (GoMerchant) yang sudah PAID
 * @param {object} product - Row product dari tabel `products`, harus punya premku_product_id
 */
async function fulfillPremiumOrder(order, product) {
  const chatId = order.chat_id;
  const premkuRefId = generateRefId(); // ref_id terpisah khusus untuk request ke Premku

  logger.info('PremiumFulfillment', `Mulai fulfillment akun premium untuk order ${order.ref_id} -> Premku product ${product.premku_product_id}`);

  try {
    const result = await premkuService.createOrder({
      productId: product.premku_product_id,
      qty: 1,
      refId: premkuRefId,
    });

    if (!result || result.success !== true) {
      // Saldo admin tidak cukup / produk Premku bermasalah, dst.
      // Buyer SUDAH bayar — ini kondisi kritis, admin wajib ditangani manual.
      const errMsg = result?.message || 'Gagal order ke Premku.';
      logger.error('PremiumFulfillment', `Fulfillment GAGAL untuk order ${order.ref_id}: ${errMsg}`);

      await orderRepository.updatePremkuOrderData(order.ref_id, {
        premkuOrderStatus: 'FAILED',
      });

      await notifyAdminsCritical(
        `🚨 GAGAL FULFILLMENT AKUN PREMIUM\n\n` +
        `Order: ${order.ref_id}\n` +
        `Produk: ${order.product_nama}\n` +
        `Buyer sudah BAYAR ${formatRupiah(order.harga)} tapi order ke Premku gagal:\n"${errMsg}"\n\n` +
        `Kemungkinan saldo Premku tidak cukup. Cek /profilepremku dan /topupsaldo, lalu proses akun secara manual ke buyer (chat_id: ${chatId}).`
      );

      await botInstance.telegram.sendMessage(
        chatId,
        `✅ Pembayaran kamu sudah kami terima.\n\n` +
        `Akun untuk pesanan ${order.ref_id} sedang diproses oleh tim kami secara manual dan akan dikirim sesegera mungkin. Mohon ditunggu.`
      );
      return;
    }

    // Order ke Premku berhasil dibuat (status "Pending" di sisi Premku)
    await orderRepository.updatePremkuOrderData(order.ref_id, {
      premkuInvoice: result.invoice,
      premkuOrderStatus: 'PENDING',
    });

    await botInstance.telegram.sendMessage(
      chatId,
      `⏳ Pembayaran diterima! Akun untuk ${order.product_nama} sedang disiapkan sistem dan akan dikirim otomatis dalam beberapa saat.`
    );

    startFulfillmentPolling(result.invoice, chatId, order);

  } catch (error) {
    logger.error('PremiumFulfillment', `Error fulfillment order ${order.ref_id}:`, error.message);
    await notifyAdminsCritical(
      `🚨 ERROR FULFILLMENT AKUN PREMIUM\n\nOrder: ${order.ref_id}\nProduk: ${order.product_nama}\nBuyer sudah bayar tapi terjadi error: ${error.message}\n\nSegera proses manual ke chat_id: ${chatId}`
    );
  }
}

/**
 * Polling status order Premku sampai dapat akun atau gagal.
 * @param {string} invoice - invoice dari Premku
 * @param {number} chatId - chat BUYER tujuan kirim akun
 * @param {object} order - row order GoMerchant terkait (untuk update DB)
 */
function startFulfillmentPolling(invoice, chatId, order) {
  if (activeFulfillmentPollings.has(invoice)) return;

  let attempt = 0;
  const { checkIntervalMs, maxCheckAttempts } = config.payment;

  const intervalId = setInterval(async () => {
    attempt++;

    if (!activeFulfillmentPollings.has(invoice)) {
      clearInterval(intervalId);
      return;
    }

    try {
      const result = await premkuService.checkOrderStatus(invoice);

      if (!result || result.success !== true) {
        if (attempt >= maxCheckAttempts) {
          stopFulfillmentPolling(invoice);
          await notifyAdminsCritical(
            `🚨 TIMEOUT VERIFIKASI AKUN PREMIUM\n\nOrder GoMerchant: ${order.ref_id}\nInvoice Premku: ${invoice}\nGagal verifikasi status setelah beberapa kali coba. Cek manual ke Premku.`
          );
        }
        return;
      }

      const status = (result.status || '').toLowerCase();

      if (status === 'success') {
        stopFulfillmentPolling(invoice);
        logger.success('PremiumFulfillment', `Akun siap untuk order ${order.ref_id} (invoice Premku: ${invoice})`);

        await orderRepository.updatePremkuOrderData(order.ref_id, {
          premkuOrderStatus: 'SUCCESS',
          premkuAccounts: result.accounts,
        });

        let message = `✅ AKUN PREMIUM SIAP DIGUNAKAN\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `Produk: ${result.product}\nOrder: ${order.ref_id}\n\n`;

        if (Array.isArray(result.accounts) && result.accounts.length > 0) {
          message += `🔐 DETAIL AKUN\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
          result.accounts.forEach((acc, idx) => {
            message += `Akun ${idx + 1}:\nUsername: ${acc.username}\nPassword: ${acc.password}\n\n`;
          });
          message += `━━━━━━━━━━━━━━━━━━━━━\nSimpan baik-baik. Jangan dibagikan ke orang lain.`;
        } else {
          message += `(Tidak ada detail akun pada response — hubungi admin jika tidak menerima akun)`;
        }

        await botInstance.telegram.sendMessage(chatId, message);
        return;
      }

      if (status === 'failed' || status === 'gagal' || status === 'error') {
        stopFulfillmentPolling(invoice);
        logger.warn('PremiumFulfillment', `Order Premku gagal: ${invoice}`);

        await orderRepository.updatePremkuOrderData(order.ref_id, { premkuOrderStatus: 'FAILED' });

        await notifyAdminsCritical(
          `🚨 ORDER PREMKU GAGAL (status: failed)\n\nOrder GoMerchant: ${order.ref_id}\nInvoice Premku: ${invoice}\nBuyer sudah bayar — proses refund/manual fulfillment diperlukan. chat_id: ${chatId}`
        );

        await botInstance.telegram.sendMessage(
          chatId,
          `⚠️ Terjadi kendala saat menyiapkan akun untuk pesanan ${order.ref_id}. Tim kami sudah diberi tahu dan akan segera menghubungi kamu.`
        );
        return;
      }

      if (attempt >= maxCheckAttempts) {
        stopFulfillmentPolling(invoice);
        await notifyAdminsCritical(
          `🚨 TIMEOUT AKUN PREMIUM (masih pending)\n\nOrder GoMerchant: ${order.ref_id}\nInvoice Premku: ${invoice}\nStatus masih "pending" setelah batas waktu polling. Cek manual.`
        );
      }

    } catch (error) {
      logger.error('PremiumFulfillment', `Error polling ${invoice} (attempt ${attempt}):`, error.message);
      if (attempt >= maxCheckAttempts) {
        stopFulfillmentPolling(invoice);
      }
    }
  }, checkIntervalMs);

  activeFulfillmentPollings.set(invoice, intervalId);
}

/**
 * Hentikan polling fulfillment untuk satu invoice.
 * @param {string} invoice
 */
function stopFulfillmentPolling(invoice) {
  if (activeFulfillmentPollings.has(invoice)) {
    clearInterval(activeFulfillmentPollings.get(invoice));
    activeFulfillmentPollings.delete(invoice);
  }
}

/**
 * Kirim notifikasi kritis ke semua admin. Terpisah dari
 * paymentChecker.notifyAdmins agar tidak circular-require.
 * @param {string} message
 */
async function notifyAdminsCritical(message) {
  for (const adminId of config.adminIds) {
    try {
      await botInstance.telegram.sendMessage(adminId, message);
    } catch (error) {
      logger.warn('PremiumFulfillment', `Gagal kirim notifikasi ke admin ${adminId}:`, error.message);
    }
  }
}

module.exports = { init, fulfillPremiumOrder };
