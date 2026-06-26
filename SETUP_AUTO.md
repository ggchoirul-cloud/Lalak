# ⚡ Setup Auto - Produk Otomatis dari Premku

## Cara Kerja

**Bot Startup:**
1. Koneksi ke database ✓
2. Jalankan migration ✓
3. **AUTO-PULL katalog Premku** → insert ke database
4. Bot siap jalan

**Buyer:**
- `/akunpremium` → lihat semua produk dari Premku
- Klik produk → QRIS GoMerchant muncul
- Bayar → akun terkirim otomatis

**Admin:**
- Hanya `/editproduk <id> harga <nilai>` untuk ubah harga

## Setup (3 Langkah)

### 1. Extract & Upload ZIP
Folder `/home/container/`:
- `index.js`, `src/`, `migrations/`, `.env`

### 2. Isi `.env`
```
BOT_TOKEN=<isi>
GO_MERCHANT_API_KEY=<isi>
PREMKU_API_KEY=<isi>
DATABASE_URL=<isi>
ADMIN_IDS=<isi>
```

### 3. Restart Bot
Stop → Start di panel

**Selesai!** ✅

---

## Yang Terjadi Saat Bot Startup

```
Connected to database: neondb
Running migrations...
Migration 001 OK
...
Migration 008 OK
AutoSync: Sinkronisasi katalog Premku...
AutoSync: Selesai: +10 produk, duplikat di-skip
Bot is running...
```

Produk dari Premku sudah ter-add ke database. Buyer bisa langsung beli.

---

## Test Cepat

```
/akunpremium      # Lihat 10+ produk dari Premku
# Klik produk → QRIS GoMerchant → bayar → akun terkirim
```

---

## Edit Harga (Admin)

```
/editproduk 1 harga 2500
```

`1` = ID produk di database (lihat saat startup atau `/akunpremium`)

---

Done! Produk 100% otomatis dari Premku. 🚀
