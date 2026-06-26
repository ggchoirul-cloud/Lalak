/**
 * Dashboard Admin Service
 * Express server untuk dashboard admin management
 * Port: 3000 (bisa diubah di .env: DASHBOARD_PORT=3000)
 */

'use strict';

const express = require('express');
const db = require('../database/pool');
const logger = require('../utils/logger');

let dashboardServer = null;

async function startDashboard() {
  const app = express();
  const port = process.env.DASHBOARD_PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============================================================
  // ROUTES
  // ============================================================

  // Home
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header h1 { color: #333; margin-bottom: 10px; }
          .header p { color: #666; font-size: 14px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .card h2 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .card .value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
          }
          .card .detail {
            font-size: 12px;
            color: #999;
            margin-top: 10px;
          }
          .table-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #e0e0e0;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
          }
          tr:hover { background: #f9f9f9; }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-paid { background: #d4edda; color: #155724; }
          .badge-pending { background: #fff3cd; color: #856404; }
          .badge-active { background: #d4edda; color: #155724; }
          .edit-form {
            display: flex;
            gap: 10px;
            margin: 10px 0;
          }
          input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
          }
          button {
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
          }
          button:hover { background: #764ba2; }
          .info { color: #666; font-size: 12px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💎 Admin Dashboard</h1>
            <p>Manage produk akun premium, order, dan statistik</p>
          </div>

          <div class="grid" id="stats"></div>

          <div class="table-container">
            <h3 style="margin-bottom: 15px;">📦 Daftar Produk Akun Premium</h3>
            <table id="products"></table>
          </div>

          <div class="table-container" style="margin-top: 20px;">
            <h3 style="margin-bottom: 15px;">📊 Order Terbaru</h3>
            <table id="orders"></table>
          </div>
        </div>

        <script>
          async function loadDashboard() {
            try {
              const stats = await fetch('/api/stats').then(r => r.json());
              const products = await fetch('/api/products').then(r => r.json());
              const orders = await fetch('/api/orders').then(r => r.json());

              // Render stats
              document.getElementById('stats').innerHTML = \`
                <div class="card">
                  <h2>Total Produk</h2>
                  <div class="value">\${stats.totalProducts}</div>
                  <div class="detail">Premium actif</div>
                </div>
                <div class="card">
                  <h2>Total Order</h2>
                  <div class="value">\${stats.totalOrders}</div>
                  <div class="detail">Semua waktu</div>
                </div>
                <div class="card">
                  <h2>Order Hari Ini</h2>
                  <div class="value">\${stats.orderToday}</div>
                  <div class="detail">Status apapun</div>
                </div>
                <div class="card">
                  <h2>Total Penjualan</h2>
                  <div class="value">Rp \${stats.totalRevenue.toLocaleString('id-ID')}</div>
                  <div class="detail">Pembayaran terverifikasi</div>
                </div>
              \`;

              // Render products
              document.getElementById('products').innerHTML = \`
                <tr>
                  <th>ID</th>
                  <th>Nama Produk</th>
                  <th>Harga (Rp)</th>
                  <th>Stok</th>
                  <th>Action</th>
                </tr>
                \${products.map(p => \`
                  <tr>
                    <td>#\${p.id}</td>
                    <td>\${p.nama}</td>
                    <td id="price-\${p.id}" onclick="editPrice(\${p.id}, '\${p.nama}')">\${p.harga.toLocaleString('id-ID')}</td>
                    <td>\${p.premku_product_id ? 'Auto-sync Premku' : 'Manual'}</td>
                    <td>
                      <button onclick="editPrice(\${p.id}, '\${p.nama}')">Edit Harga</button>
                    </td>
                  </tr>
                \`).join('')}
              \`;

              // Render orders
              document.getElementById('orders').innerHTML = \`
                <tr>
                  <th>Order ID</th>
                  <th>Produk</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
                \${orders.map(o => \`
                  <tr>
                    <td>\${o.ref_id.substring(0, 20)}...</td>
                    <td>\${o.product_nama}</td>
                    <td>Rp \${o.harga.toLocaleString('id-ID')}</td>
                    <td><span class="badge badge-\${o.status}">\${o.status.toUpperCase()}</span></td>
                    <td>\${new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                \`).join('')}
              \`;
            } catch (e) {
              console.error('Load error:', e);
              document.body.innerHTML = '<div style="color:red;padding:20px;">Error loading dashboard: ' + e.message + '</div>';
            }
          }

          function editPrice(id, nama) {
            const newPrice = prompt(\`Edit harga: \${nama}\\nMasukkan harga baru (Rp):\`, '');
            if (!newPrice) return;

            fetch(\`/api/products/\${id}/harga\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ harga: parseInt(newPrice) })
            }).then(r => r.json()).then(res => {
              if (res.ok) {
                alert('✅ Harga diperbarui!');
                loadDashboard();
              } else {
                alert('❌ ' + res.error);
              }
            }).catch(e => alert('Error: ' + e.message));
          }

          loadDashboard();
          setInterval(loadDashboard, 30000); // Refresh every 30s
        </script>
      </body>
      </html>
    `);
  });

  // API: Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const totalProducts = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE is_premku_product = TRUE'
      );
      const totalOrders = await db.query('SELECT COUNT(*) as count FROM orders');
      const orderToday = await db.query(
        "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE"
      );
      const totalRevenue = await db.query(
        "SELECT COALESCE(SUM(harga), 0) as total FROM orders WHERE status = 'paid'"
      );

      res.json({
        totalProducts: totalProducts.rows[0].count,
        totalOrders: totalOrders.rows[0].count,
        orderToday: orderToday.rows[0].count,
        totalRevenue: parseInt(totalRevenue.rows[0].total) || 0,
      });
    } catch (e) {
      res.json({ error: e.message });
    }
  });

  // API: Products
  app.get('/api/products', async (req, res) => {
    try {
      const result = await db.query(
        'SELECT id, nama, harga, premku_product_id FROM products WHERE is_premku_product = TRUE ORDER BY created_at DESC LIMIT 50'
      );
      res.json(result.rows);
    } catch (e) {
      res.json({ error: e.message });
    }
  });

  // API: Edit Harga
  app.post('/api/products/:id/harga', async (req, res) => {
    try {
      const { id } = req.params;
      const { harga } = req.body;

      if (!harga || harga <= 0 || harga > 50000000) {
        return res.json({ ok: false, error: 'Harga invalid (1 - 50.000.000)' });
      }

      await db.query('UPDATE products SET harga = $1, updated_at = NOW() WHERE id = $2', [harga, id]);
      res.json({ ok: true });
    } catch (e) {
      res.json({ ok: false, error: e.message });
    }
  });

  // API: Orders
  app.get('/api/orders', async (req, res) => {
    try {
      const result = await db.query(
        'SELECT ref_id, product_nama, harga, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20'
      );
      res.json(result.rows);
    } catch (e) {
      res.json({ error: e.message });
    }
  });

  // Start server
  dashboardServer = app.listen(port, () => {
    logger.success('Dashboard', `Buka http://localhost:${port} di browser`);
  });
}

function stopDashboard() {
  if (dashboardServer) {
    dashboardServer.close();
    logger.info('Dashboard', 'Server stopped');
  }
}

module.exports = { startDashboard, stopDashboard };
