/**
 * src/database/orderRepository.js
 * ============================================================
 * Query layer untuk tabel `orders`.
 * ============================================================
 */

'use strict';

const { query } = require('./pool');

/**
 * Buat order baru dengan status PENDING.
 * @param {object} data
 */
async function createOrder(data) {
  const result = await query(
    `INSERT INTO orders (ref_id, user_id, product_id, product_nama, harga, expired_at, chat_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.refId,
      data.userId,
      data.productId,
      data.productNama,
      data.harga,
      data.expiredAt,
      data.chatId,
    ]
  );
  return result.rows[0];
}

/**
 * Cari order berdasarkan ref_id.
 * @param {string} refId
 */
async function findByRefId(refId) {
  const result = await query('SELECT * FROM orders WHERE ref_id = $1', [refId]);
  return result.rows[0] || null;
}

/**
 * Update message_id invoice & QRIS setelah dikirim ke Telegram.
 * @param {string} refId
 * @param {number} invoiceMsgId
 * @param {number|null} qrisMsgId
 */
async function updateMessageIds(refId, invoiceMsgId, qrisMsgId) {
  await query(
    `UPDATE orders SET invoice_message_id = $1, qris_message_id = $2, updated_at = NOW()
     WHERE ref_id = $3`,
    [invoiceMsgId, qrisMsgId, refId]
  );
}

/**
 * Update status order.
 * @param {string} refId
 * @param {string} status - PENDING | PAID | EXPIRED | CANCELLED
 */
async function updateStatus(refId, status) {
  const paidAtClause = status === 'PAID' ? ', paid_at = NOW()' : '';
  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW()${paidAtClause} WHERE ref_id = $2 RETURNING *`,
    [status, refId]
  );
  return result.rows[0] || null;
}

/**
 * Ambil semua order milik satu user (untuk /history).
 * @param {number} userId
 * @param {number} limit
 */
async function getOrdersByUser(userId, limit = 10) {
  const result = await query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Ambil semua order PENDING yang belum expired (untuk re-attach polling
 * setelah bot restart).
 */
async function getPendingOrders() {
  const result = await query(
    `SELECT * FROM orders WHERE status = 'PENDING' AND expired_at > NOW() ORDER BY created_at ASC`
  );
  return result.rows;
}

/**
 * Ambil order PENDING yang sudah lewat expired_at (untuk auto-expire job).
 */
async function getExpiredPendingOrders() {
  const result = await query(
    `SELECT * FROM orders WHERE status = 'PENDING' AND expired_at <= NOW()`
  );
  return result.rows;
}

/**
 * Ambil daftar order untuk admin, dengan filter status opsional.
 * @param {string|null} status
 * @param {number} limit
 */
async function getAllOrders(status = null, limit = 20) {
  if (status) {
    const result = await query(
      `SELECT o.*, u.username, u.first_name FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.status = $1 ORDER BY o.created_at DESC LIMIT $2`,
      [status, limit]
    );
    return result.rows;
  }
  const result = await query(
    `SELECT o.*, u.username, u.first_name FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Statistik ringkas order (untuk /statistik).
 */
async function getOrderStats() {
  const result = await query(`
    SELECT
      COUNT(*) AS total_order,
      COUNT(*) FILTER (WHERE status = 'PAID') AS total_paid,
      COUNT(*) FILTER (WHERE status = 'PENDING') AS total_pending,
      COUNT(*) FILTER (WHERE status = 'EXPIRED') AS total_expired,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS total_cancelled,
      COALESCE(SUM(harga) FILTER (WHERE status = 'PAID'), 0) AS total_revenue
    FROM orders
  `);
  return result.rows[0];
}

/**
 * Update data hasil order lanjutan ke Premku setelah QRIS GoMerchant lunas.
 * @param {string} refId
 * @param {object} data - { premkuInvoice, premkuOrderStatus, premkuAccounts }
 */
async function updatePremkuOrderData(refId, data) {
  const result = await query(
    `UPDATE orders SET premku_invoice = $1, premku_order_status = $2, premku_accounts = $3, updated_at = NOW()
     WHERE ref_id = $4 RETURNING *`,
    [
      data.premkuInvoice ?? null,
      data.premkuOrderStatus ?? null,
      data.premkuAccounts ? JSON.stringify(data.premkuAccounts) : null,
      refId,
    ]
  );
  return result.rows[0] || null;
}

/**
 * Riwayat order akun premium (produk yang is_premku_product = true)
 * milik satu user — dipakai untuk /historypremium.
 * @param {number} userId
 * @param {number} limit
 */
async function getPremiumOrdersByUser(userId, limit = 10) {
  const result = await query(
    `SELECT o.* FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.user_id = $1 AND p.is_premku_product = TRUE
     ORDER BY o.created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

module.exports = {
  createOrder,
  findByRefId,
  updateMessageIds,
  updateStatus,
  getOrdersByUser,
  getPendingOrders,
  getExpiredPendingOrders,
  getAllOrders,
  getOrderStats,
  updatePremkuOrderData,
  getPremiumOrdersByUser,
};
