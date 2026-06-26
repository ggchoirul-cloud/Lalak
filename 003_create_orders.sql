-- ============================================================
-- Migration 003: Tabel orders
-- Menyimpan setiap order yang dibuat user.
-- ref_id digunakan sebagai referensi unik ke GoMerchant API.
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    ref_id          VARCHAR(100) UNIQUE NOT NULL,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_nama    VARCHAR(255) NOT NULL,  -- snapshot nama produk saat order dibuat
    harga           NUMERIC(12, 2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
    invoice_message_id     BIGINT,   -- message_id pesan invoice di Telegram (untuk dihapus nanti)
    qris_message_id        BIGINT,   -- message_id pesan foto QRIS di Telegram
    chat_id                 BIGINT,   -- chat_id tujuan notifikasi
    expired_at      TIMESTAMPTZ NOT NULL,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_ref_id ON orders(ref_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
