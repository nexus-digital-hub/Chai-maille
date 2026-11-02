'use strict';
(function () {
  let o = null;
  try { o = JSON.parse(sessionStorage.getItem('pm_last_order') || 'null'); } catch { /* ignore */ }
  const root = document.getElementById('thanks-root');
  if (!o) {
    root.innerHTML = `<h1>Aucune commande à afficher</h1><p class="muted">Si vous venez d'envoyer une commande, nous vous contacterons au numéro indiqué.</p><div class="stack"><a class="btn" href="${Shop.url('/creations')}">Voir les créations</a></div>`;
    return;
  }
  document.getElementById('t-num').textContent = o.number;
  document.getElementById('t-total').textContent = Shop.money(o.total);
  document.getElementById('t-del').textContent = o.deliveryPending ? 'Hors frais de livraison, communiqués à la confirmation.' : '';
  document.getElementById('t-wa').href = o.whatsappUrl;
  if (Shop.STATIC) {
    // Sans serveur, la commande n'existe pour la créatrice qu'une fois le message WhatsApp envoyé.
    document.getElementById('t-title').textContent = 'Dernière étape 🍑';
    document.getElementById('t-lead').textContent = 'Envoyez votre commande sur WhatsApp pour qu\'elle nous parvienne.';
    document.getElementById('t-muted').textContent = 'Votre commande n\'est pas encore reçue : dans WhatsApp, appuyez sur « Envoyer ». Nous vous contacterons ensuite pour confirmer les détails.';
    document.getElementById('t-help').textContent = 'WhatsApp ne s\'est pas ouvert ? Appuyez sur le bouton ci-dessus, ou copiez le message et collez-le dans une conversation avec nous.';
    const copy = document.getElementById('t-copy');
    if (o.text && navigator.clipboard) {
      copy.hidden = false;
      copy.addEventListener('click', () => navigator.clipboard.writeText(o.text).then(() => Shop.toast('Message copié'), () => Shop.toast('Copie impossible : utilisez le bouton WhatsApp')));
    }
  }
})();
