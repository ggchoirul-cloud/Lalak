/**
 * src/database/productRepository.js
 * ============================================================
 * Query layer untuk tabel `products`.
 * ============================================================
 */

'use strict';

const { query } = require('./pool');

/**
 * Ambil semua produk dengan status 'aktif' (untuk ditampilkan ke user).
 */
async function getActiveProducts() {
  const result = await query(
    `SELECT * FROM products WHERE status = 'aktif' ORDER BY kategori, harga ASC`
  );
  return result.rows;
}

/**
 * Ambil semua produk termasuk yang nonaktif (untuk admin).
 */
async function getAllProducts() {
  const result = await query('SELECT * FROM products ORDER BY id DESC');
  return result.rows;
}

/**
 * Ambil satu produk berdasarkan ID.
 * @param {number} id
 */
async function getProductById(id) {
  const result = await query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Tambah produk baru.
 * @param {object} data - { nama, deskripsi, harga, kategori, premkuProductId, isPremkuProduct }
 */
async function createProduct(data) {
  const result = await query(
    `INSERT INTO products (nama, deskripsi, harga, kategori, premku_product_id, is_premku_product)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.nama,
      data.deskripsi || null,
      data.harga,
      data.kategori || 'umum',
      data.premkuProductId ?? null,
      data.isPremkuProduct ?? false,
    ]
  );
  return result.rows[0];
}

/**
 * Ambil semua produk yang terhubung ke Premku (is_premku_product = true)
 * dan masih aktif — untuk ditampilkan di /akunpremium.
 */
async function getActivePremkuLinkedProducts() {
  const result = await query(
    `SELECT * FROM products WHERE status = 'aktif' AND is_premku_product = TRUE
     ORDER BY harga ASC`
  );
  return result.rows;
}

/**
 * Update produk.
 * @param {number} id
 * @param {object} data - field yang ingin diupdate
 */
async function updateProduct(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Hapus produk (hard delete).
 * @param {number} id
 */
async function deleteProduct(id) {
  const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = {
  getActiveProducts,
  getActivePremkuLinkedProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
