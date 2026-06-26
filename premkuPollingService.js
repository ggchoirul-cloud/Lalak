/**
 * src/services/premkuPollingService.js
 * ============================================================
 * Auto-polling status deposit saldo Premku, mirip paymentCheckerService
 * tapi untuk endpoint /pay_status (bukan GoMerchant /status).
 * ============================================================
 */

'use strict';

const premkuService = require('./premkuService');
const premkuRepository = require('../database/premkuRepository');
const config = require('../config/config');
const logger = require('../utils/logger');
const { formatRupiah } = require('../utils/formatter');

const activeDepositPollings = new Map(); // invoice -> intervalId
let botInstance = null;

/**
 * Inisialisasi dengan instance bot (dipanggil dari index.js).
 * @param {import('telegraf').Telegraf} bot
 */
function init(bot) {
  botInstance = bot;
  logger.info('PremkuPolling', 'Service diinisialisasi dengan instance bot.');
}

/**
 * Mulai polling status deposit.
 * @param {string} invoice
 * @param {number} chatId - chat tujuan notifikasi (biasanya chat admin yang deposit)
 */
function startDepositPolling(invoice, chatId) {
  if (activeDepositPollings.has(invoice)) return;

  let attempt = 0;
  const { checkIntervalMs, maxCheckAttempts } = config.payment;

  logger.info('PremkuPolling', `Mulai polling deposit: ${invoice}`);

  const intervalId = setInterval(async () => {
    attempt++;

    if (!activeDepositPollings.has(invoice)) {
      clearInterval(intervalId);
      return;
    }

    try {
      const result = await premkuService.checkDepositStatus(invoice);
      const d = result?.data;

      if (d?.status === 'success') {
        stopDepositPolling(invoice);
        await premkuRepository.updateDepositStatus(invoice, 'success');

        logger.success('PremkuPolling', `Deposit berhasil: ${invoice}`);

        await botInstance.telegram.sendMessage(
          chatId,
          `✅ *DEPOSIT BERHASIL!*\n\n` +
          `🧾 Invoice: \`${invoice}\`\n` +
          `💰 Total: ${formatRupiah(d.total_bayar)}\n\n` +
          `Saldo Premku sudah bertambah. Cek dengan /profilepremku`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      if (attempt >= maxCheckAttempts) {
        stopDepositPolling(invoice);
        await premkuRepository.updateDepositStatus(invoice, 'expired');

        logger.info('PremkuPolling', `Deposit timeout: ${invoice}`);

        await botInstance.telegram.sendMessage(
          chatId,
          `⏰ *Deposit Kadaluarsa*\n\nInvoice \`${invoice}\` tidak dibayar dalam waktu yang ditentukan.`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      logger.error('PremkuPolling', `Error polling ${invoice} (attempt ${attempt}):`, error.message);
      if (attempt >= maxCheckAttempts) {
        stopDepositPolling(invoice);
      }
    }
  }, checkIntervalMs);

  activeDepositPollings.set(invoice, intervalId);
}

/**
 * Hentikan polling untuk satu invoice.
 * @param {string} invoice
 */
function stopDepositPolling(invoice) {
  if (activeDepositPollings.has(invoice)) {
    clearInterval(activeDepositPollings.get(invoice));
    activeDepositPollings.delete(invoice);
    logger.info('PremkuPolling', `Polling dihentikan: ${invoice}`);
  }
}

/**
 * Resume polling untuk deposit PENDING saat bot restart.
 * Notifikasi dikirim ke semua admin (karena chat_id asli tidak disimpan
 * secara permanen per-admin, broadcast ke semua admin lebih aman).
 */
async function resumePendingDeposits() {
  try {
    const pending = await premkuRepository.getPendingDeposits();
    logger.info('PremkuPolling', `Melanjutkan polling untuk ${pending.length} deposit PENDING...`);

    for (const deposit of pending) {
      // Gunakan admin_telegram_id yang menginisiasi deposit sebagai chat tujuan
      startDepositPolling(deposit.invoice, deposit.admin_telegram_id);
    }
  } catch (error) {
    logger.error('PremkuPolling', 'Gagal resume pending deposits:', error.message);
  }
}

module.exports = { init, startDepositPolling, stopDepositPolling, resumePendingDeposits };
