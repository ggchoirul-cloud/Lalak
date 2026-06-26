# Dokumentasi Instalasi — Telegram Auto Order Bot

Panduan instalasi lengkap dari nol, termasuk setup PostgreSQL.

---

## 1. Prasyarat

- Node.js versi **20 sampai 24**
- PostgreSQL versi 13+ (lokal, VPS, atau layanan seperti Supabase/Neon/Railway)
- Bot Token dari [@BotFather](https://t.me/BotFather)
- API Key GoMerchant (dari dashboard GoMerchant)

Cek versi Node.js:
```bash
node -v
```

---

## 2. Setup PostgreSQL

### Opsi A — PostgreSQL lokal (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Masuk ke psql sebagai user postgres
sudo -u postgres psql

# Di dalam psql, buat database dan user
CREATE DATABASE telegram_auto_order;
CREATE USER bot_user WITH ENCRYPTED PASSWORD 'password_aman';
GRANT ALL PRIVILEGES ON DATABASE telegram_auto_order TO bot_user;
\q
```

Connection string yang dihasilkan:
```
postgresql://bot_user:password_aman@localhost:5432/telegram_auto_order
```

### Opsi B — PostgreSQL Cloud (Neon / Supabase / Railway)

1. Buat project baru di layanan pilihan
2. Copy **Connection String** yang diberikan (biasanya format `postgresql://user:pass@host:port/dbname`)
3. Pastikan menambahkan `?sslmode=require` jika diwajibkan layanan tersebut

---

## 3. Clone / Extract Project

```bash
# Jika dari ZIP
unzip telegram-auto-order.zip
cd telegram-auto-order

# Install dependencies
npm install
```

---

## 4. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit file `.env`:

```env
BOT_TOKEN=7714054346:AAFxxxxxxxxxxxxxxxxxxxxxxxxxx
GO_MERCHANT_API_KEY=GO_xxxxxxxxxxxxx
GO_MERCHANT_SECRET=
GO_MERCHANT_PROJECT=Avianto
DATABASE_URL=postgresql://bot_user:password_aman@localhost:5432/telegram_auto_order
ADMIN_IDS=123456789
PAYMENT_CHECK_INTERVAL=10000
ORDER_EXPIRED_MINUTES=15
```

> **Cara dapat Telegram ID kamu**: chat ke [@userinfobot](https://t.me/userinfobot) di Telegram, atau gunakan [@RawDataBot](https://t.me/RawDataBot).

> **Penting**: `GO_MERCHANT_PROJECT` harus **sama persis** dengan nama project yang terdaftar di dashboard GoMerchant kamu, atau request order akan gagal dengan error "Merchant tidak ditemukan".

---

## 5. Jalankan Bot

Migration database **berjalan otomatis** saat bot start — tidak perlu command terpisah.

```bash
npm start
```

Output yang diharapkan:
```
[DATABASE] ✅ Koneksi PostgreSQL berhasil.
[MIGRATE] ▶️  Menjalankan: 001_create_users.sql
[MIGRATE] ✅ Berhasil: 001_create_users.sql
[MIGRATE] ▶️  Menjalankan: 002_create_products.sql
[MIGRATE] ✅ Berhasil: 002_create_products.sql
[MIGRATE] ▶️  Menjalankan: 003_create_orders.sql
[MIGRATE] ✅ Berhasil: 003_create_orders.sql
[MIGRATE] ▶️  Menjalankan: 004_create_payments.sql
[MIGRATE] ✅ Berhasil: 004_create_payments.sql
[MIGRATE] ▶️  Menjalankan: 005_create_admins.sql
[MIGRATE] ✅ Berhasil: 005_create_admins.sql
[MIGRATE] Selesai. 5 migration baru dijalankan, 0 dilewati.
[Startup] ✅ Bot berhasil dijalankan!
[Startup] Admin terdaftar: 1 orang
[Startup] Interval cek pembayaran: 10000ms
```

Pada start berikutnya (restart bot), migration akan otomatis di-skip karena sudah pernah dijalankan:
```
[MIGRATE] ⏭️  Skip (sudah pernah dijalankan): 001_create_users.sql
...
[MIGRATE] Selesai. 0 migration baru dijalankan, 5 dilewati.
```

Mode development (auto-restart saat file berubah):
```bash
npm run dev
```

> Jika kamu lebih suka menjalankan migration secara manual/terpisah (misalnya di pipeline CI/CD), command `npm run migrate` tetap tersedia.

---

## 7. Deploy ke Pterodactyl Panel

1. Buat server baru → **Egg: Node.js** (versi 20+)
2. **Startup Command**: `node index.js`
3. Upload semua file project ke `/home/container/`
4. Pastikan `.env` sudah terisi lengkap
5. Di tab **Console**, jalankan: `npm install`
6. Klik **Start** — migration database otomatis berjalan sebelum bot online

> Jika console panel kamu tidak mendukung input command interaktif, kamu tetap bisa lanjut langsung ke langkah Start — bot akan otomatis menjalankan migration saat startup tanpa perlu command manual apapun selain `npm install`.

---

## 8. Verifikasi Instalasi

Di Telegram, chat ke bot kamu:

```
/start    → harus muncul sambutan
/order    → harus muncul daftar 3 produk contoh
/profile  → harus muncul data profil GoMerchant
/admin    → harus muncul panel admin (jika ID kamu ada di ADMIN_IDS)
```

Jika semua berjalan, coba order produk termurah untuk tes QRIS dan auto-polling.

---

## Troubleshooting Umum

**Error: `relation "users" does not exist`**
→ Migration belum dijalankan. Jalankan `npm run migrate`.

**Error: `password authentication failed`**
→ Periksa username/password di `DATABASE_URL`.

**QRIS tidak muncul setelah pilih produk**
→ Cek log console untuk `[GoMerchant]`, lihat response error aslinya. Biasanya field `nama_project` tidak sesuai dengan nama project di dashboard GoMerchant.

**Bot tidak merespon command**
→ Pastikan proses `node index.js` masih berjalan dan tidak crash. Cek log error di console/panel.
