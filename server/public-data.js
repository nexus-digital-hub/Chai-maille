'use strict';
/** Données publiques du catalogue et de la configuration (serveur ET build statique) + images de remplacement. */
const path = require('path');
const config = require('../config/site');
const catalog = require('../data/products');
const wilayas = require('../data/wilayas');
const notify = require('./notify');

// ---------- données publiques ----------
function publicProducts() {
  return catalog.products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, short: p.short, description: p.description, price: p.price,
    images: p.images, available: p.available, customizable: p.customizable,
    options: p.options.map((o) => ({ ...o, choices: o.choices })),
    materials: p.materials, dimensions: p.dimensions, prepTime: p.prepTime,
    featured: p.featured, isNew: p.isNew, bestSeller: p.bestSeller, category: p.category,
    demo: config.demoMode && Boolean(p.demo),
  }));
}

function publicConfig() {
  return {
    brand: config.brand, currency: config.currency, demoMode: config.demoMode,
    delivery: {
      mode: config.delivery.mode, flatFee: config.delivery.flatFee,
      perWilaya: config.delivery.mode === 'per_wilaya' ? config.delivery.perWilaya : {},
    },
    wilayas,
    colors: catalog.colors,
    contactWhatsappUrl: notify.whatsappContactUrl(),
    whatsappNumber: config.whatsappNumber, // déjà public via le lien WhatsApp du site
    orderPrefix: config.orderPrefix,
    limits: config.limits,
  };
}

// ---------- images de remplacement ----------
// Tant que la vraie photo n'est pas déposée dans /public/images/products/, le site affiche ce visuel
// clairement identifié « Photo à ajouter » (jamais une fausse photo produit).
const TINTS = ['#F9D9C2', '#F4E3CC', '#EBD9C8', '#F6D0C4', '#DDE5D3', '#F2DCCB'];
function placeholderSvg(file) {
  const base = path.basename(file).replace(/\.[a-z0-9]+$/i, '').replace(/-\d+$/, '');
  const dir = path.posix.dirname(file) + '/';
  const label = base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/[<>&"']/g, '');
  let h = 0; for (const ch of base) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tint = TINTS[h % TINTS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Photo à ajouter : ${label}">
<rect width="800" height="800" fill="${tint}"/>
<rect x="40" y="40" width="720" height="720" rx="48" fill="none" stroke="#B8654A" stroke-width="4" stroke-dasharray="14 12" stroke-linecap="round" opacity=".55"/>
<g transform="translate(300 190) scale(4.2)"><path d="M24 11c-9-4-18 2-18 14 0 10 7 18 18 18s18-8 18-18C42 13 33 7 24 11Z" fill="#F6B58F"/><path d="M24 11c4 8 3 20-2 32" fill="none" stroke="#E0916A" stroke-width="2" stroke-linecap="round"/><path d="M24 11c0-4 2-7 6-8-.4 4-2.6 7-6 8Z" fill="#8FA888"/></g>
<text x="400" y="520" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="#3A2619">${label}</text>
<text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#7A5A48">Photo à ajouter</text>
<text x="400" y="624" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#7A5A48">public${dir}${base}.jpg</text>
</svg>`;
}

module.exports = { publicProducts, publicConfig, placeholderSvg };
