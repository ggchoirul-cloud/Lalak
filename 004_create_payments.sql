-- ============================================================
-- Migration 004: Tabel payments
-- Menyimpan detail pembayaran dari respons GoMerchant API,
-- termasuk data QRIS dan jejak status pembayaran.
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    trx_id          VARCHAR(100),          -- trx_id dari response GoMerchant
    ref_id          VARCHAR(100) NOT NULL, -- duplikasi ref_id untuk query cepat
    amount          NUMERIC(12, 2) NOT NULL,
    unique_code     INTEGER,
    total_amount    NUMERIC(12, 2) NOT NULL,
    payment_type    VARCHAR(50) DEFAULT 'qris',
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    qr_string       TEXT,
    qr_image        TEXT,
    paid_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,
    raw_response    JSONB,                 -- simpan response mentah GoMerchant untuk audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref_id ON payments(ref_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
