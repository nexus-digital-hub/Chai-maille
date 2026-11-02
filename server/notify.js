'use strict';
/**
 * Notification de commande par WhatsApp.
 *
 * Un site web ne peut PAS envoyer un WhatsApp automatiquement sans l'API WhatsApp Business
 * (compte Meta vérifié, modèles de messages approuvés, serveur avec jeton secret, et frais).
 * On fabrique donc un lien wa.me avec le message pré-rempli ; le client l'ouvre et appuie sur « Envoyer ».
 * Le texte du message est dans public/js/order-message.js (partagé avec la version statique).
 */
const config = require('../config/site');
const OrderMessage = require('../public/js/order-message');

const fmt = (n) => OrderMessage.money(n, config.currency);
const whatsappText = (order) => OrderMessage.build(order, config.currency);

const whatsappUrl = (order) => `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(whatsappText(order))}`;

/** Lien « Contacter la créatrice » sans commande (page de confirmation, pied de page). */
function whatsappContactUrl(text = 'Bonjour ! J\'ai une question sur vos créations 🍑') {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

module.exports = { whatsappText, whatsappUrl, whatsappContactUrl, fmt };
