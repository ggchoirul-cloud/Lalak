/**
 * src/database/paymentRepository.js
 * ============================================================
 * Query layer untuk tabel `payments`.
 * Menyimpan detail respons GoMerchant agar bisa diaudit nanti.
 * ============================================================
 */

'use strict';

const { query } = require('./pool');

/**
 * Simpan data payment hasil dari createOrder() GoMerchant.
 * @param {object} data
 */
async function createPayment(data) {
  const result = await query(
    `INSERT INTO payments
      (order_id, trx_id, ref_id, amount, unique_code, total_amount,
       payment_type, payment_status, qr_string, qr_image, expires_at, raw_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.orderId,
      data.trxId,
      data.refId,
      data.amount,
      data.uniqueCode,
      data.totalAmount,
      data.paymentType || 'qris',
      data.paymentStatus || 'pending',
      data.qrString || null,
      data.qrImage || null,
      data.expiresAt,
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Update status payment berdasarkan ref_id (dipanggil saat polling).
 * @param {string} refId
 * @param {string} status
 * @param {Date|null} paidAt
 */
async function updatePaymentStatus(refId, status, paidAt = null) {
  const result = await query(
    `UPDATE payments SET payment_status = $1, paid_at = $2, updated_at = NOW()
     WHERE ref_id = $3 RETURNING *`,
    [status, paidAt, refId]
  );
  return result.rows[0] || null;
}

/**
 * Cari payment berdasarkan ref_id.
 * @param {string} refId
 */
async function findByRefId(refId) {
  const result = await query('SELECT * FROM payments WHERE ref_id = $1', [refId]);
  return result.rows[0] || null;
}

/**
 * Riwayat pembayaran sukses (untuk laporan/admin).
 * @param {number} limit
 */
async function getPaidPayments(limit = 50) {
  const result = await query(
    `SELECT * FROM payments WHERE payment_status = 'paid' ORDER BY paid_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { createPayment, updatePaymentStatus, findByRefId, getPaidPayments };
