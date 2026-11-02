'use strict';
(async function () {
  const root = document.getElementById('pdp-root');
  const slug = root.dataset.slug;
  const { esc, money } = Shop;
  let product, cfg;
  try {
    const [products, c] = await Promise.all([Shop.getProducts(), Shop.getConfig()]);
    cfg = c; product = products.find((p) => p.slug === slug);
  } catch {
    root.insertAdjacentHTML('beforeend', '<p class="alert">Impossible de charger la fiche. Vérifiez votre connexion puis actualisez la page.</p>');
    return;
  }
  if (!product) { root.innerHTML = `<div class="thanks"><h1>Création introuvable</h1><a class="btn" href="${Shop.url('/creations')}">Voir les créations</a></div>`; return; }

  const colors = cfg.colors;
  const sel = {};     // optionId -> couleur choisie
  const custom = {};  // optionId -> texte libre si "Autre couleur"
  let qty = 1;
  const alt = (i) => `${product.name}, poupée au crochet faite main${product.images.length > 1 ? ` (photo ${i + 1})` : ''}`;

  const optionHtml = (o) => `
    <fieldset class="opt" id="opt-${esc(o.id)}">
      <legend>${esc(o.label)} <span class="chosen" data-chosen="${esc(o.id)}">— choisissez une couleur</span></legend>
      <div class="swatches" role="radiogroup" aria-label="${esc(o.label)}">
        ${o.choices.map((id) => { const c = colors[id]; return `
          <label class="swatch" title="${esc(c.label)}">
            <input type="radio" name="opt-${esc(o.id)}" value="${esc(id)}" aria-label="${esc(c.label)}">
            <span class="dot${id === 'custom' ? ' custom' : ''}" ${c.hex ? `style="--hex:${esc(c.hex)}"` : ''}></span>
          </label>`; }).join('')}
      </div>
      <input class="custom-input" type="text" data-custom="${esc(o.id)}" placeholder="Quelle couleur souhaitez-vous ?" maxlength="60" aria-label="Couleur souhaitée pour ${esc(o.label)}" hidden>
    </fieldset>`;

  root.innerHTML = `
    <p class="crumbs"><a href="${Shop.url('/')}">Accueil</a> / <a href="${Shop.url('/creations')}">Créations</a> / <span>${esc(product.name)}</span></p>
    <div class="pdp">
      <div>
        <div class="gallery-main"><img id="g-main" src="${esc(product.images[0])}" alt="${esc(alt(0))}" width="900" height="900" fetchpriority="high" decoding="async"></div>
        ${product.images.length > 1 ? `<div class="thumbs">${product.images.map((src, i) => `<button class="thumb" type="button" data-img="${i}" aria-label="Voir la photo ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${esc(src)}" alt="" width="72" height="72" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        <div class="badges" style="position:static;margin-bottom:10px">${product.demo ? '<span class="badge demo">Produit de démonstration</span>' : ''}${product.isNew && product.available ? '<span class="badge new">Nouveauté</span>' : ''}</div>
        <h1>${esc(product.name)}</h1>
        <p class="price">${money(product.price)}</p>
        <p class="lead">${esc(product.description)}</p>
        <dl class="facts">
          <div><dt>Matériaux</dt><dd>${esc(product.materials)}</dd></div>
          <div><dt>Dimensions</dt><dd>${esc(product.dimensions)}</dd></div>
          <div><dt>Préparation</dt><dd>${esc(product.prepTime)}</dd></div>
          <div><dt>Disponibilité</dt><dd>${product.available ? 'Disponible' : 'Actuellement épuisé'}</dd></div>
        </dl>
        ${product.available ? `
        <div id="couleurs">
          ${product.options.length ? `<h2 style="font-size:1.3rem;margin-top:8px">Choisissez votre combinaison de couleurs</h2>${product.options.map(optionHtml).join('')}
          <p class="preview-pill" id="preview" hidden></p>` : '<p class="muted">Ce modèle n\'est pas personnalisable.</p>'}
          ${product.customizable ? `<div class="field"><label for="line-note" style="font-weight:700;display:block;margin-bottom:6px">Autres demandes <span class="muted" style="font-weight:500">(facultatif)</span></label><textarea id="line-note" class="note-input" maxlength="300" placeholder="Une préférence particulière ?"></textarea></div>` : ''}
        </div>
        <p class="alert" id="pdp-error" role="alert" hidden></p>
        <div class="buy-row">
          <div class="qty" role="group" aria-label="Quantité"><button type="button" data-q="-1" aria-label="Diminuer la quantité">−</button><output id="qty" aria-live="polite">1</output><button type="button" data-q="1" aria-label="Augmenter la quantité">+</button></div>
          <button class="btn" type="button" id="add-btn">Ajouter au panier</button>
        </div>` : `<div class="unavailable-box"><b>Cette création est actuellement épuisée.</b><p class="muted" style="margin:6px 0 12px">Écrivez-nous : nous pouvons peut-être en crocheter une nouvelle pour vous.</p><a class="btn small" href="${esc(cfg.contactWhatsappUrl)}" target="_blank" rel="noopener">Nous écrire sur WhatsApp</a></div>`}
      </div>
    </div>`;

  // galerie
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-img]');
    if (!t) return;
    const i = Number(t.dataset.img);
    const img = document.getElementById('g-main');
    img.src = product.images[i]; img.alt = alt(i);
    root.querySelectorAll('.thumb').forEach((b) => b.removeAttribute('aria-current'));
    t.setAttribute('aria-current', 'true');
  });

  if (!product.available) return;

  // couleurs : la sélection est toujours visible (pastille cochée, nom à côté du titre, résumé)
  function refresh() {
    product.options.forEach((o) => {
      const el = root.querySelector(`[data-chosen="${o.id}"]`);
      const id = sel[o.id];
      el.textContent = id ? `— ${id === 'custom' ? 'Autre couleur' : colors[id].label}` : '— choisissez une couleur';
      const input = root.querySelector(`[data-custom="${o.id}"]`);
      input.hidden = id !== 'custom';
    });
    const prev = document.getElementById('preview');
    if (prev) {
      const parts = product.options.filter((o) => sel[o.id]).map((o) => {
        const id = sel[o.id]; const c = colors[id];
        const name = id === 'custom' ? `Autre${custom[o.id] ? ' : ' + esc(custom[o.id]) : ''}` : esc(c.label);
        return `<span><span class="dot-sm" ${c.hex ? `style="background:${esc(c.hex)}"` : ''}></span>${esc(o.label)} : <b>${name}</b></span>`;
      });
      prev.hidden = !parts.length;
      prev.innerHTML = parts.join(' &nbsp;·&nbsp; ');
    }
  }
  root.addEventListener('change', (e) => {
    const r = e.target.closest('input[type=radio]');
    if (!r) return;
    sel[r.name.replace(/^opt-/, '')] = r.value;
    document.getElementById('pdp-error').hidden = true;
    refresh();
  });
  root.addEventListener('input', (e) => {
    const c = e.target.closest('[data-custom]');
    if (c) { custom[c.dataset.custom] = c.value; refresh(); }
  });

  // quantité
  const out = document.getElementById('qty');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    qty = Math.max(1, Math.min(cfg.limits.maxQtyPerLine, qty + Number(b.dataset.q)));
    out.textContent = qty;
  });

  // ajout au panier (validation douce côté navigateur ; le serveur revalide tout)
  document.getElementById('add-btn').addEventListener('click', () => {
    const err = document.getElementById('pdp-error');
    for (const o of product.options) {
      if (!sel[o.id]) { err.textContent = `Choisissez « ${o.label} » avant d'ajouter au panier.`; err.hidden = false; document.getElementById(`opt-${o.id}`).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (sel[o.id] === 'custom' && !(custom[o.id] || '').trim()) {
        err.textContent = `Précisez la couleur souhaitée pour « ${o.label} ».`; err.hidden = false;
        root.querySelector(`[data-custom="${o.id}"]`).focus(); return;
      }
    }
    err.hidden = true;
    const customColors = {};
    for (const o of product.options) if (sel[o.id] === 'custom') customColors[o.id] = custom[o.id].trim();
    const note = (document.getElementById('line-note') || { value: '' }).value.trim();
    Shop.cart.add({ productId: product.id, selections: { ...sel }, customColors, note, quantity: qty });
    Shop.toast(`${esc(product.name)} ajouté au panier · <a href="${Shop.url('/panier')}">Voir le panier</a>`);
  });
})();
