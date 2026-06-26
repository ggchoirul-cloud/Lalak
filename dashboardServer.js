/**
 * Simple HTTP Dashboard - tanpa Express
 * Pakai Node.js built-in http module
 */

'use strict';

const http = require('http');
const url = require('url');
const db = require('../database/pool');
const logger = require('../utils/logger');

const ADMIN_TOKEN = process.env.DASHBOARD_TOKEN || 'admin123';

function startDashboardServer() {
  const PORT = process.env.DASHBOARD_PORT || 3000;

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Auth check
    const token = query.token;
    if (!token || token !== ADMIN_TOKEN) {
      if (pathname === '/dashboard' || pathname === '/api/product' || pathname.startsWith('/api/')) {
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html><head><meta charset="UTF-8"><title>Unauthorized</title></head>
          <body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:50px">
            <h1>🔐 Akses Ditolak</h1>
            <p>Token salah atau tidak ada.</p>
            <p style="color:#94a3b8">Format: http://localhost:3000/dashboard?token=YOUR_TOKEN</p>
            <p style="color:#94a3b8">Default token: admin123 (ganti di .env DASHBOARD_TOKEN)</p>
          </body></html>
        `);
        return;
      }
    }

    // Dashboard page
    if (pathname === '/dashboard') {
      try {
        const products = await db.query('SELECT * FROM products ORDER BY is_premku_product DESC, id');
        const orders = await db.query(`
          SELECT COUNT(*) as total_orders, 
                 SUM(CASE WHEN status = 'paid' THEN harga ELSE 0 END) as total_revenue,
                 SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders
          FROM orders
        `);
        
        const prods = products.rows;
        const stats = orders.rows[0];
        const premiumProds = prods.filter(p => p.is_premku_product);

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard Admin Bot</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI','Roboto',sans-serif;background:linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%);color:#e2e8f0;padding:20px;min-height:100vh}
    .container{max-width:1400px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #334155}
    .header h1{font-size:32px;color:#60a5fa;margin:0}
    .header-info{display:flex;gap:20px;font-size:14px;color:#94a3b8}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:30px}
    .stat-card{background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);padding:20px;border-radius:10px;border-left:4px solid #60a5fa;box-shadow:0 4px 6px rgba(0,0,0,0.3)}
    .stat-card.revenue{border-left-color:#10b981}
    .stat-card.orders{border-left-color:#f59e0b}
    .stat-card.products{border-left-color:#8b5cf6}
    .stat-value{font-size:28px;font-weight:bold;color:#60a5fa;margin-bottom:5px}
    .stat-card.revenue .stat-value{color:#10b981}
    .stat-card.orders .stat-value{color:#f59e0b}
    .stat-card.products .stat-value{color:#8b5cf6}
    .stat-label{font-size:13px;color:#94a3b8}
    .section{margin-bottom:40px}
    .section-title{font-size:20px;color:#60a5fa;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #334155;display:flex;align-items:center;gap:10px}
    .section-title span{font-size:24px}
    table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.3);margin-bottom:20px}
    th{background:#0f172a;padding:15px 12px;text-align:left;font-weight:600;color:#60a5fa;border-bottom:2px solid #334155;font-size:13px;text-transform:uppercase;letter-spacing:0.5px}
    td{padding:12px;border-bottom:1px solid #334155;font-size:14px}
    tr:hover{background:#334155}
    tr:last-child td{border-bottom:none}
    .premium-row{background:#1a2332}
    .premium-row:hover{background:#253547}
    .edit-input-group{display:flex;gap:8px;align-items:center}
    input[type="number"]{width:140px;padding:8px 12px;background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:6px;font-size:14px}
    input[type="number"]:focus{outline:none;border-color:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,0.1)}
    button{padding:8px 16px;background:#60a5fa;color:#0f172a;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.2s}
    button:hover{background:#3b82f6;transform:translateY(-2px);box-shadow:0 4px 8px rgba(60,165,250,0.3)}
    button:active{transform:translateY(0)}
    .status-badge{display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600}
    .status-aktif{background:#10b981;color:#0f172a}
    .badge-premium{background:#8b5cf6;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600}
    .rp{color:#10b981;font-weight:600}
    .empty{text-align:center;padding:30px;color:#94a3b8;font-style:italic}
    .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #334155;color:#64748b;font-size:12px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Dashboard Admin Bot</h1>
      <div class="header-info">
        <div>Bot aktif</div>
        <div>Refresh: <span id="time">--:--:--</span></div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card revenue">
        <div class="stat-value"><span class="rp">Rp</span> ${(parseInt(stats.total_revenue) || 0).toLocaleString('id-ID')}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card orders">
        <div class="stat-value">${stats.paid_orders || 0}</div>
        <div class="stat-label">Order Terbayar</div>
      </div>
      <div class="stat-card products">
        <div class="stat-value">${premiumProds.length}</div>
        <div class="stat-label">Produk Premium</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${prods.length}</div>
        <div class="stat-label">Total Produk</div>
      </div>
    </div>

    ${premiumProds.length > 0 ? `
    <div class="section">
      <div class="section-title"><span>💎</span> Edit Harga Produk Premium</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Produk</th>
            <th>Harga Sekarang</th>
            <th>Harga Baru</th>
            <th style="text-align:center">Action</th>
          </tr>
        </thead>
        <tbody>
          ${premiumProds.map(p => `
            <tr class="premium-row">
              <td><strong>#${p.id}</strong></td>
              <td>${p.nama}</td>
              <td><span class="rp">Rp ${p.harga.toLocaleString('id-ID')}</span></td>
              <td>
                <div class="edit-input-group">
                  <input type="number" id="harga-${p.id}" value="${p.harga}" min="1" max="50000000" placeholder="Rp">
                  <button onclick="updateHarga(${p.id})">💾 Update</button>
                </div>
              </td>
              <td style="text-align:center"><span class="badge-premium">Premium</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : `<div class="section"><div class="empty">Belum ada produk premium</div></div>`}

    <div class="section">
      <div class="section-title"><span>📦</span> Semua Produk (${prods.length})</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Produk</th>
            <th>Harga</th>
            <th>Kategori</th>
            <th style="text-align:center">Type</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${prods.length > 0 ? prods.map(p => `
            <tr>
              <td><strong>#${p.id}</strong></td>
              <td>${p.nama}</td>
              <td><span class="rp">Rp ${p.harga.toLocaleString('id-ID')}</span></td>
              <td>${p.kategori}</td>
              <td style="text-align:center">${p.is_premku_product ? '<span class="badge-premium">💎 Premium</span>' : '📦'}</td>
              <td style="text-align:center"><span class="status-badge ${p.status === 'aktif' ? 'status-aktif' : ''}">${p.status}</span></td>
            </tr>
          `).join('') : '<tr><td colspan="6" class="empty">Tidak ada produk</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>🔒 Dashboard Admin | Bot Telegram Auto Order | Powered by Langg.dev</p>
    </div>
  </div>

  <script>
    function updateTime() {
      const now = new Date();
      document.getElementById('time').textContent = now.toLocaleTimeString('id-ID');
    }
    updateTime();
    setInterval(updateTime, 1000);

    async function updateHarga(id) {
      const input = document.getElementById('harga-' + id);
      const hargaBaru = parseInt(input.value);
      
      if (!hargaBaru || hargaBaru < 1 || hargaBaru > 50000000) {
        alert('⚠️ Harga harus antara Rp 1 - Rp 50.000.000');
        return;
      }

      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '⏳ Update...';

      try {
        const res = await fetch('/api/product/' + id + '?token=${token}', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ harga: hargaBaru })
        });
        
        if (res.ok) {
          alert('✅ Harga diupdate!');
          location.reload();
        } else {
          alert('❌ Gagal update, coba lagi');
          btn.disabled = false;
          btn.textContent = '💾 Update';
        }
      } catch (e) {
        alert('❌ Error: ' + e.message);
        btn.disabled = false;
        btn.textContent = '💾 Update';
      }
    }
  </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ Error: ${error.message}</h1>`);
      }
      return;
    }

    // API: Update harga
    if (pathname.startsWith('/api/product/')) {
      if (req.method === 'PATCH') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const id = parseInt(pathname.split('/')[3]);
            const data = JSON.parse(body);
            const harga = data.harga;

            if (!harga || harga < 1 || harga > 50000000) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Harga invalid' }));
              return;
            }

            await db.query('UPDATE products SET harga = $1, updated_at = NOW() WHERE id = $2', [harga, id]);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }
    }

    // Default
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Page Not Found</h1>');
  });

  server.listen(PORT, () => {
    logger.success('Dashboard', `Akses: http://localhost:${PORT}/dashboard?token=${ADMIN_TOKEN}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error('Dashboard', `Port ${PORT} sudah terpakai. Ubah DASHBOARD_PORT di .env`);
    } else {
      logger.error('Dashboard', err.message);
    }
  });
}

module.exports = { startDashboardServer };
