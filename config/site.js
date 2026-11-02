'use strict';
/**
 * CONFIGURATION CENTRALE (lue depuis le fichier .env).
 * Aucun secret n'est écrit ici : tout vient des variables d'environnement.
 * Le numéro WhatsApp de la vendeuse est défini UNIQUEMENT via WHATSAPP_NUMBER.
 */
require('../server/env').load();

const env = process.env;
const port = Number(env.PORT) || 3000;
const digits = (s) => String(s || '').replace(/\D/g, '');
const bool = (v, def) => (v === undefined || v === '' ? def : !/^(false|0|no|non)$/i.test(String(v)));


module.exports = {
  port,
  siteUrl: (env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  demoMode: bool(env.DEMO_MODE, true),
  trustProxy: Number(env.TRUST_PROXY) || 0,
  // Version statique (GitHub Pages) : voir scripts/build-static.js
  staticBuild: env.STATIC_BUILD === '1',
  basePath: (env.BASE_PATH || '').replace(/\/+$/, '').replace(/^(?!\/)(.+)$/, '/$1'),
  dataDir: env.DATA_DIR || './storage',

  brand: {
    name: env.BRAND_NAME || 'Petite Maille',
    tagline: 'Des créations crochetées à la main avec amour.',
    instagramHandle: (env.INSTAGRAM_HANDLE || 'votre_compte').replace(/^@/, ''),
    contactEmail: (env.CONTACT_EMAIL || '').trim(),
  },

  currency: 'DA',
  orderPrefix: (env.ORDER_PREFIX || 'LSM').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'LSM',

  // Numéro WhatsApp de la vendeuse (chiffres, format international, sans "+")
  whatsappNumber: digits(env.WHATSAPP_NUMBER) || '213550000000',

  delivery: {
    mode: ['manual', 'flat', 'per_wilaya'].includes(env.DELIVERY_MODE) ? env.DELIVERY_MODE : 'manual',
    flatFee: Math.max(0, Math.round(Number(env.DELIVERY_FLAT_FEE) || 0)),
    perWilaya: require('./delivery-prices'),
  },

  limits: { maxQtyPerLine: 20, maxLines: 30, maxTotalQty: 60, ordersPer15Min: Number(env.ORDER_RATE_LIMIT) || 6 },
};
