-- ============================================================
-- Migration 002: Tabel products
-- Menyimpan daftar produk yang bisa dipesan user.
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    nama            VARCHAR(255) NOT NULL,
    deskripsi       TEXT,
    harga           NUMERIC(12, 2) NOT NULL CHECK (harga > 0),
    kategori        VARCHAR(100) DEFAULT 'umum',
    status          VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_kategori ON products(kategori);
