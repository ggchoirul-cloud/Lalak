# Telegram Auto Order Bot — GoMerchant QRIS

Bot Telegram untuk sistem auto-order dengan pembayaran QRIS otomatis, terintegrasi dengan **GoMerchant API** dan **PostgreSQL**.

---

## ✨ Fitur

### User
- `/start` — Sambutan & registrasi otomatis ke database
- `/menu` — Menu utama dengan tombol inline
- `/order` — Pilih produk, sistem buat order + QRIS otomatis
- `/profile` — Lihat profil merchant GoMerchant
- `/history` — Riwayat order pribadi
- `/cancel <ref_id>` — Batalkan order yang masih pending
- `/akunpremium` — Beli akun premium (Capcut, Netflix, dll) via QRIS GoMerchant
- `/historypremium` — Riwayat pembelian akun premium
- `/help` — Daftar bantuan

### Admin
- `/admin` — Panel admin
- `/addproduk <nama>|<harga>|<deskripsi>` — Tambah produk
- `/editproduk <id> <field> <value>` — Edit produk
- `/hapusproduk <id>` — Hapus produk
- `/orders [status]` — Daftar order (filter opsional)
- `/users` — Daftar user terdaftar
- `/statistik` — Statistik penjualan & revenue
- `/listpremku` — Lihat katalog asli Premku beserta ID produk
- `/addpremium <id_premku>|<nama>|<harga>|<deskripsi>` — Link & jual produk Premku dengan harga sendiri
- `/profilepremku` — Cek modal saldo Premku (bukan saldo buyer)
- `/topupsaldo <nominal>` — Isi modal saldo Premku via QRIS
- `/statusdeposit <invoice>` — Cek status deposit modal
- `/batalkandeposit <invoice>` — Batalkan deposit modal pending

### Otomatisasi
- ✅ Auto-generate QRIS via GoMerchant saat order dibuat
- ✅ Auto-cek status pembayaran setiap **10 detik**
- ✅ Auto-update status: `PENDING → PAID / EXPIRED / CANCELLED`
- ✅ Auto-hapus invoice & QRIS saat lunas/expired/dibatalkan
- ✅ Auto-notifikasi ke user & admin saat pembayaran masuk
- ✅ Resume otomatis polling order yang tertinggal saat bot restart
- ✅ Sweeper job (1 menit) menyapu order expired yang terlewat

---

## 📁 Struktur Project

```
telegram-auto-order/
├── index.js                       # Entry point utama
├── package.json
├── .env.example
├── migrations/                    # File SQL migration berurutan
│   ├── 001_create_users.sql
│   ├── 002_create_products.sql
│   ├── 003_create_orders.sql
│   ├── 004_create_payments.sql
│   └── 005_create_admins.sql
├── docs/
│   └── INSTALLATION.md
└── src/
    ├── bot/
    │   └── index.js                # Registrasi command & handler Telegraf
    ├── commands/                   # Command user
    │   ├── start.js
    │   ├── menu.js
    │   ├── order.js
    │   ├── profile.js
    │   ├── history.js
    │   ├── cancel.js
    │   ├── help.js
    │   ├── akunpremium.js
    │   ├── historypremium.js
    │   └── admin/                  # Command admin
    │       ├── admin.js
    │       ├── addproduk.js
    │       ├── editproduk.js
    │       ├── hapusproduk.js
    │       ├── orders.js
    │       ├── users.js
    │       ├── statistik.js
    │       ├── profilepremku.js
    │       ├── topupsaldo.js
    │       ├── statusdeposit.js
    │       ├── batalkandeposit.js
    │       ├── addpremium.js
    │       └── listpremku.js
    ├── handlers/                   # Handler tombol inline (callback_query)
    │   ├── orderHandler.js
    │   ├── menuHandler.js
    │   ├── adminHandler.js
    │   └── premkuHandler.js
    ├── services/
    │   ├── goMerchantService.js     # Wrapper API GoMerchant
    │   ├── orderService.js          # Orkestrasi pembuatan order
    │   ├── paymentCheckerService.js # Auto polling & notifikasi GoMerchant
    │   ├── premkuService.js         # Wrapper API Premku
    │   ├── premkuPollingService.js  # Auto polling status DEPOSIT modal Premku
    │   └── premiumFulfillmentService.js  # Jembatan: order Premku setelah GoMerchant lunas
    ├── database/
    │   ├── pool.js                  # Koneksi pool PostgreSQL
    │   ├── migrate.js               # Migration runner
    │   ├── userRepository.js
    │   ├── productRepository.js
    │   ├── orderRepository.js
    │   ├── paymentRepository.js
    │   └── premkuRepository.js
    ├── middlewares/
    │   └── adminGuard.js
    ├── utils/
    │   ├── formatter.js
    │   ├── logger.js
    │   ├── validator.js
    │   └── rateLimiter.js
    └── config/
        └── config.js
```

---

## 🚀 Instalasi Cepat

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env — isi BOT_TOKEN, GO_MERCHANT_API_KEY, DATABASE_URL, ADMIN_IDS

# 3. Jalankan bot — migration database berjalan OTOMATIS saat start
npm start
```

> **Catatan**: Tidak perlu lagi menjalankan `npm run migrate` secara manual. Setiap kali bot start, ia otomatis mengecek dan membuat tabel yang belum ada di database (aman dijalankan berulang kali — migration yang sudah pernah dijalankan akan di-skip).
>
> Command `npm run migrate` tetap tersedia jika ingin menjalankan migration secara terpisah tanpa menyalakan bot.

Dokumentasi instalasi lengkap (termasuk setup PostgreSQL dari nol): lihat [`docs/INSTALLATION.md`](docs/INSTALLATION.md)

---

## ⚙️ Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `BOT_TOKEN` | ✅ | Token dari [@BotFather](https://t.me/BotFather) |
| `GO_MERCHANT_API_KEY` | ✅ | API key dari dashboard GoMerchant |
| `GO_MERCHANT_SECRET` | ❌ | Secret tambahan (jika ada) |
| `GO_MERCHANT_PROJECT` | ✅ | Nama project terdaftar di GoMerchant |
| `PREMKU_API_KEY` | ❌ | API key Premku (kosongkan jika tidak pakai fitur akun premium) |
| `DATABASE_URL` | ✅ | Connection string PostgreSQL |
| `ADMIN_IDS` | ✅ | Telegram ID admin, pisah koma |
| `PAYMENT_CHECK_INTERVAL` | ❌ | Interval polling ms (default 10000) |
| `ORDER_EXPIRED_MINUTES` | ❌ | Lama order sebelum expired (default 15) |

---

## 🗄️ Skema Database

| Tabel | Fungsi |
|---|---|
| `users` | Data user Telegram yang berinteraksi dengan bot |
| `products` | Katalog produk yang bisa dipesan |
| `orders` | Setiap order yang dibuat, status PENDING/PAID/EXPIRED/CANCELLED |
| `payments` | Detail QRIS & response GoMerchant per order |
| `admins` | (opsional) Daftar admin tambahan di database |
| `premku_orders` | Riwayat pembelian akun premium (Capcut, Netflix, dll) |
| `premku_deposits` | Riwayat deposit saldo ke akun Premku |

Relasi: `orders.user_id → users.id`, `orders.product_id → products.id`, `payments.order_id → orders.id`, `premku_orders.user_id → users.id`

---

## 🔌 Integrasi GoMerchant API

Endpoint yang digunakan (`https://api.gomerchant.biz.id`):

| Endpoint | Method | Fungsi |
|---|---|---|
| `/profile` | POST | Ambil data profil merchant |
| `/order` | POST | Buat transaksi QRIS baru |
| `/status` | POST | Cek status pembayaran |

Field request menyertakan `apikey` di body JSON pada setiap call. Lihat `src/services/goMerchantService.js` untuk detail mapping field.

---

## 💎 Integrasi Premku API (Akun Premium)

**Model bisnis baru**: buyer membayar via **QRIS GoMerchant** dengan harga yang admin tentukan sendiri (bisa beda dari harga asli Premku — selisihnya jadi margin). Saldo Premku tetap milik admin sebagai **modal**, dipakai otomatis di belakang layar setelah buyer melunasi pembayaran.

Endpoint Premku yang digunakan (`https://premku.com/api`):

| Endpoint | Method | Fungsi |
|---|---|---|
| `/profile` | POST | Cek modal saldo Premku (admin) |
| `/products` | POST | Katalog asli Premku — dipakai admin lewat `/listpremku` |
| `/stock` | POST | Cek stok satu produk |
| `/order` | POST | Order ke Premku (dipanggil otomatis setelah buyer bayar GoMerchant) |
| `/status` | POST | Cek status order — kembalikan akun jika `success` |
| `/pay` | POST | Generate QRIS untuk isi modal saldo Premku (`/topupsaldo`, admin only) |
| `/pay_status` | POST | Cek status deposit modal |
| `/cancel_pay` | POST | Batalkan deposit modal pending |

**Alur lengkap pembelian akun premium:**
```
1. Admin /listpremku           → lihat katalog Premku + ID produk
2. Admin /addpremium            → link produk Premku ke tabel products lokal,
                                   set harga jual sendiri
3. Buyer /akunpremium           → pilih produk (harga & QRIS dari GoMerchant)
4. Buyer bayar QRIS             → paymentCheckerService deteksi PAID
5. Sistem otomatis order Premku → pakai premku_product_id + saldo modal admin
6. Polling status Premku        → tunggu sampai "success"
7. Akun terkirim ke BUYER       → otomatis, tanpa campur tangan admin
```

Jika order ke Premku gagal (modal admin tidak cukup, dll) **setelah buyer sudah bayar**, admin langsung mendapat notifikasi darurat untuk fulfillment manual — lihat `src/services/premiumFulfillmentService.js`.

⚠️ **Keamanan kredensial**: Kredensial akun (username/password) dikirim sebagai pesan teks Telegram **tanpa parse_mode** (plain text) — ini sengaja, karena password dari provider bisa mengandung karakter spesial Markdown (`_`, `*`, `` ` ``) yang akan membuat pesan gagal terkirim jika diparsing sebagai Markdown.

---

## 🔐 Keamanan

- Validasi input pada semua command (`src/utils/validator.js`)
- Admin guard middleware — command admin hanya bisa diakses ID di `ADMIN_IDS`
- Rate limiter sederhana mencegah double-order dari double-click
- Environment variable untuk semua kredensial (tidak ada hardcode)
- Logging detail di setiap request/response API & query database

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| `Gagal menjalankan bot: 404 Not Found` | BOT_TOKEN salah/kosong, cek `.env` |
| `Database tidak dapat dijangkau` | Cek `DATABASE_URL`, pastikan PostgreSQL jalan |
| `Merchant tidak ditemukan` | Cek `GO_MERCHANT_PROJECT` sesuai nama project di dashboard GoMerchant |
| QRIS tidak muncul | Cek log `[GoMerchant]` di console, lihat response asli |

---

## 📄 Lisensi

MIT
