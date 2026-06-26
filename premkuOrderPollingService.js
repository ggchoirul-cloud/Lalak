/**
 * src/services/premkuOrderPollingService.js
 * ============================================================
 * Auto-polling status ORDER Premku (bukan deposit).
 *
 * Order Premku bersifat ASYNC: setelah createOrder() saldo langsung
 * terpotong dan status awal "Pending", tapi akun (username/password)
 * baru tersedia setelah status berubah jadi "success" — itu dicek
 * lewat endpoint /status secara berkala.
 * ============================================================
 */

'use strict';

const premkuService = require('./premkuService');
const premkuRepository = require('../database/premkuRepository');
const config = require('../config/config');
const logger = require('../utils/logger');
const { formatRupiah } = require('../utils/formatter');

const activeOrderPollings = new Map(); // invoice -> intervalId
let botInstance = null;

/**
 * Inisialisasi dengan instance bot (dipanggil dari index.js).
 * @param {import('telegraf').Telegraf} bot
 */
function init(bot) {
  botInstance = bot;
  logger.info('PremkuOrderPolling', 'Service diinisialisasi dengan instance bot.');
}

/**
 * Mulai polling status order sampai sukses (dapat akun) atau gagal.
 * @param {string} invoice
 * @param {number} chatId
 * @param {object} orderMeta - { refId, premkuOrderDbId } untuk update riwayat di DB
 */
function startOrderPolling(invoice, chatId, orderMeta) {
  if (activeOrderPollings.has(invoice)) return;

  let attempt = 0;
  const { checkIntervalMs, maxCheckAttempts } = config.payment;

  logger.info('PremkuOrderPolling', `Mulai polling order: ${invoice}`);

  const intervalId = setInterval(async () => {
    attempt++;

    if (!activeOrderPollings.has(invoice)) {
      clearInterval(intervalId);
      return;
    }

    try {
      const result = await premkuService.checkOrderStatus(invoice);

      if (!result || result.success !== true) {
        // Error transport/API — coba lagi sampai max attempts
        if (attempt >= maxCheckAttempts) {
          stopOrderPolling(invoice);
          await botInstance.telegram.sendMessage(
            chatId,
            `⚠️ Gagal memverifikasi status order ${invoice} setelah beberapa kali percobaan.\n\nGunakan /historypremium untuk cek manual nanti, atau hubungi admin.`
          );
        }
        return;
      }

      const status = (result.status || '').toLowerCase();

      if (status === 'success') {
        stopOrderPolling(invoice);
        logger.success('PremkuOrderPolling', `Order sukses: ${invoice}`);

        // Update riwayat order di database jadi SUCCESS + simpan akun
        if (orderMeta?.refId) {
          await premkuRepository.updatePremkuOrderStatus(orderMeta.refId, 'SUCCESS', result.accounts);
        }

        // Kirim akun ke user — plain text untuk hindari masalah karakter spesial Markdown
        let message = `✅ AKUN PREMIUM SIAP DIGUNAKAN\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `Produk: ${result.product}\nInvoice: ${result.invoice}\n\n`;

        if (Array.isArray(result.accounts) && result.accounts.length > 0) {
          message += `🔐 DETAIL AKUN\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
          result.accounts.forEach((acc, idx) => {
            message += `Akun ${idx + 1}:\nUsername: ${acc.username}\nPassword: ${acc.password}\n\n`;
          });
          message += `━━━━━━━━━━━━━━━━━━━━━\nSimpan baik-baik. Jangan dibagikan ke orang lain.`;
        } else {
          message += `(Tidak ada detail akun pada response — silakan cek /historypremium atau hubungi admin)`;
        }

        await botInstance.telegram.sendMessage(chatId, message);
        return;
      }

      if (status === 'failed' || status === 'gagal' || status === 'error') {
        stopOrderPolling(invoice);
        logger.warn('PremkuOrderPolling', `Order gagal: ${invoice}`);

        if (orderMeta?.refId) {
          await premkuRepository.updatePremkuOrderStatus(orderMeta.refId, 'FAILED', null);
        }

        await botInstance.telegram.sendMessage(
          chatId,
          `❌ Order ${invoice} gagal diproses oleh sistem provider.\n\nSaldo yang sudah terpotong akan diproses pengembaliannya oleh admin. Hubungi admin jika diperlukan.`
        );
        return;
      }

      // Masih "pending" -> lanjut polling, kecuali sudah max attempts
      if (attempt >= maxCheckAttempts) {
        stopOrderPolling(invoice);
        logger.warn('PremkuOrderPolling', `Order timeout (masih pending): ${invoice}`);

        await botInstance.telegram.sendMessage(
          chatId,
          `⏳ Order ${invoice} masih diproses provider lebih lama dari biasanya.\n\nAkun akan tetap dikirim begitu siap. Cek manual nanti dengan /historypremium atau hubungi admin.`
        );
      }

    } catch (error) {
      logger.error('PremkuOrderPolling', `Error polling ${invoice} (attempt ${attempt}):`, error.message);
      if (attempt >= maxCheckAttempts) {
        stopOrderPolling(invoice);
      }
    }
  }, checkIntervalMs);

  activeOrderPollings.set(invoice, intervalId);
}

/**
 * Hentikan polling untuk satu invoice order.
 * @param {string} invoice
 */
function stopOrderPolling(invoice) {
  if (activeOrderPollings.has(invoice)) {
    clearInterval(activeOrderPollings.get(invoice));
    activeOrderPollings.delete(invoice);
    logger.info('PremkuOrderPolling', `Polling dihentikan: ${invoice}`);
  }
}

module.exports = { init, startOrderPolling, stopOrderPolling };
