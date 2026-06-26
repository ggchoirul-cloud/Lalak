/**
 * src/config/config.js
 * ============================================================
 * Konfigurasi terpusat aplikasi.
 * Membaca dan memvalidasi seluruh environment variable di sini
 * agar startup gagal cepat (fail-fast) jika ada yang kosong.
 * ============================================================
 */

'use strict';

require('dotenv').config();

// ============================================================
// Daftar environment variable WAJIB
// ============================================================
const REQUIRED_ENV = ['BOT_TOKEN', 'GO_MERCHANT_API_KEY', 'DATABASE_URL'];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('[CONFIG] ERROR: Environment variable berikut wajib diisi di .env:');
  missing.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

// ============================================================
// Parse daftar admin ID dari string "123,456" -> [123, 456]
// ============================================================
function parseAdminIds(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));
}

const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN,
  adminIds: parseAdminIds(process.env.ADMIN_IDS),

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // GoMerchant API
  goMerchant: {
    baseURL: 'https://api.gomerchant.biz.id',
    apiKey: process.env.GO_MERCHANT_API_KEY,
    secret: process.env.GO_MERCHANT_SECRET || null,
    // TODO: Sesuaikan nama_project dengan nama yang terdaftar di dashboard GoMerchant
    project: process.env.GO_MERCHANT_PROJECT || 'Avianto',
    timeout: 10000,
    endpoints: {
      profile: '/profile',
      order: '/order',
      status: '/status',
    },
  },

  // Premku API (penyedia akun premium digital — Capcut, Netflix, dll)
  premku: {
    baseURL: 'https://premku.com/api',
    apiKey: process.env.PREMKU_API_KEY,
    timeout: 10000,
  },

  // Perilaku bot
  payment: {
    checkIntervalMs: parseInt(process.env.PAYMENT_CHECK_INTERVAL, 10) || 10000,
    maxCheckAttempts: 90, // 90 x 10s = 15 menit maksimum polling
    orderExpiredMinutes: parseInt(process.env.ORDER_EXPIRED_MINUTES, 10) || 15,
  },
};

// ============================================================
// Validasi tambahan: admin IDs sebaiknya tidak kosong
// ============================================================
if (config.adminIds.length === 0) {
  console.warn('[CONFIG] WARNING: ADMIN_IDS kosong. Command /admin tidak bisa diakses siapapun.');
}

if (!config.premku.apiKey) {
  console.warn('[CONFIG] WARNING: PREMKU_API_KEY kosong. Command /akunpremium akan dinonaktifkan.');
}

module.exports = config;
