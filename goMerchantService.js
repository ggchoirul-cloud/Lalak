/**
 * src/services/goMerchantService.js
 * ============================================================
 * Service layer untuk komunikasi dengan GoMerchant API.
 * Field request/response sudah sesuai dokumentasi resmi:
 *
 * POST /profile  -> { apikey }
 * POST /order    -> { apikey, nama_project, ref_id, amount, customer_name, expired }
 * POST /status   -> { apikey, ref_id }
 * ============================================================
 */

'use strict';

const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const apiClient = axios.create({
  baseURL: config.goMerchant.baseURL,
  timeout: config.goMerchant.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log setiap request keluar (sembunyikan apikey)
apiClient.interceptors.request.use((reqConfig) => {
  const logBody = { ...reqConfig.data };
  if (logBody.apikey) logBody.apikey = '***HIDDEN***';
  logger.info('GoMerchant', `--> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`, JSON.stringify(logBody));
  return reqConfig;
});

// Log setiap response masuk
apiClient.interceptors.response.use(
  (response) => {
    logger.info('GoMerchant', `<-- Status ${response.status}:`, JSON.stringify(response.data));
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error('GoMerchant', `<-- Status ${error.response.status}:`, JSON.stringify(error.response.data));
    } else if (error.code === 'ECONNABORTED') {
      logger.error('GoMerchant', 'Request timeout');
    } else {
      logger.error('GoMerchant', 'Network error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Konversi error axios menjadi pesan yang ramah ditampilkan ke user.
 */
function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    if (status === 401) throw new Error('API Key GoMerchant tidak valid.');
    if (status === 400) throw new Error(`Request Error: ${data?.message || 'Request tidak valid.'}`);
    if (status >= 500) throw new Error('Server GoMerchant sedang bermasalah. Coba lagi nanti.');
    throw new Error(`API Error: ${data?.message || `HTTP ${status}`}`);
  }
  if (error.code === 'ECONNABORTED') throw new Error('Koneksi timeout ke GoMerchant.');
  throw new Error(`Network Error: ${error.message}`);
}

/**
 * Ambil profil merchant.
 * @returns {Promise<object>} { status, data: { name, email, role, plan, usage, limit } }
 */
async function getProfile() {
  try {
    const response = await apiClient.post(config.goMerchant.endpoints.profile, {
      apikey: config.goMerchant.apiKey,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Buat order/transaksi QRIS baru di GoMerchant.
 *
 * @param {object} params
 * @param {number} params.amount - Nominal pembayaran
 * @param {string} params.refId - Referensi unik order (dari sistem kita)
 * @param {string} params.customerName - Nama pembeli
 * @param {number} [params.expiredMinutes] - Lama waktu sebelum QRIS expired
 * @returns {Promise<object>} Response GoMerchant lengkap dengan payment_detail
 */
async function createOrder({ amount, refId, customerName, expiredMinutes }) {
  try {
    const response = await apiClient.post(config.goMerchant.endpoints.order, {
      apikey: config.goMerchant.apiKey,
      nama_project: config.goMerchant.project,
      ref_id: refId,
      amount: amount,
      customer_name: customerName || 'Telegram User',
      expired: expiredMinutes || config.payment.orderExpiredMinutes,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Cek status pembayaran berdasarkan ref_id.
 * @param {string} refId
 * @returns {Promise<object>} { status, data: { trx_id, ref_id, payment_status, paid_at, ... } }
 */
async function checkStatus(refId) {
  try {
    const response = await apiClient.post(config.goMerchant.endpoints.status, {
      apikey: config.goMerchant.apiKey,
      ref_id: refId,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { getProfile, createOrder, checkStatus };
