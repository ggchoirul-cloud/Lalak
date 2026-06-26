# 🎛️ Dashboard Admin Web

Kelola semua produk dan harga dari web interface, tanpa perlu command Telegram.

## Akses Dashboard

Setelah bot jalan:

```
http://localhost:3000/dashboard?token=admin123
```

**Ganti:**
- `localhost` → IP/domain bot kamu (kalau di Pterodactyl: IP panel)
- `admin123` → token dari `.env` `DASHBOARD_TOKEN`

## Fitur

### 📊 Statistik Real-time
- Total Revenue (semua pembayaran terselesaikan)
- Jumlah Order Terbayar
- Jumlah Produk Premium
- Total Semua Produk

### 💎 Edit Harga Produk Premium
- Lihat semua produk premium dari katalog Premku
- Edit harga langsung di tabel
- Klik "Update" → harga berubah instant
- **Perubahan berlaku langsung** untuk buyer baru

### 📦 Lihat Semua Produk
- Daftar lengkap semua produk
- Type: Premium (💎) atau Produk biasa (📦)
- Status: Aktif/Nonaktif

## Setup `.env`

```env
# Dashboard config
DASHBOARD_PORT=3000
DASHBOARD_TOKEN=admin123
```

**Ganti `admin123`** dengan token yang kuat (misal: `sk_abc123xyz789`)

## Cara Edit Harga

1. **Buka dashboard** → http://localhost:3000/dashboard?token=YOUR_TOKEN
2. **Cari produk premium** di tabel "Edit Harga Produk Premium"
3. **Masukkan harga baru** di input field
4. **Klik "Update"** → done, harga berubah instant
5. **Buyer baru** akan bayar dengan harga yang baru

## Contoh

**Sebelum:**
- Produk ID 1: AM Exp April 2027 → Rp 550

**Dashboard:**
1. Input field ID 1 → ketik `2500`
2. Klik "Update"
3. ✅ Harga berubah ke Rp 2.500

**Sesudah:**
- Buyer yang beli sekarang: bayar Rp 2.500 (bukan Rp 550)

## Di Pterodactyl Panel

Kalau bot di Pterodactyl:

1. **Akses dashboard:**
   ```
   http://<IP_PANEL>:3000/dashboard?token=admin123
   ```
   
2. **Cari IP panel** di console Pterodactyl (hosting info)

3. **Pastikan port 3000 terbuka** di firewall (biasanya sudah)

## Keamanan

- Token di-check setiap akses
- Hanya yang punya token bisa edit harga
- Jangan share token public
- Ganti `admin123` dengan yang kuat di `.env`

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Dashboard tidak buka | Cek bot sudah jalan, port 3000 terbuka, token benar |
| Update harga gagal | Refresh page, cek console bot (ada error?) |
| 401 Unauthorized | Token salah, cek `.env` DASHBOARD_TOKEN |
| Port 3000 sudah terpakai | Ubah `DASHBOARD_PORT` di `.env` ke port lain (3001, 3002, dll) |

## Next Steps

- Edit harga untuk semua produk premium
- Monitor revenue dari dashboard
- Buyer langsung bisa `/akunpremium` dan membeli dengan harga baru

Done! 🎉
