'use strict';
(async function () {
  const root = document.getElementById('catalog');
  const chips = [...document.querySelectorAll('[data-filter]')];
  const count = document.getElementById('result-count');
  const FILTERS = {
    toutes: () => true,
    disponibles: (p) => p.available,
    personnalisables: (p) => p.customizable && p.available,
    nouveautes: (p) => p.isNew,
    'best-sellers': (p) => p.bestSeller,
  };
  let products;
  try { products = await Shop.getProducts(); }
  catch { root.innerHTML = '<p class="empty">Impossible de charger les créations. Vérifiez votre connexion puis actualisez la page.</p>'; return; }

  function apply(name) {
    const f = FILTERS[name] ? name : 'toutes';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
    const list = products.filter(FILTERS[f]);
    root.innerHTML = list.length ? list.map(Shop.cardHtml).join('') : '<p class="empty" style="grid-column:1/-1">Aucune création ne correspond pour le moment. <button class="link-btn" type="button" data-filter-reset>Voir toutes les créations</button></p>';
    count.textContent = `${list.length} création${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}`;
    const url = new URL(location.href);
    if (f === 'toutes') url.searchParams.delete('filtre'); else url.searchParams.set('filtre', f);
    history.replaceState(null, '', url);
  }
  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter)));
  root.addEventListener('click', (e) => { if (e.target.closest('[data-filter-reset]')) apply('toutes'); });
  apply(new URL(location.href).searchParams.get('filtre') || 'toutes');
})();
