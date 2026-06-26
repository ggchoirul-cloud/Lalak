-- ============================================================
-- Migration 005: Tabel admins
-- Menyimpan daftar admin bot (selain dari ADMIN_IDS di .env,
-- agar admin juga bisa dikelola lewat database / command).
-- ============================================================

CREATE TABLE IF NOT EXISTS admins (
    id              SERIAL PRIMARY KEY,
    telegram_id     BIGINT UNIQUE NOT NULL,
    username        VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_id);

-- ============================================================
-- Seed data produk contoh (boleh dihapus/diedit lewat /admin)
-- ============================================================
INSERT INTO products (nama, deskripsi, harga, kategori, status)
VALUES
    ('Akun Premium 1 Bulan', 'Akses penuh fitur premium selama 1 bulan', 25000, 'premium', 'aktif'),
    ('Akun Premium 1 Tahun', 'Akses penuh fitur premium selama 1 tahun', 250000, 'premium', 'aktif'),
    ('Top Up Saldo 50K', 'Top up saldo aplikasi senilai Rp 50.000', 50000, 'topup', 'aktif')
ON CONFLICT DO NOTHING;
