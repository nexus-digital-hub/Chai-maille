'use strict';
(async function () {
  const root = document.getElementById('featured');
  try {
    const products = await Shop.getProducts();
    let list = products.filter((p) => p.featured);
    if (!list.length) list = products.slice(0, 4);
    root.innerHTML = list.slice(0, 4).map(Shop.cardHtml).join('');
  } catch {
    root.innerHTML = '<p class="empty">Impossible de charger les créations pour le moment. Actualisez la page.</p>';
  }
})();
