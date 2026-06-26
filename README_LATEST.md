# 🤖 Telegram Bot Auto Order - Produk Premium Edition

Bot Telegram otomatis yang:
- ✅ Auto-pull produk dari katalog Premku
- ✅ Edit harga via dashboard web atau command
- ✅ Buyer bayar QRIS GoMerchant
- ✅ Akun terkirim otomatis

## ⚡ Quick Start

### 1. Extract & Upload
```bash
telegram-auto-order.zip → extract
Upload isi ke Pterodactyl /home/container/
```

### 2. Isi `.env`
```env
BOT_TOKEN=<telegram_bot_token>
GO_MERCHANT_API_KEY=GO_fW969doYItj
GO_MERCHANT_SECRET=<jika_ada>
PREMKU_API_KEY=<api_key_premku>
DATABASE_URL=postgresql://...
ADMIN_IDS=<telegram_id_admin>
DASHBOARD_PORT=3000
DASHBOARD_TOKEN=admin123
```

### 3. Restart Bot
Di Pterodactyl: Stop → Start

## 🎯 Saat Bot Startup

Bot otomatis:
1. Koneksi database
2. Jalankan migration (setup tabel)
3. **Auto-sync katalog Premku** → insert semua produk
4. Start server dashboard (port 3000)
5. Ready to go!

**Log output:**
```
Connected to database: neondb
Running migrations...
Migration 001 OK
...
Migration 008 OK
AutoSync: Sinkronisasi katalog Premku...
AutoSync: Selesai: +10 produk, duplikat di-skip
Dashboard: Akses: http://localhost:3000/dashboard?token=admin123
Bot is running...
```

## 📱 Cara Pakai (Admin)

### Via Dashboard Web (RECOMMENDED)
```
http://localhost:3000/dashboard?token=admin123
```

Fitur:
- 📊 Lihat statistik (revenue, order, produk)
- 💎 Edit harga produk premium (instant)
- 📦 Lihat semua produk

### Via Command Telegram
```
/editharga <id> <harga_baru>
```

Contoh:
```
/editharga 1 2500
/editharga 2 15000
```

## 🛒 Cara Pakai (Buyer)

### Beli Akun Premium
```
/akunpremium
```

Pilih produk → QRIS GoMerchant muncul → bayar → akun terkirim otomatis

### Lihat Riwayat
```
/historypremium
```

## 🔑 Admin Commands

| Command | Fungsi |
|---|---|
| `/admin` | Panel admin |
| `/editharga <id> <harga>` | Edit harga produk |
| `/editproduk <id> <field> <value>` | Edit produk (generic) |
| `/profilepremku` | Cek saldo modal Premku |
| `/topupsaldo <nominal>` | Isi modal saldo Premku |
| `/orders` | Daftar order terbaru |
| `/statistik` | Statistik penjualan |

## 📊 Struktur Harga

Harga Premku = Harga Asli (dari API Premku)
Harga Jual = Harga kamu yang diset (bisa lebih tinggi)
Margin = Harga Jual - Harga Premku

**Contoh:**
| Produk | Harga Premku | Harga Jual | Margin |
|---|---|---|---|
| AM April | Rp 550 | Rp 2.500 | Rp 1.950 (355%) |
| Capcut 1W | Rp 11.276 | Rp 15.000 | Rp 3.724 (33%) |

## 🔄 Alur Pembelian

```
Buyer /akunpremium
    ↓
Pilih produk
    ↓
QRIS GoMerchant (harga kamu) muncul
    ↓
Buyer bayar via QRIS
    ↓
Sistem auto deteksi pembayaran PAID
    ↓
Order otomatis ke Premku (pakai saldo modal kamu)
    ↓
Polling status Premku sampai akun siap
    ↓
Akun terkirim ke Buyer (otomatis)
```

## 💰 Modal Saldo Premku

Saldo Premku adalah **milik kamu** sebagai modal bisnis.

### Top-up Saldo (Admin Only)
```
/topupsaldo 50000
```

Muncul QRIS → bayar → saldo masuk otomatis dalam 1-2 menit

### Cek Saldo
```
/profilepremku
```

## 🛡️ Keamanan

- **Token dashboard** → ganti `admin123` dengan yang kuat di `.env`
- **Password database** → PostgreSQL Neon sudah aman
- **API keys** → jangan share public
- **Bot token** → private, jangan di-commit ke git

## 🚀 Deploy di Pterodactyl

### File Manager Path
```
/home/container/
├── index.js
├── package.json
├── .env
├── migrations/
├── src/
│   ├── bot/
│   ├── commands/
│   ├── services/
│   ├── database/
│   ├── routes/
│   ├── server/
│   └── ...
```

### Port Configuration
- **Bot Telegram**: Webhook otomatis ke Telegram (tidak butuh port)
- **Dashboard Web**: Port 3000 (ganti di `.env` jika perlu)

### Important `.env` vars
```env
# Wajib isi
BOT_TOKEN=
GO_MERCHANT_API_KEY=GO_fW969doYItj
PREMKU_API_KEY=
DATABASE_URL=

# Rekomendasi isi
ADMIN_IDS=123456789
DASHBOARD_PORT=3000
DASHBOARD_TOKEN=admin123
```

## 📝 File Penting

| File | Fungsi |
|---|---|
| `index.js` | Entry point, init semua service |
| `src/bot/index.js` | Bot command/handler registration |
| `src/services/premkuAutoSyncService.js` | Auto-sync katalog Premku saat startup |
| `src/server/dashboardServer.js` | Dashboard web server |
| `src/routes/dashboard.js` | Dashboard UI & API |
| `src/commands/admin/editharga.js` | Command `/editharga` |
| `migrations/` | Database schema (auto-run) |

## 🐛 Troubleshooting

### Bot tidak muncul di Telegram
- Cek BOT_TOKEN di `.env` (benar?)
- Cek koneksi internet panel
- Restart bot

### Dashboard tidak bisa dibuka
- Cek port 3000 terbuka (firewall)
- Cek token dashboard benar
- Restart bot

### Harga tidak berubah saat edit
- Refresh page dashboard
- Cek console bot ada error?
- Try `/editharga <id> <harga>` via Telegram

### Produk tidak muncul di /akunpremium
- Cek log saat startup (Auto-sync OK?)
- Cek database ada produk (via dashboard)
- Restart bot

## 📞 Support

Error tertentu? Cek:
1. Log console Pterodactyl
2. Database connection (Neon dashboard)
3. API keys (GoMerchant, Premku)
4. `.env` variables

## 📚 Dokumentasi Lengkap

- `DASHBOARD.md` — Panduan dashboard web
- `SETUP_AUTO.md` — Setup otomatis
- `README.md` — Dokumentasi teknis original

---

**Status:** Ready for Production ✅  
**Version:** 2.0 - Dashboard Edition  
**Last Updated:** Juni 2026
