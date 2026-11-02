'use strict';
/**
 * TARIFS DE LIVRAISON PAR WILAYA (utilisés uniquement si DELIVERY_MODE=per_wilaya).
 *
 * Aucun tarif n'est inventé : ce fichier est vide par défaut.
 * Une wilaya absente de la liste = "frais à confirmer avec la créatrice".
 *
 * Clé = code de la wilaya (1 à 58), valeur = prix en DA. Exemple :
 *
 *   module.exports = {
 *     16: 600,   // Alger
 *     31: 700,   // Oran
 *   };
 */
module.exports = {};
