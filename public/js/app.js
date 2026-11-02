'use strict';
/* Code commun à toutes les pages : panier (localStorage), menu mobile, données boutique, petits utilitaires.
   Le panier ne stocke QUE des choix (produit, couleurs, quantité). Les prix sont relus depuis le catalogue
   pour l'affichage et recalculés par le serveur au moment de la commande. */
(function () {
  const CART_KEY = 'pm_cart_v1';
  // Version statique (GitHub Pages) : pas de serveur, les données sont des fichiers JSON ; le site peut vivre dans un sous-dossier.
  const BASE = document.documentElement.dataset.base || '';
  const STATIC = document.documentElement.dataset.static === '1';
  const url = (p) => BASE + p;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, cur = 'DA') => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} ${cur}`;

  // ---------- données ----------
  let cfgPromise, prodPromise;
  const getJson = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const getConfig = () => (cfgPromise ||= getJson(STATIC ? url('/api/config.json') : '/api/config'));
  const getProducts = () => (prodPromise ||= getJson(STATIC ? url('/api/products.json') : '/api/products').then((d) => d.products));

  // ---------- panier ----------
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(v) ? v.filter((l) => l && l.productId && l.quantity > 0) : [];
    } catch { return []; }
  }
  function write(lines) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* stockage indisponible : le panier vit en mémoire */ memory = lines; }
    updateBadges();
    document.dispatchEvent(new CustomEvent('cart:changed'));
  }
  let memory = null;
  const lines = () => memory || read();

  // Deux articles identiques avec des choix différents = deux lignes distinctes.
  function lineKey(l) {
    const sel = Object.keys(l.selections || {}).sort().map((k) => `${k}=${l.selections[k]}`).join('&');
    const cus = Object.keys(l.customColors || {}).sort().map((k) => `${k}=${String(l.customColors[k]).trim().toLowerCase()}`).join('&');
    return [l.productId, sel, cus, String(l.note || '').trim().toLowerCase()].join('|');
  }

  const cart = {
    lines,
    count: () => lines().reduce((s, l) => s + l.quantity, 0),
    add(item) {
      const all = lines();
      const line = { productId: item.productId, selections: item.selections || {}, customColors: item.customColors || {}, note: item.note || '', quantity: item.quantity || 1 };
      line.key = lineKey(line);
      const found = all.find((l) => l.key === line.key);
      if (found) found.quantity = Math.min(20, found.quantity + line.quantity); else all.push(line);
      write(all);
      bump();
    },
    setQty(key, qty) {
      const all = lines();
      const l = all.find((x) => x.key === key);
      if (!l) return;
      l.quantity = Math.max(1, Math.min(20, qty));
      write(all);
    },
    remove(key) { write(lines().filter((l) => l.key !== key)); },
    clear() { write([]); },
  };

  function updateBadges() {
    const n = cart.count();
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    const sticky = document.querySelector('[data-sticky-cart]');
    if (sticky) sticky.hidden = n === 0 || /^\/(panier|commande|confirmation)/.test(location.pathname);
  }
  function bump() {
    document.querySelectorAll('.cart-link, .sticky-cart').forEach((el) => {
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(html, ms = 3500) {
    const el = document.querySelector('[data-toast]');
    if (!el) return;
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // ---------- helpers d'affichage ----------
  const productUrl = (p) => url(`/creations/${encodeURIComponent(p.slug)}`);
  const fromPrice = (p) => money(p.price);

  /** Texte lisible d'une ligne : [{label, value, hex}] */
  function describeLine(line, product, colors) {
    return (product.options || []).map((o) => {
      const id = line.selections[o.id];
      const c = colors[id] || {};
      const value = id === 'custom' ? `Autre : ${line.customColors[o.id] || ''}` : c.label || id;
      return { label: o.label, value, hex: c.hex };
    });
  }

  function cardHtml(p) {
    const badges = [
      p.isNew && p.available ? '<span class="badge new">Nouveauté</span>' : '',
      !p.available ? '<span class="badge out">Épuisé</span>' : '',
      p.demo ? '<span class="badge demo">Démo</span>' : '',
    ].join('');
    const addBtn = !p.available
      ? '<span class="btn small ghost" aria-disabled="true">Indisponible</span>'
      : p.customizable
        ? `<a class="btn small" href="${productUrl(p)}#couleurs">Choisir les couleurs</a>`
        : `<button class="btn small" type="button" data-quick-add="${esc(p.id)}">Ajouter au panier</button>`;
    return `<article class="card">
      <a class="card-media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${esc(p.images[0])}" alt="" width="600" height="600" loading="lazy" decoding="async"></a>
      <div class="badges">${badges}</div>
      <div class="card-body">
        <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        <p class="desc">${esc(p.short)}</p>
        <div class="card-meta">
          <span class="price">${p.customizable ? '<small>dès </small>' : ''}${fromPrice(p)}</span>
          <span class="status${p.available ? '' : ' off'}">${p.available ? 'Disponible' : 'Épuisé'}</span>
          <span class="custom-mark">${p.customizable ? 'Personnalisable' : 'Modèle fixe'}</span>
        </div>
        <div class="card-actions">
          <a class="btn small ghost" href="${productUrl(p)}" aria-label="Voir le produit : ${esc(p.name)}">Voir le produit</a>
          ${addBtn}
        </div>
      </div></article>`;
  }

  // Ajout rapide pour les modèles non personnalisables (présent sur accueil + catalogue).
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-quick-add]');
    if (!b) return;
    cart.add({ productId: b.dataset.quickAdd, quantity: 1 });
    const products = await getProducts().catch(() => []);
    const p = products.find((x) => x.id === b.dataset.quickAdd);
    toast(`${esc(p ? p.name : 'Article')} ajouté au panier · <a href="${url('/panier')}">Voir le panier</a>`);
  });

  // ---------- menu mobile ----------
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.menu-btn');
    const nav = document.getElementById('nav');
    if (btn && nav) {
      const set = (open) => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
      btn.addEventListener('click', () => set(!nav.classList.contains('open')));
      nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    }
    updateBadges();
  });
  window.addEventListener('storage', updateBadges);

  window.Shop = { url, STATIC, esc, money, getConfig, getProducts, cart, toast, describeLine, cardHtml, productUrl, lineKey };
})();
