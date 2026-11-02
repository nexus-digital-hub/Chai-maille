'use strict';
/**
 * Génère la VERSION STATIQUE du site (dossier dist/) pour GitHub Pages ou tout hébergement de fichiers.
 *
 *   npm run build:static
 *
 * Variables (fichier .env ou environnement) :
 *   SITE_URL   adresse publique complète, ex. https://moncompte.github.io/petite-maille
 *   BASE_PATH  sous-dossier du site, ex. /petite-maille  (vide si le site est à la racine d'un domaine)
 *   WHATSAPP_NUMBER, BRAND_NAME, INSTAGRAM_HANDLE, DELIVERY_MODE, DELIVERY_FLAT_FEE, DEMO_MODE… (comme en mode serveur)
 *
 * Sans serveur, la commande part uniquement par WhatsApp (message pré-rempli). Le catalogue vient de data/products.js.
 */
process.env.STATIC_BUILD = '1';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
require('../server/env').load();

// Déduit BASE_PATH de SITE_URL si non fourni (https://x.github.io/repo -> /repo)
if (process.env.BASE_PATH === undefined && process.env.SITE_URL) {
  try { process.env.BASE_PATH = new URL(process.env.SITE_URL).pathname.replace(/\/+$/, ''); } catch { /* ignore */ }
}
const config = require('../config/site');
const catalog = require('../data/products');
const { pages, productPage, notFound } = require('../server/pages');
const { publicProducts, publicConfig, placeholderSvg } = require('../server/public-data');

const out = path.join(root, 'dist');
const pub = path.join(root, 'public');
const base = config.basePath;

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(pub, out, { recursive: true, filter: (src) => path.basename(src) !== '.gitkeep' });

const write = (rel, data) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };

// Photos manquantes : un visuel « Photo à ajouter » est écrit à côté (fichier .svg), jamais une fausse photo.
let missing = 0;
function resolveImg(p) {
  if (fs.existsSync(path.join(pub, p))) return p;
  const alt = p.replace(/\.[a-z0-9]+$/i, '') + '.placeholder.svg';
  write(alt.slice(1), placeholderSvg(p));
  missing++;
  return alt;
}
const fixImages = (html) =>
  html.replace(new RegExp(`${base}(/images/(?:products|site)/[\\w.-]+\\.(?:jpe?g|png|webp|avif))`, 'g'), (_, p) => base + resolveImg(p));

// ---------- pages ----------
const pageFile = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}/index.html`);
for (const [p, fn] of Object.entries(pages)) write(pageFile(p), fixImages(fn()));
for (const prod of catalog.products) write(pageFile(`/creations/${prod.slug}`), fixImages(productPage(prod.slug)));
write('404.html', fixImages(notFound()));
write('.nojekyll', '');

// ---------- « API » en fichiers JSON ----------
const products = publicProducts().map((p) => ({ ...p, images: p.images.map((i) => base + resolveImg(i)) }));
write('api/products.json', JSON.stringify({ products }));
write('api/config.json', JSON.stringify(publicConfig()));

// ---------- référencement ----------
const urls = ['/', '/creations', '/livraison', '/conditions', '/confidentialite', ...catalog.products.map((x) => `/creations/${x.slug}`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${config.siteUrl}${u === '/' ? '/' : u + '/'}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nDisallow: ${base}/panier/\nDisallow: ${base}/commande/\nDisallow: ${base}/confirmation/\nSitemap: ${config.siteUrl}/sitemap.xml\n`);

console.log(`\n🍑 Site statique généré dans ${out}`);
console.log(`   Adresse prévue    : ${config.siteUrl}`);
console.log(`   Chemin de base    : ${base || '(racine)'}`);
console.log(`   WhatsApp vendeuse : +${config.whatsappNumber}`);
console.log(`   Photos manquantes : ${missing ? missing + ' (visuels « Photo à ajouter » utilisés)' : 'aucune'}\n`);
if (config.whatsappNumber === '213550000000') console.warn('⚠️  WHATSAPP_NUMBER est le numéro d\'exemple : remplacez-le avant de publier.\n');
