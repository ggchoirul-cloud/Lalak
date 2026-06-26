-- ============================================================
-- Migration 001: Tabel users
-- Menyimpan data setiap user yang berinteraksi dengan bot.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    telegram_id     BIGINT UNIQUE NOT NULL,
    username        VARCHAR(255),
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian cepat berdasarkan telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
