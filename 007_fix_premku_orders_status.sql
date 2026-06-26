-- ============================================================
-- Migration 007: Fix constraint status pada premku_orders
-- Order Premku bersifat ASYNC (status awal "Pending" sebelum
-- diketahui hasil akhirnya), jadi constraint perlu mendukung
-- nilai PENDING selain SUCCESS dan FAILED.
-- ============================================================

ALTER TABLE premku_orders DROP CONSTRAINT IF EXISTS premku_orders_status_check;

ALTER TABLE premku_orders ADD CONSTRAINT premku_orders_status_check
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'));

ALTER TABLE premku_orders ALTER COLUMN status SET DEFAULT 'PENDING';
