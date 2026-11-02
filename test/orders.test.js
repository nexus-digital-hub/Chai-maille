'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-orders-'));
process.env.WHATSAPP_NUMBER = '213661234567';
process.env.DELIVERY_MODE = 'manual';
process.env.ORDER_RATE_LIMIT = '1000';
const { createServer } = require('../server/index');

let server, base;
before(async () => { server = createServer(); await new Promise((r) => server.listen(0, r)); base = `http://localhost:${server.address().port}`; });
after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const customer = { name: 'Sarah Benali', phone: '0550 12 34 56', email: '', wilaya: 16, commune: 'Bab Ezzouar', address: '12 rue des Peupliers' };
const lapine = (extra = {}) => ({ productId: 'petite-lapine', quantity: 2, selections: { main: 'peach', secondary: 'cream' }, ...extra });
const post = (body) => fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('commande valide : prix recalculés par le serveur, prix du navigateur ignoré', async () => {
  const res = await post({ customer, items: [lapine({ unitPrice: 1, price: 1, total: 1 })], total: 1 });
  assert.equal(res.status, 201);
  const out = await res.json();
  assert.match(out.order.number, /^#LSM-\d{4}-00001$/);
  assert.equal(out.order.total, 5000);
  assert.equal(out.order.deliveryPending, true);
  assert.ok(out.whatsappUrl.startsWith('https://wa.me/213661234567?text='));
  const text = decodeURIComponent(out.whatsappUrl.split('text=')[1]);
  assert.match(text, /NOUVELLE COMMANDE/);
  assert.match(text, /2x Petite Lapine/);
  assert.match(text, /Couleur principale : Pêche/);
  assert.match(text, /Téléphone : 0550123456/);
  const saved = fs.readdirSync(path.join(process.env.DATA_DIR, 'orders')).filter((f) => f.endsWith('.json'));
  assert.equal(saved.length, 1);
});

test('numéros de commande séquentiels', async () => {
  const out = await (await post({ customer, items: [lapine()] })).json();
  assert.match(out.order.number, /-00002$/);
});

test('jeton anti-doublon : même commande renvoyée, pas de seconde commande', async () => {
  const body = { clientToken: 'abc-123', customer, items: [lapine()] };
  const a = await (await post(body)).json();
  const b = await (await post(body)).json();
  assert.equal(a.order.number, b.order.number);
  assert.equal(b.duplicate, true);
});

test('panier vide refusé', async () => {
  const res = await post({ customer, items: [] });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /panier est vide/);
});

test('téléphone invalide refusé, formats algériens et internationaux acceptés', async () => {
  const bad = await post({ customer: { ...customer, phone: '12345' }, items: [lapine()] });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).field, 'phone');
  for (const phone of ['+213 550 12 34 56', '00213550123456', '0661234567', '+33 6 12 34 56 78']) {
    const ok = await post({ customer: { ...customer, phone }, items: [lapine()] });
    assert.equal(ok.status, 201, phone);
  }
});

test('produit indisponible, inconnu, couleur invalide ou manquante refusés', async () => {
  const canard = await post({ customer, items: [{ productId: 'petit-canard', quantity: 1, selections: { main: 'yellow' } }] });
  assert.equal(canard.status, 400); assert.match((await canard.json()).error, /plus disponible/);
  const ghost = await post({ customer, items: [{ productId: 'nope', quantity: 1, selections: {} }] });
  assert.equal(ghost.status, 400);
  const badColor = await post({ customer, items: [lapine({ selections: { main: 'neon', secondary: 'cream' } })] });
  assert.equal(badColor.status, 400);
  const missing = await post({ customer, items: [lapine({ selections: { main: 'peach' } })] });
  assert.equal(missing.status, 400);
  const qty = await post({ customer, items: [lapine({ quantity: 999 })] });
  assert.equal(qty.status, 400);
});

test('« autre couleur » exige un texte, et le texte apparaît dans le message', async () => {
  const none = await post({ customer, items: [lapine({ selections: { main: 'custom', secondary: 'cream' } })] });
  assert.equal(none.status, 400);
  const ok = await (await post({ customer, items: [lapine({ selections: { main: 'custom', secondary: 'cream' }, customColors: { main: 'turquoise <b>' }, note: 'Un nœud rose' })] })).json();
  const text = decodeURIComponent(ok.whatsappUrl.split('text=')[1]);
  assert.match(text, /Autre : turquoise b/);
  assert.doesNotMatch(text, /</);
  assert.match(text, /Demande : Un nœud rose/);
});

test('deux configurations différentes = deux lignes, total cumulé correct', async () => {
  const out = await (await post({ customer, items: [lapine(), lapine({ quantity: 1, selections: { main: 'pink', secondary: 'white' } }), { productId: 'petite-fraise', quantity: 1 }] })).json();
  assert.equal(out.order.total, 5000 + 2500 + 1500);
});

test('champs client obligatoires', async () => {
  for (const [field, value] of [['name', ''], ['wilaya', 99], ['commune', ''], ['address', 'x'], ['email', 'pas-un-email']]) {
    const res = await post({ customer: { ...customer, [field]: value }, items: [lapine()] });
    assert.equal(res.status, 400, field);
    assert.equal((await res.json()).field, field);
  }
});

test('champ piège (robots) et JSON invalide refusés', async () => {
  assert.equal((await post({ customer, items: [lapine()], website: 'http://spam' })).status, 400);
  const res = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
});

test('en-têtes de sécurité et métadonnées Open Graph par produit (image de repli tant que la photo manque)', async () => {
  const res = await fetch(`${base}/creations/petit-ourson`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  const html = await res.text();
  assert.match(html, /<title>Petit Ourson — peluche crochet faite main · Petite Maille<\/title>/);
  assert.match(html, /property="og:image" content="http:\/\/localhost:\d+\/images\/og-default\.png"/);
  assert.match(html, /"@type":"Product"/);
  assert.equal((await fetch(`${base}/creations/inconnu`)).status, 404);
});

test('pas de traversée de répertoire', async () => {
  const res = await fetch(`${base}/..%2f..%2fetc%2fpasswd`);
  assert.equal(res.status, 404);
  const env = await fetch(`${base}/.env`);
  assert.equal(env.status, 404);
});

test('limitation de débit : trop de commandes depuis la même adresse → 429 avec message clair', async () => {
  // Serveur dédié avec la limite par défaut (6), sans toucher au serveur des autres tests.
  const { spawn } = require('child_process');
  const port = 3300 + Math.floor(Math.random() * 400);
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), ORDER_RATE_LIMIT: '', DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'pm-rl-')) },
  });
  try {
    for (let i = 0; i < 40 && !(await fetch(`http://localhost:${port}/api/config`).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 100));
    let last;
    for (let i = 0; i < 7; i++) last = await fetch(`http://localhost:${port}/api/orders`, { method: 'POST', body: '{}' });
    assert.equal(last.status, 429);
    assert.match((await last.json()).error, /Trop de commandes/);
  } finally { child.kill(); }
});
