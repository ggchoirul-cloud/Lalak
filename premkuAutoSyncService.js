/**
 * Auto-sinkronisasi produk dari API Premku ke database lokal
 * saat bot startup. Sekali jalan, produk baru ditambahkan, duplikat
 * diabaikan, selesai. Tidak perlu command manual.
 */

'use strict';

const premkuService = require('./premkuService');
const productRepository = require('../database/productRepository');
const logger = require('../utils/logger');

async function autoSyncPremku() {
  try {
    logger.info('AutoSync', 'Sinkronisasi katalog Premku...');
    const result = await premkuService.getProducts();

    if (!result?.success || !result.products) {
      logger.warn('AutoSync', 'Katalog Premku kosong atau error');
      return;
    }

    const allLocal = await productRepository.getAllProducts();
    const existingIds = new Set(allLocal.map(p => p.premku_product_id).filter(Boolean));

    let added = 0;
    for (const p of result.products) {
      if (!existingIds.has(p.id)) {
        try {
          await productRepository.createProduct({
            nama: p.name,
            deskripsi: `Stok: ${p.stock}`,
            harga: p.price,
            kategori: 'akun-premium',
            premkuProductId: p.id,
            isPremkuProduct: true,
          });
          added++;
        } catch (e) {
          logger.warn('AutoSync', `Gagal insert ${p.id}: ${e.message}`);
        }
      }
    }

    logger.success('AutoSync', `Selesai: +${added} produk, duplikat di-skip`);
  } catch (error) {
    logger.error('AutoSync', error.message);
  }
}

module.exports = { autoSyncPremku };
