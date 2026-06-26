-- ============================================================
-- Migration 008: Link tabel products ke produk Premku
--
-- Mengubah model bisnis akun premium: buyer sekarang bayar
-- QRIS GoMerchant dengan harga yang diset admin (bukan harga
-- asli Premku), baru setelah lunas sistem order ke Premku
-- menggunakan saldo admin sebagai modal.
--
-- premku_product_id menghubungkan produk lokal ke ID produk
-- di sistem Premku, agar saat order dibuat sistem tahu produk
-- mana yang harus dipesan ke Premku.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS premku_product_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_premku_product BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_premku_product_id ON products(premku_product_id);

-- ============================================================
-- Tambahkan kolom tracking di tabel orders untuk order yang
-- berasal dari pembelian akun premium (perlu order lanjutan
-- ke Premku setelah QRIS GoMerchant lunas).
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS premku_invoice VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS premku_accounts JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS premku_order_status VARCHAR(20);
