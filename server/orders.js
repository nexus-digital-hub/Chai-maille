'use strict';
/**
 * Validation, calcul des prix (côté serveur, sur les données de confiance) et stockage des commandes.
 *
 * Stockage : un fichier par commande (storage/orders/<numéro>.json) + un compteur par année.
 * Pourquoi : zéro dépendance, lisible à la main, sauvegardable par simple copie de dossier.
 * Limite : pensé pour quelques centaines de commandes par mois. Au-delà, passer à SQLite/Postgres
 * en ne remplaçant que les fonctions `save`, `findByToken` et `nextNumber` de ce fichier.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config/site');
const catalog = require('../data/products');
const wilayas = require('../data/wilayas');

const ordersDir = path.resolve(config.dataDir, 'orders');
const counterFile = path.resolve(config.dataDir, 'counter.json');
fs.mkdirSync(ordersDir, { recursive: true });

class ValidationError extends Error {
  constructor(message, field) { super(message); this.field = field; this.status = 400; }
}

// ---------- utilitaires de nettoyage ----------
const clean = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // caractères de contrôle
    .replace(/[<>]/g, '')                                           // pas de balisage HTML
    .trim()
    .slice(0, max);

/** Normalise un numéro algérien (mobile 05/06/07, fixe 02/03/04) ou international (+…). */
function normalizePhone(input) {
  let s = String(input ?? '').replace(/[\s.\-()]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^\+213[2-7]\d{8}$/.test(s)) return '0' + s.slice(4);
  if (/^213[2-7]\d{8}$/.test(s)) return '0' + s.slice(3);
  if (/^0[567]\d{8}$/.test(s)) return s;          // mobile
  if (/^0[234]\d{7,8}$/.test(s)) return s;        // fixe
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;      // autre pays
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- calcul de la livraison ----------
function deliveryFor(wilayaCode) {
  const d = config.delivery;
  if (d.mode === 'flat') return { fee: d.flatFee, pending: false };
  if (d.mode === 'per_wilaya') {
    const fee = d.perWilaya[wilayaCode];
    return Number.isFinite(fee) ? { fee, pending: false } : { fee: null, pending: true };
  }
  return { fee: null, pending: true }; // manual : communiquée à la confirmation
}

// ---------- validation d'une ligne du panier ----------
function buildLine(raw, index) {
  const where = `Article ${index + 1}`;
  const product = catalog.byId(clean(raw?.productId, 80));
  if (!product) throw new ValidationError(`${where} : ce produit n'existe plus.`, 'items');
  if (!product.available) throw new ValidationError(`« ${product.name} » n'est plus disponible.`, 'items');

  const qty = Number(raw.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > config.limits.maxQtyPerLine)
    throw new ValidationError(`Quantité invalide pour « ${product.name} ».`, 'items');

  const selections = [];
  const rawSel = raw.selections && typeof raw.selections === 'object' ? raw.selections : {};
  const rawCustom = raw.customColors && typeof raw.customColors === 'object' ? raw.customColors : {};
  for (const opt of product.options) {
    const choice = clean(rawSel[opt.id], 40);
    if (!choice || !opt.choices.includes(choice))
      throw new ValidationError(`Choisissez « ${opt.label} » pour « ${product.name} ».`, 'items');
    let valueLabel = catalog.colors[choice].label;
    if (choice === 'custom') {
      const text = clean(rawCustom[opt.id], 60);
      if (!text) throw new ValidationError(`Précisez la couleur souhaitée (« ${opt.label} ») pour « ${product.name} ».`, 'items');
      valueLabel = `Autre : ${text}`;
    }
    selections.push({ optionId: opt.id, optionLabel: opt.label, value: choice, valueLabel });
  }

  return {
    productId: product.id,
    name: product.name,
    unitPrice: product.price,            // prix de confiance, jamais celui du navigateur
    quantity: qty,
    lineTotal: product.price * qty,
    selections,
    note: clean(raw.note, 300),
  };
}

// ---------- numéro de commande + stockage ----------
function nextNumber() {
  const year = new Date().getFullYear();
  let counter = {};
  try { counter = JSON.parse(fs.readFileSync(counterFile, 'utf8')); } catch { /* premier lancement */ }
  const n = (counter[year] || 0) + 1;
  counter[year] = n;
  const tmp = counterFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(counter));
  fs.renameSync(tmp, counterFile);
  return `#${config.orderPrefix}-${year}-${String(n).padStart(5, '0')}`;
}

const fileFor = (number) => path.join(ordersDir, number.replace(/[^A-Za-z0-9-]/g, '') + '.json');

function save(order) {
  const file = fileFor(order.number);
  fs.writeFileSync(file + '.tmp', JSON.stringify(order, null, 2));
  fs.renameSync(file + '.tmp', file);
}

// Index des jetons anti-doublon (double clic, réseau lent, renvoi).
const tokens = new Map();
for (const f of fs.readdirSync(ordersDir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const o = JSON.parse(fs.readFileSync(path.join(ordersDir, f), 'utf8'));
    if (o.clientToken) tokens.set(o.clientToken, o);
  } catch { /* fichier ignoré */ }
}

// ---------- création d'une commande ----------
function createOrder(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Commande invalide.');
  const token = clean(body.clientToken, 64);
  if (token && tokens.has(token)) return { order: tokens.get(token), duplicate: true };

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new ValidationError('Votre panier est vide.', 'items');
  if (items.length > config.limits.maxLines) throw new ValidationError('Trop d\'articles dans le panier.', 'items');

  const lines = items.map(buildLine);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  if (totalQty > config.limits.maxTotalQty)
    throw new ValidationError('Pour une commande de cette taille, contactez-nous directement sur WhatsApp.', 'items');

  const c = body.customer || {};
  const name = clean(c.name, 80);
  if (name.length < 2) throw new ValidationError('Indiquez votre nom complet.', 'name');

  const phone = normalizePhone(c.phone);
  if (!phone) throw new ValidationError('Numéro de téléphone invalide. Exemple : 05 XX XX XX XX.', 'phone');

  const email = clean(c.email, 120);
  if (email && !EMAIL_RE.test(email)) throw new ValidationError('Adresse e-mail invalide.', 'email');

  const wilaya = wilayas.find((w) => w.code === Number(c.wilaya));
  if (!wilaya) throw new ValidationError('Choisissez votre wilaya.', 'wilaya');

  const commune = clean(c.commune, 80);
  if (commune.length < 2) throw new ValidationError('Indiquez votre commune ou ville.', 'commune');

  const address = clean(c.address, 250);
  if (address.length < 5) throw new ValidationError('Indiquez votre adresse de livraison.', 'address');

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const delivery = deliveryFor(wilaya.code);
  const total = subtotal + (delivery.fee || 0);

  const order = {
    number: nextNumber(),
    createdAt: new Date().toISOString(),
    status: 'nouvelle',
    clientToken: token || null,
    customer: { name, phone, email, wilayaCode: wilaya.code, wilaya: wilaya.name, commune, address },
    note: clean(body.note, 500),
    items: lines,
    subtotal,
    deliveryFee: delivery.fee,
    deliveryPending: delivery.pending,
    total,
    currency: config.currency,
    demo: config.demoMode,
  };
  save(order);
  if (token) tokens.set(token, order);
  return { order, duplicate: false };
}

module.exports = { createOrder, normalizePhone, ValidationError, deliveryFor, ordersDir };
