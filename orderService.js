/**
 * src/services/orderService.js
 * ============================================================
 * Orkestrasi proses pembuatan order:
 * 1. Generate ref_id unik
 * 2. Simpan order ke database (status PENDING)
 * 3. Panggil GoMerchant untuk buat QRIS
 * 4. Simpan detail payment ke database
 *
 * Jika langkah GoMerchant gagal, order di database ditandai
 * CANCELLED agar tidak menggantung sebagai PENDING palsu.
 * ============================================================
 */

'use strict';

const goMerchantService = require('./goMerchantService');
const orderRepository = require('../database/orderRepository');
const paymentRepository = require('../database/paymentRepository');
const config = require('../config/config');
const logger = require('../utils/logger');
const { generateRefId } = require('../utils/formatter');

/**
 * Buat order baru lengkap dengan QRIS dari GoMerchant.
 *
 * @param {object} params
 * @param {object} params.user - Row user dari database (harus punya .id)
 * @param {object} params.product - Row product dari database
 * @param {number} params.chatId - Telegram chat_id tujuan notifikasi
 * @param {string} params.customerName - Nama tampilan customer
 * @returns {Promise<{ order: object, payment: object, goMerchantData: object }>}
 */
async function createOrderWithPayment({ user, product, chatId, customerName }) {
  const refId = generateRefId();
  const expiredAt = new Date(Date.now() + config.payment.orderExpiredMinutes * 60 * 1000);

  // 1. Simpan order PENDING ke database
  const order = await orderRepository.createOrder({
    refId,
    userId: user.id,
    productId: product.id,
    productNama: product.nama,
    harga: product.harga,
    expiredAt,
    chatId,
  });

  logger.info('OrderService', `Order dibuat: ${refId} untuk produk "${product.nama}"`);

  try {
    // 2. Buat QRIS via GoMerchant
    const result = await goMerchantService.createOrder({
      amount: parseFloat(product.harga),
      refId,
      customerName,
      expiredMinutes: config.payment.orderExpiredMinutes,
    });

    if (!result || result.status !== 'success') {
      throw new Error(result?.message || 'GoMerchant gagal membuat transaksi.');
    }

    const d = result.data;

    // 3. Simpan detail payment ke database
    const payment = await paymentRepository.createPayment({
      orderId: order.id,
      trxId: d.trx_id,
      refId: d.ref_id,
      amount: d.amount,
      uniqueCode: d.unique_code,
      totalAmount: d.total_amount,
      paymentType: d.payment_type,
      paymentStatus: d.payment_status,
      qrString: d.payment_detail?.qr_string,
      qrImage: d.payment_detail?.qr_image,
      expiresAt: d.expires_at,
      rawResponse: result,
    });

    logger.success('OrderService', `QRIS berhasil dibuat untuk order: ${refId}`);

    return { order, payment, goMerchantData: d };

  } catch (error) {
    // Jika gagal buat QRIS, batalkan order agar tidak menggantung
    logger.error('OrderService', `Gagal buat QRIS untuk ${refId}:`, error.message);
    await orderRepository.updateStatus(refId, 'CANCELLED');
    throw error;
  }
}

module.exports = { createOrderWithPayment };
