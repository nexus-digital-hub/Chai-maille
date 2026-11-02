'use strict';
// Affiche les commandes enregistrées : npm run orders
const fs = require('fs');
const path = require('path');
const config = require('../config/site');
const dir = path.resolve(config.dataDir, 'orders');
let files = [];
try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { /* aucun dossier */ }
if (!files.length) { console.log('Aucune commande enregistrée pour le moment.'); process.exit(0); }
for (const f of files) {
  const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log(`\n${o.number} — ${new Date(o.createdAt).toLocaleString('fr-FR')} — ${o.total} ${o.currency}${o.deliveryPending ? ' (+ livraison à confirmer)' : ''}`);
  console.log(`  ${o.customer.name} · ${o.customer.phone} · ${o.customer.wilaya}, ${o.customer.commune}`);
  for (const l of o.items) console.log(`  - ${l.quantity}x ${l.name} (${l.selections.map((s) => s.valueLabel).join(' / ')})`);
}
console.log(`\n${files.length} commande(s) — dossier : ${dir}`);
