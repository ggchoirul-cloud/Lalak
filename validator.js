/**
 * src/utils/validator.js
 * ============================================================
 * Fungsi validasi input dari user (command arguments).
 * ============================================================
 */

'use strict';

/**
 * Validasi nominal harga (untuk /addproduk dsb).
 * @param {string} input
 * @returns {{ valid: boolean, value: number|null, error: string|null }}
 */
function validateHarga(input) {
  const cleaned = String(input).replace(/[.,]/g, '');
  const value = parseInt(cleaned, 10);

  if (isNaN(value) || value <= 0) {
    return { valid: false, value: null, error: 'Harga harus berupa angka positif.' };
  }
  if (value < 500) {
    return { valid: false, value: null, error: 'Harga minimal Rp 500.' };
  }
  if (value > 50000000) {
    return { valid: false, value: null, error: 'Harga maksimal Rp 50.000.000.' };
  }
  return { valid: true, value, error: null };
}

/**
 * Validasi nominal deposit/top up saldo (tanpa batas minimal,
 * hanya harus berupa angka positif dan di bawah batas maksimal).
 * @param {string} input
 * @returns {{ valid: boolean, value: number|null, error: string|null }}
 */
function validateDepositAmount(input) {
  const cleaned = String(input).replace(/[.,]/g, '');
  const value = parseInt(cleaned, 10);

  if (isNaN(value) || value <= 0) {
    return { valid: false, value: null, error: 'Nominal harus berupa angka positif.' };
  }
  if (value > 50000000) {
    return { valid: false, value: null, error: 'Nominal top up maksimal Rp 50.000.000.' };
  }
  return { valid: true, value, error: null };
}

/**
 * Validasi ID produk/order (harus angka positif).
 * @param {string} input
 * @returns {{ valid: boolean, value: number|null }}
 */
function validateId(input) {
  const value = parseInt(input, 10);
  if (isNaN(value) || value <= 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

/**
 * Validasi teks tidak kosong dan tidak terlalu panjang.
 * @param {string} input
 * @param {number} maxLength
 */
function validateText(input, maxLength = 255) {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Teks tidak boleh kosong.' };
  }
  if (input.length > maxLength) {
    return { valid: false, error: `Teks maksimal ${maxLength} karakter.` };
  }
  return { valid: true, error: null };
}

module.exports = { validateHarga, validateDepositAmount, validateId, validateText };
