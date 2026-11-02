'use strict';
(async function () {
  const root = document.getElementById('cart-root');
  const { esc, money } = Shop;
  let products, cfg;
  try { [products, cfg] = await Promise.all([Shop.getProducts(), Shop.getConfig()]); }
  catch { root.innerHTML = '<p class="alert">Impossible de charger votre panier. Vérifiez votre connexion puis actualisez la page.</p>'; return; }

  function render() {
    // On retire du panier les produits supprimés du catalogue.
    const raw = Shop.cart.lines();
    const valid = raw.filter((l) => products.some((p) => p.id === l.productId));
    if (valid.length !== raw.length) { valid.forEach((l) => (l.key = l.key || Shop.lineKey(l))); localStorage.setItem('pm_cart_v1', JSON.stringify(valid)); }

    if (!valid.length) {
      root.innerHTML = `<div class="empty"><p style="margin:0 auto 16px">Votre panier est vide pour le moment.</p><a class="btn" href="${Shop.url('/creations')}">Découvrir les créations</a></div>`;
      return;
    }
    let subtotal = 0, unavailable = false;
    const rows = valid.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const total = p.price * l.quantity; subtotal += total;
      if (!p.available) unavailable = true;
      const opts = Shop.describeLine(l, p, cfg.colors).map((o) => `<span>${o.hex ? `<span class="dot-sm" style="background:${esc(o.hex)}"></span>` : ''}${esc(o.label)} : ${esc(o.value)}</span>`).join('');
      return `<li class="line" data-key="${esc(l.key)}">
        <a class="line-img" href="${Shop.productUrl(p)}"><img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="96" height="96" loading="lazy"></a>
        <div>
          <h3><a href="${Shop.productUrl(p)}">${esc(p.name)}</a></h3>
          <div class="line-opts">${opts}${l.note ? `<span>Demande : ${esc(l.note)}</span>` : ''}${!p.available ? '<span style="color:var(--danger);font-weight:700">Cette création n\'est plus disponible.</span>' : ''}</div>
          <div class="line-row">
            <div class="qty" role="group" aria-label="Quantité de ${esc(p.name)}"><button type="button" data-act="dec" aria-label="Diminuer">−</button><span aria-live="polite">${l.quantity}</span><button type="button" data-act="inc" aria-label="Augmenter">+</button></div>
            <div class="line-sum">${l.quantity} × ${money(p.price)} = ${money(total)}</div>
          </div>
          <button class="link-btn" type="button" data-act="rm">Retirer</button>
        </div></li>`;
    }).join('');

    const delivery = cfg.delivery.mode === 'flat' ? (cfg.delivery.flatFee ? money(cfg.delivery.flatFee) : 'Offerte') : 'Calculée à l\'étape suivante';
    root.innerHTML = `<div class="cart-layout">
      <ul>${rows}</ul>
      <aside class="summary" aria-labelledby="cs-h"><h2 id="cs-h">Récapitulatif</h2>
        <div class="sum-row"><span>Sous-total</span><span>${money(subtotal)}</span></div>
        <div class="sum-row"><span>Livraison</span><span>${cfg.delivery.mode === 'manual' ? 'À confirmer' : delivery}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(subtotal)}</span></div>
        <p class="fine">${cfg.delivery.mode === 'manual' ? 'Les frais de livraison vous sont communiqués à la confirmation.' : ''}</p>
        ${unavailable ? '<p class="alert">Retirez les créations indisponibles pour continuer.</p>' : ''}
        <a class="btn block" href="${Shop.url('/commande')}" ${unavailable ? 'aria-disabled="true" tabindex="-1"' : ''}>Passer commande</a>
        <p style="text-align:center;margin:10px 0 0"><a class="link-btn" href="${Shop.url('/creations')}">Continuer mes achats</a></p>
      </aside></div>`;
    if (unavailable) root.querySelector('.btn.block').addEventListener('click', (e) => e.preventDefault());
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const key = b.closest('.line').dataset.key;
    const line = Shop.cart.lines().find((l) => l.key === key);
    if (!line) return;
    if (b.dataset.act === 'inc') Shop.cart.setQty(key, line.quantity + 1);
    if (b.dataset.act === 'dec') Shop.cart.setQty(key, line.quantity - 1);
    if (b.dataset.act === 'rm') Shop.cart.remove(key);
  });
  document.addEventListener('cart:changed', render);
  render();
})();
