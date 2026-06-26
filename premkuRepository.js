/**
 * src/database/premkuRepository.js
 * ============================================================
 * Query layer untuk tabel `premku_orders` dan `premku_deposits`.
 * ============================================================
 */

'use strict';

const { query } = require('./pool');

// ---------------------------------------------------------------
// premku_orders
// ---------------------------------------------------------------

/**
 * Simpan riwayat pembelian akun premium.
 * @param {object} data
 */
async function createPremkuOrder(data) {
  const result = await query(
    `INSERT INTO premku_orders
      (ref_id, user_id, premku_product_id, product_nama, qty, price, total,
       status, invoice, accounts, balance_before, balance_after, raw_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.refId,
      data.userId,
      data.premkuProductId,
      data.productNama || 'Unknown',
      data.qty ?? 1,
      data.price ?? 0,
      data.total ?? 0,
      data.status || 'SUCCESS',
      data.invoice || null,
      data.accounts ? JSON.stringify(data.accounts) : null,
      data.balanceBefore ?? null,
      data.balanceAfter ?? null,
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Update status & data akun setelah polling status order selesai.
 * @param {string} refId
 * @param {string} status - SUCCESS | FAILED
 * @param {Array|null} accounts
 */
async function updatePremkuOrderStatus(refId, status, accounts) {
  const result = await query(
    `UPDATE premku_orders SET status = $1, accounts = $2 WHERE ref_id = $3 RETURNING *`,
    [status, accounts ? JSON.stringify(accounts) : null, refId]
  );
  return result.rows[0] || null;
}

/**
 * Riwayat pembelian akun premium milik satu user.
 * @param {number} userId
 * @param {number} limit
 */
async function getPremkuOrdersByUser(userId, limit = 10) {
  const result = await query(
    `SELECT * FROM premku_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------
// premku_deposits
// ---------------------------------------------------------------

/**
 * Simpan permintaan deposit baru (status pending).
 * @param {object} data
 */
async function createDeposit(data) {
  const result = await query(
    `INSERT INTO premku_deposits
      (invoice, admin_telegram_id, amount_req, kode_unik, total_bayar, qr_image, qr_raw, raw_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.invoice,
      data.adminTelegramId,
      data.amountReq,
      data.kodeUnik ?? null,
      data.totalBayar,
      data.qrImage || null,
      data.qrRaw || null,
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Update status deposit (saat polling /pay_status).
 * @param {string} invoice
 * @param {string} status - pending | success | canceled | expired
 */
async function updateDepositStatus(invoice, status) {
  const result = await query(
    `UPDATE premku_deposits SET status = $1, updated_at = NOW() WHERE invoice = $2 RETURNING *`,
    [status, invoice]
  );
  return result.rows[0] || null;
}

/**
 * Cari deposit berdasarkan invoice.
 * @param {string} invoice
 */
async function findDepositByInvoice(invoice) {
  const result = await query('SELECT * FROM premku_deposits WHERE invoice = $1', [invoice]);
  return result.rows[0] || null;
}

/**
 * Ambil semua deposit PENDING (untuk resume polling saat bot restart).
 */
async function getPendingDeposits() {
  const result = await query(`SELECT * FROM premku_deposits WHERE status = 'pending'`);
  return result.rows;
}

module.exports = {
  createPremkuOrder,
  updatePremkuOrderStatus,
  getPremkuOrdersByUser,
  createDeposit,
  updateDepositStatus,
  findDepositByInvoice,
  getPendingDeposits,
};
