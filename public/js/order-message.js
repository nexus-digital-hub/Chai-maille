'use strict';
/* Construit le message WhatsApp d'une commande.
   Fichier PARTAGÉ : utilisé par le serveur (require) ET par le navigateur (version statique GitHub Pages),
   pour que le message soit identique dans les deux cas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OrderMessage = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const money = (n, currency) => `${Math.round(Number(n)).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} ${currency}`;

  function build(o, currency) {
    const fmt = (n) => money(n, currency);
    const delivery = o.deliveryFee === null ? 'à confirmer avec la créatrice' : o.deliveryFee === 0 ? 'offerte' : fmt(o.deliveryFee);
    const items = o.items.map((l) => {
      const out = [`${l.quantity}x ${l.name} (${fmt(l.unitPrice)} l'unité)`];
      for (const s of l.selections) out.push(`   ${s.optionLabel} : ${s.valueLabel}`);
      if (l.note) out.push(`   Demande : ${l.note}`);
      return out.join('\n');
    });
    const c = o.customer;
    const parts = [
      '🧶 NOUVELLE COMMANDE', '',
      `Commande : ${o.number}`, '',
      '👤 CLIENT',
      `Nom : ${c.name}`,
      `Téléphone : ${c.phone}`,
      ...(c.email ? [`Email : ${c.email}`] : []),
      `Wilaya : ${c.wilaya}`,
      `Commune : ${c.commune}`,
      `Adresse : ${c.address}`, '',
      '🛍️ COMMANDE', '',
      items.join('\n\n'), '',
      `Sous-total : ${fmt(o.subtotal)}`,
      `Livraison : ${delivery}`, '',
      '💰 TOTAL',
      o.deliveryPending ? `${fmt(o.total)} (hors livraison)` : fmt(o.total),
    ];
    if (o.note) parts.push('', '📝 NOTE', o.note);
    return parts.join('\n');
  }
  return { build, money };
});
