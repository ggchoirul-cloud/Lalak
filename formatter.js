/**
 * src/utils/formatter.js
 * ============================================================
 * Kumpulan fungsi formatting untuk tampilan teks bot.
 * ============================================================
 */

'use strict';

/**
 * Format angka menjadi mata uang Rupiah.
 * @param {number|string} amount
 * @returns {string} Contoh: "Rp 50.000"
 */
function formatRupiah(amount) {
  if (amount === undefined || amount === null) return 'N/A';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Format tanggal ke waktu Indonesia (WIB).
 * @param {string|Date} dateInput
 * @returns {string}
 */
function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    return new Date(dateInput).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';
  } catch {
    return String(dateInput);
  }
}

/**
 * Generate ref_id unik untuk order baru.
 * Format: ORD-<timestamp>-<random5char>
 * @returns {string}
 */
function generateRefId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Konversi label status ke emoji + teks ramah baca.
 * @param {string} status
 * @returns {string}
 */
function getStatusLabel(status) {
  switch ((status || '').toUpperCase()) {
    case 'PAID':      return '✅ Lunas';
    case 'PENDING':   return '⏳ Menunggu Pembayaran';
    case 'EXPIRED':   return '⏰ Kadaluarsa';
    case 'CANCELLED': return '❌ Dibatalkan';
    default:          return `📋 ${status || 'Unknown'}`;
  }
}

/**
 * Escape karakter spesial MarkdownV2 Telegram.
 * Dipakai jika perlu kirim teks bebas dengan parse_mode MarkdownV2.
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

module.exports = { formatRupiah, formatDate, generateRefId, getStatusLabel, escapeMarkdown };
