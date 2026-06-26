-- ============================================================
-- Migration 006: Tabel premku_orders
-- Menyimpan riwayat pembelian akun premium dari Premku API.
-- Berbeda dari tabel `orders` (GoMerchant) karena alurnya langsung
-- potong saldo Premku, tanpa QRIS per transaksi.
-- ============================================================

CREATE TABLE IF NOT EXISTS premku_orders (
    id                  SERIAL PRIMARY KEY,
    ref_id              VARCHAR(100) UNIQUE NOT NULL,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    premku_product_id   INTEGER NOT NULL,         -- product_id dari Premku, bukan tabel products lokal
    product_nama        VARCHAR(255) NOT NULL,
    qty                 INTEGER NOT NULL DEFAULT 1,
    price               NUMERIC(12, 2) NOT NULL,
    total               NUMERIC(12, 2) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    invoice             VARCHAR(150),              -- invoice dari response Premku
    accounts            JSONB,                     -- daftar akun (username/password) yang didapat
    balance_before      NUMERIC(12, 2),
    balance_after       NUMERIC(12, 2),
    raw_response        JSONB,                     -- simpan response mentah untuk audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premku_orders_ref_id ON premku_orders(ref_id);
CREATE INDEX IF NOT EXISTS idx_premku_orders_user_id ON premku_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_premku_orders_created_at ON premku_orders(created_at DESC);

-- ============================================================
-- Tabel premku_deposits — riwayat deposit saldo ke akun Premku
-- ============================================================
CREATE TABLE IF NOT EXISTS premku_deposits (
    id              SERIAL PRIMARY KEY,
    invoice         VARCHAR(150) UNIQUE NOT NULL,
    admin_telegram_id   BIGINT NOT NULL,   -- admin yang melakukan deposit
    amount_req      NUMERIC(12, 2) NOT NULL,
    kode_unik       INTEGER,
    total_bayar     NUMERIC(12, 2) NOT NULL,
    qr_image        TEXT,
    qr_raw          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'success', 'canceled', 'expired')),
    raw_response    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premku_deposits_invoice ON premku_deposits(invoice);
CREATE INDEX IF NOT EXISTS idx_premku_deposits_status ON premku_deposits(status);
