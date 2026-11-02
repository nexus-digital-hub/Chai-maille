'use strict';
/**
 * Gabarit commun des pages (en-tête, pied de page, SEO, Open Graph) + pages du site.
 * Le contenu de chaque page est dans /views/<nom>.html ; l'en-tête et le pied de page sont ICI, une seule fois.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config/site');
const catalog = require('../data/products');
const { whatsappContactUrl } = require('./notify');

const viewsDir = path.join(__dirname, '..', 'views');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = (name) => fs.readFileSync(path.join(viewsDir, `${name}.html`), 'utf8');

const peachIcon = (cls = 'peach-ico') =>
  `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#peach"/></svg>`;

const NAV = [
  ['/', 'Accueil'],
  ['/creations', 'Créations'],
  ['/#a-propos', 'À propos'],
  ['/#personnalisation', 'Personnalisation'],
  ['/#contact', 'Contact'],
];

function header(current) {
  const links = NAV.map(([href, label]) => {
    const active = href === current ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${active}>${label}</a></li>`;
  }).join('');
  return `
<a class="skip" href="#main">Aller au contenu</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="logo" href="/" aria-label="${esc(config.brand.name)} — accueil">${peachIcon('logo-peach')}<span>${esc(config.brand.name)}</span></a>
    <nav id="nav" class="nav" aria-label="Navigation principale"><ul>${links}</ul></nav>
    <div class="bar-actions">
      <a class="cart-link" href="/panier" aria-label="Panier"><svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V7a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="cart-text">Panier</span><span class="cart-count" data-cart-count hidden>0</span></a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span class="sr">Menu</span><span class="bars" aria-hidden="true"></span></button>
    </div>
  </div>
</header>`;
}

function footer() {
  const insta = config.brand.instagramHandle;
  const mail = config.brand.contactEmail;
  return `
<footer class="site-footer" id="contact">
  <div class="wrap foot-grid">
    <div>
      <p class="foot-brand">${peachIcon()} ${esc(config.brand.name)}</p>
      <p>${esc(config.brand.tagline)}</p>
    </div>
    <div>
      <h2 class="foot-h">Explorer</h2>
      <ul><li><a href="/">Accueil</a></li><li><a href="/creations">Créations</a></li><li><a href="/#personnalisation">Personnalisation</a></li><li><a href="/#a-propos">À propos</a></li><li><a href="/panier">Panier</a></li></ul>
    </div>
    <div>
      <h2 class="foot-h">Contact</h2>
      <ul>
        <li><a href="${whatsappContactUrl()}" rel="noopener" target="_blank">WhatsApp</a></li>
        <li><a href="https://instagram.com/${esc(insta)}" rel="noopener" target="_blank">Instagram @${esc(insta)}</a></li>
        ${mail ? `<li><a href="mailto:${esc(mail)}">${esc(mail)}</a></li>` : ''}
      </ul>
    </div>
    <div>
      <h2 class="foot-h">Infos</h2>
      <ul><li><a href="/livraison">Livraison</a></li><li><a href="/conditions">Conditions de vente</a></li><li><a href="/confidentialite">Confidentialité</a></li></ul>
    </div>
  </div>
  <div class="wrap foot-end"><p>© ${new Date().getFullYear()} ${esc(config.brand.name)} · Fait main, avec amour.</p></div>
</footer>
<a class="sticky-cart" href="/panier" aria-label="Voir le panier" data-sticky-cart hidden><svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V7a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Voir mon panier</span><span class="cart-count" data-cart-count>0</span></a>`;
}

// Définition de l'icône « pêche » réutilisable (<use href="#peach">).
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="peach" viewBox="0 0 48 48"><path d="M24 11c-9-4-18 2-18 14 0 10 7 18 18 18s18-8 18-18C42 13 33 7 24 11Z" fill="#F6B58F"/><path d="M24 11c4 8 3 20-2 32" fill="none" stroke="#E0916A" stroke-width="2" stroke-linecap="round"/><path d="M24 11c0-4 2-7 6-8-.4 4-2.600 7-6 8Z" fill="#8FA888"/><ellipse cx="15" cy="22" rx="4" ry="6" fill="#fff" opacity=".28" transform="rotate(20 15 22)"/></symbol>
</defs></svg>`;

/** Page complète. `meta` : { title, description, path, image, type, jsonld, scripts[], bodyClass, current } */
function render(viewName, meta, replacements = {}) {
  const url = config.siteUrl + meta.path;
  const image = (meta.image || '/images/og-default.png').startsWith('http')
    ? meta.image
    : config.siteUrl + (meta.image || '/images/og-default.png');
  const title = meta.title === config.brand.name ? meta.title : `${meta.title} · ${config.brand.name}`;
  let body = view(viewName);
  for (const [k, v] of Object.entries(replacements)) body = body.split(`{{${k}}}`).join(v);
  body = body.split('{{brand}}').join(esc(config.brand.name)).split('{{instagram}}').join(esc(config.brand.instagramHandle));
  const scripts = ['/js/app.js', ...(meta.scripts || [])].map((s) => `<script src="${s}" defer></script>`).join('\n');
  const noindex = meta.noindex ? '<meta name="robots" content="noindex">' : '';
  const html = `<!doctype html>
<html lang="fr" data-base="${esc(config.basePath)}"${config.staticBuild ? ' data-static="1"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
${noindex}
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#FFF8EE">
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
<meta property="og:site_name" content="${esc(config.brand.name)}">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="${meta.type || 'website'}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/css/style.css">
${meta.jsonld ? `<script type="application/ld+json">${JSON.stringify(meta.jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="${meta.bodyClass || ''}">
${sprite}
${header(meta.current || meta.path)}
<main id="main">
${body}
</main>
${footer()}
<div class="toast" role="status" aria-live="polite" data-toast></div>
${scripts}
</body>
</html>`;
  // Sous-dossier (GitHub Pages « projet ») : préfixe les liens absolus du site.
  return config.basePath ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${config.basePath}/`) : html;
}

// ---------- pages ----------
const siteDesc = 'Poupées et amigurumi crochetés à la main, uniques et personnalisables. Commandez en ligne, livraison dans toute l\'Algérie.';

const pages = {
  '/': () => render('home', { title: config.brand.name, description: siteDesc, path: '/', scripts: ['/js/home.js'] }),
  '/creations': () => render('shop', {
    title: 'Toutes les créations',
    description: 'Découvrez les poupées au crochet faites main : lapine, ourson, chatte, renard… Choisissez vos couleurs et commandez.',
    path: '/creations', scripts: ['/js/shop.js'], current: '/creations',
  }),
  '/panier': () => render('cart', { title: 'Votre panier', description: 'Votre panier de créations crochetées.', path: '/panier', scripts: ['/js/cart-page.js'], noindex: true }),
  '/commande': () => render('checkout', { title: 'Passer commande', description: 'Finalisez votre demande de commande.', path: '/commande', scripts: ['/js/order-message.js', '/js/checkout.js'], noindex: true }),
  '/confirmation': () => render('confirmation', { title: 'Commande envoyée', description: 'Votre demande de commande a bien été reçue.', path: '/confirmation', scripts: ['/js/confirmation.js'], noindex: true }),
  '/livraison': () => render('delivery', { title: 'Livraison', description: 'Comment fonctionne la livraison en Algérie.', path: '/livraison' }),
  '/conditions': () => render('terms', { title: 'Conditions de vente', description: 'Conditions de vente.', path: '/conditions' }),
  '/confidentialite': () => render('privacy', { title: 'Confidentialité', description: 'Comment vos informations sont utilisées.', path: '/confidentialite' }),
};

function productPage(slug) {
  const p = catalog.bySlug(slug);
  if (!p) return null;
  const img = fs.existsSync(path.join(__dirname, '..', 'public', p.images[0])) ? p.images[0] : '/images/og-default.png';
  return render('product', {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.short,
    path: `/creations/${p.slug}`,
    image: img,
    type: 'product',
    scripts: ['/js/product.js'],
    current: '/creations',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.short,
      image: config.siteUrl + img, brand: { '@type': 'Brand', name: config.brand.name },
      offers: {
        '@type': 'Offer', priceCurrency: 'DZD', price: p.price,
        availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${config.siteUrl}/creations/${p.slug}`,
      },
    },
  }, { slug: esc(p.slug) });
}

function notFound() {
  return render('notfound', { title: 'Page introuvable', description: 'Cette page n\'existe pas.', path: '/404', noindex: true });
}

module.exports = { pages, productPage, notFound, esc };
