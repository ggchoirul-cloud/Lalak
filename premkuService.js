/**
 * src/services/premkuService.js
 * ============================================================
 * Service layer untuk API Premku (penyedia akun premium digital
 * seperti Capcut Pro, Netflix, Alight Motion, dll).
 *
 * Base URL: https://premku.com/api/
 * Autentikasi: api_key di body JSON setiap request.
 *
 * Endpoint yang digunakan:
 * - POST /profile      -> cek saldo & info akun Premku
 * - POST /products     -> daftar produk tersedia
 * - POST /stock        -> cek stok satu produk
 * - POST /order        -> buat order baru (ASYNC — status awal "Pending",
 *                         TIDAK langsung mengembalikan akun)
 * - POST /status       -> cek status ORDER, kembalikan accounts jika sudah "success"
 * - POST /pay          -> generate QRIS untuk deposit saldo
 * - POST /pay_status   -> cek status DEPOSIT (bukan order!)
 * - POST /cancel_pay   -> batalkan deposit pending
 * ============================================================
 */

'use strict';

const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const apiClient = axios.create({
  baseURL: config.premku.baseURL,
  timeout: config.premku.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log request keluar (sembunyikan api_key)
apiClient.interceptors.request.use((reqConfig) => {
  const logBody = { ...reqConfig.data };
  if (logBody.api_key) logBody.api_key = '***HIDDEN***';
  logger.info('Premku', `--> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`, JSON.stringify(logBody));
  return reqConfig;
});

// Log response masuk
apiClient.interceptors.response.use(
  (response) => {
    logger.info('Premku', `<-- Status ${response.status}:`, JSON.stringify(response.data));
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error('Premku', `<-- Status ${error.response.status}:`, JSON.stringify(error.response.data));
    } else if (error.code === 'ECONNABORTED') {
      logger.error('Premku', 'Request timeout');
    } else {
      logger.error('Premku', 'Network error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Konversi error axios menjadi pesan ramah.
 * Premku selalu balas 200 dengan { success: false, message } untuk
 * error bisnis (saldo kurang, stok habis), jadi ini hanya menangani
 * error transport/HTTP murni.
 */
function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    if (status === 401) throw new Error('API Key Premku tidak valid.');
    throw new Error(`Premku API Error: ${data?.message || `HTTP ${status}`}`);
  }
  if (error.code === 'ECONNABORTED') throw new Error('Koneksi timeout ke Premku.');
  throw new Error(`Network Error: ${error.message}`);
}

/**
 * Cek profil & saldo akun Premku.
 * @returns {Promise<object>} { success, data: { username, whatsapp, saldo, registered_at } }
 */
async function getProfile() {
  try {
    const response = await apiClient.post('/profile', {
      api_key: config.premku.apiKey,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Ambil daftar seluruh produk yang dijual Premku.
 * @returns {Promise<object>} { success, products: [{ id, name, description, price, status, stock, image }] }
 */
async function getProducts() {
  try {
    const response = await apiClient.post('/products', {
      api_key: config.premku.apiKey,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Cek stok satu produk spesifik.
 * @param {number} productId
 * @returns {Promise<object>} { success, product, stock }
 */
async function checkStock(productId) {
  try {
    const response = await apiClient.post('/stock', {
      api_key: config.premku.apiKey,
      product_id: productId,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Buat order baru. PENTING: ini ASYNC — order langsung memotong saldo
 * dan masuk status "Pending" di sisi Premku, TAPI response ini TIDAK
 * berisi akun. Akun baru muncul setelah dicek lewat checkOrderStatus()
 * ketika status sudah berubah jadi "success".
 *
 * Idempotent berdasarkan ref_id — aman dipanggil ulang dengan ref_id sama
 * jika terjadi retry akibat network error.
 *
 * @param {object} params
 * @param {number} params.productId
 * @param {number} params.qty
 * @param {string} params.refId - ID transaksi unik dari sistem kita
 * @returns {Promise<object>} { success, message, invoice, product, qty, price, total, balance_before, balance_after }
 */
async function createOrder({ productId, qty, refId }) {
  try {
    const response = await apiClient.post('/order', {
      api_key: config.premku.apiKey,
      product_id: productId,
      qty,
      ref_id: refId,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Cek status ORDER berdasarkan invoice (BUKAN status deposit).
 * Jika status sudah "success", response berisi field `accounts`
 * dengan daftar username/password yang dibeli.
 *
 * @param {string} invoice - invoice dari response createOrder()
 * @returns {Promise<object>} { success, invoice, status, product, accounts? }
 */
async function checkOrderStatus(invoice) {
  try {
    const response = await apiClient.post('/status', {
      api_key: config.premku.apiKey,
      invoice,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Generate QRIS untuk deposit saldo ke akun Premku.
 * @param {number} amount
 * @returns {Promise<object>} { success, message, data: { invoice, amount_req, kode_unik, total_bayar, qr_image, qr_raw, expired_in } }
 */
async function createDeposit(amount) {
  try {
    const response = await apiClient.post('/pay', {
      api_key: config.premku.apiKey,
      amount,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Cek status deposit berdasarkan invoice.
 * @param {string} invoice
 * @returns {Promise<object>} { success, message, data: { invoice, status, total_bayar, qr_raw } }
 */
async function checkDepositStatus(invoice) {
  try {
    const response = await apiClient.post('/pay_status', {
      api_key: config.premku.apiKey,
      invoice,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Batalkan deposit yang masih pending.
 * @param {string} invoice
 * @returns {Promise<object>} { success, message, data: { invoice, status_old, status_new } }
 */
async function cancelDeposit(invoice) {
  try {
    const response = await apiClient.post('/cancel_pay', {
      api_key: config.premku.apiKey,
      invoice,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = {
  getProfile,
  getProducts,
  checkStock,
  createOrder,
  checkOrderStatus,
  createDeposit,
  checkDepositStatus,
  cancelDeposit,
};
