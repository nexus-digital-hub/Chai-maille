'use strict';
/**
 * Serveur du site — Node.js pur, aucune dépendance à installer.
 * Rôles : pages HTML, fichiers statiques, API (/api/config, /api/products, /api/orders), sécurité de base.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('../config/site');
const catalog = require('../data/products');
const wilayas = require('../data/wilayas');
const orders = require('./orders');
const notify = require('./notify');
const { pages, productPage, notFound } = require('./pages');
const { publicProducts, publicConfig, placeholderSvg } = require('./public-data');

const publicDir = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2',
};

// ---------- en-têtes de sécurité ----------
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; " +
    "form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
if (config.siteUrl.startsWith('https://')) SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=15552000';

// ---------- limitation de débit (en mémoire) ----------
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

function clientIp(req) {
  if (config.trustProxy > 0) {
    const parts = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[Math.max(0, parts.length - config.trustProxy)];
  }
  return req.socket.remoteAddress || 'unknown';
}

// ---------- réponses ----------
function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), MIME['.json'], { 'Cache-Control': 'no-store' });

function readJson(req, limit = 50 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// ---------- fichiers statiques ----------
function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname).replace(/\\/g, '/');
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir + path.sep)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { stat = null; }
  if (!stat || !stat.isFile()) {
    if (/^\/images\/(products|site)\//.test(rel) && /\.(jpe?g|png|webp|avif)$/i.test(rel)) {
      send(res, 200, placeholderSvg(rel), MIME['.svg'], { 'Cache-Control': 'public, max-age=60' });
      return true;
    }
    return false;
  }
  const ext = path.extname(file).toLowerCase();
  const isImg = rel.startsWith('/images/');
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': isImg ? 'public, max-age=604800' : 'public, max-age=300',
    ...SECURITY_HEADERS,
  });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}

// ---------- routeur ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

  if (p.startsWith('/api/')) {
    if (limited('api:' + clientIp(req), config.limits.ordersPer15Min > 100 ? 100000 : 120, 60e3)) return json(res, 429, { error: 'Trop de requêtes. Réessayez dans une minute.' });

    if (req.method === 'GET' && p === '/api/config') return json(res, 200, publicConfig());
    if (req.method === 'GET' && p === '/api/products') return json(res, 200, { products: publicProducts() });

    if (req.method === 'POST' && p === '/api/orders') {
      if (limited('order:' + clientIp(req), config.limits.ordersPer15Min, 15 * 60e3))
        return json(res, 429, { error: 'Trop de commandes envoyées. Patientez quelques minutes ou contactez-nous sur WhatsApp.' });
      let body;
      try { body = await readJson(req); }
      catch (e) { return json(res, e.status || 400, { error: 'Votre commande n\'a pas pu être lue. Veuillez réessayer.' }); }
      if (body.website) return json(res, 400, { error: 'Commande refusée.' }); // champ piège anti-robots
      try {
        const { order, duplicate } = orders.createOrder(body);
        return json(res, 201, {
          ok: true, duplicate,
          order: { number: order.number, total: order.total, subtotal: order.subtotal, deliveryFee: order.deliveryFee, deliveryPending: order.deliveryPending, createdAt: order.createdAt },
          whatsappUrl: notify.whatsappUrl(order),
        });
      } catch (e) {
        if (e instanceof orders.ValidationError) return json(res, 400, { error: e.message, field: e.field || null });
        console.error('[orders] erreur inattendue :', e);
        return json(res, 500, { error: 'Une erreur est survenue lors de l\'envoi de votre commande. Veuillez réessayer ou nous contacter directement sur WhatsApp.' });
      }
    }
    return json(res, 404, { error: 'Introuvable.' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Méthode non autorisée', 'text/plain; charset=utf-8');

  if (p === '/robots.txt')
    return send(res, 200, `User-agent: *\nDisallow: /panier\nDisallow: /commande\nDisallow: /confirmation\nDisallow: /api/\nSitemap: ${config.siteUrl}/sitemap.xml\n`, MIME['.txt']);
  if (p === '/sitemap.xml') {
    const urls = ['/', '/creations', '/livraison', '/conditions', '/confidentialite', ...catalog.products.map((x) => `/creations/${x.slug}`)];
    return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${config.siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`, MIME['.xml']);
  }

  if (pages[p]) return send(res, 200, pages[p](), undefined, { 'Cache-Control': 'no-cache' });
  const m = p.match(/^\/creations\/([a-z0-9-]+)$/);
  if (m) {
    const html = productPage(m[1]);
    if (html) return send(res, 200, html, undefined, { 'Cache-Control': 'no-cache' });
  }
  if (serveStatic(req, res, p)) return;
  return send(res, 404, notFound(), undefined, { 'Cache-Control': 'no-cache' });
}

function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('[server]', e);
      if (!res.headersSent) send(res, 500, 'Erreur du serveur', 'text/plain; charset=utf-8');
    });
  });
}

if (require.main === module) {
  createServer().listen(config.port, () => {
    console.log(`\n🍑 ${config.brand.name} — http://localhost:${config.port}`);
    console.log(`   WhatsApp vendeuse : +${config.whatsappNumber}`);
    console.log(`   Livraison         : ${config.delivery.mode}`);
    console.log(`   Mode démo         : ${config.demoMode ? 'OUI (DEMO_MODE=false pour lancer)' : 'non'}\n`);
  });
}

module.exports = { createServer };
