'use strict';
/**
 * ============================================================
 *  CATALOGUE PRODUITS — LE SEUL FICHIER À MODIFIER POUR LES POUPÉES
 * ============================================================
 *  ⚠️  Tous les produits ci-dessous sont des DONNÉES DE DÉMONSTRATION
 *      (demo: true). Remplacez noms, prix, textes et dimensions par les vrais.
 *      Supprimez la ligne `demo: true` de chaque produit une fois remplacé.
 *
 *  Ajouter un produit = copier un bloc, changer id/slug/textes/prix,
 *  déposer les photos dans /public/images/products/ . C'est tout.
 */

// Palette de couleurs disponibles pour les poupées.
// `custom` = "Autre couleur" : le client précise la couleur en texte libre.
const colors = {
  peach:      { label: 'Pêche',       hex: '#F8C8A8' },
  cream:      { label: 'Crème',       hex: '#FFF1DC' },
  beige:      { label: 'Beige',       hex: '#E6D3B8' },
  brown:      { label: 'Marron',      hex: '#8A5E45' },
  pink:       { label: 'Rose',        hex: '#F4B6C2' },
  white:      { label: 'Blanc',       hex: '#FFFFFF' },
  green:      { label: 'Vert sauge',  hex: '#A9C5A0' },
  blue:       { label: 'Bleu ciel',   hex: '#A9CCE3' },
  lavender:   { label: 'Lavande',     hex: '#CDB8E6' },
  terracotta: { label: 'Terracotta',  hex: '#C47A5A' },
  yellow:     { label: 'Jaune doux',  hex: '#F6DD8F' },
  red:        { label: 'Rouge fraise', hex: '#D9534F' },
  custom:     { label: 'Autre couleur', hex: null },
};

const ALL = ['peach', 'cream', 'beige', 'brown', 'pink', 'white', 'green', 'blue', 'lavender', 'custom'];

const colorOption = (id, label, choices = ALL) => ({ id, label, type: 'color', choices });

const products = [
  {
    id: 'petite-lapine',
    slug: 'petite-lapine',
    name: 'Petite Lapine',
    short: 'Une douce lapine aux longues oreilles, à personnaliser.',
    description:
      "Petite Lapine est une poupée crochetée à la main, toute douce, avec de longues oreilles et un petit nez rose. Choisissez ses couleurs pour qu'elle vous ressemble.",
    price: 2500,
    images: ['/images/products/petite-lapine-1.jpg', '/images/products/petite-lapine-2.jpg'],
    available: true,
    customizable: true,
    options: [colorOption('main', 'Couleur principale'), colorOption('secondary', 'Couleur secondaire')],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 25 cm (démo — à remplacer)',
    prepTime: '5 à 7 jours (démo — à remplacer)',
    featured: true, isNew: false, bestSeller: true,
    category: 'animaux',
    seoTitle: 'Petite Lapine — poupée crochet personnalisable',
    seoDescription: 'Poupée lapine crochetée à la main, personnalisable dans les couleurs de votre choix. Livraison en Algérie.',
    demo: true,
  },
  {
    id: 'petit-ourson',
    slug: 'petit-ourson',
    name: 'Petit Ourson',
    short: 'Un ourson câlin, parfait pour une première peluche.',
    description:
      "Petit Ourson est un compagnon câlin crocheté à la main. Choisissez la couleur de son pelage et celle de son petit nœud.",
    price: 2300,
    images: ['/images/products/petit-ourson-1.jpg'],
    available: true,
    customizable: true,
    options: [colorOption('main', 'Couleur principale'), colorOption('secondary', 'Couleur secondaire')],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 22 cm (démo — à remplacer)',
    prepTime: '5 à 7 jours (démo — à remplacer)',
    featured: true, isNew: false, bestSeller: true,
    category: 'animaux',
    seoTitle: 'Petit Ourson — peluche crochet faite main',
    seoDescription: 'Petit ourson crocheté à la main, aux couleurs de votre choix. Une création unique, livrée en Algérie.',
    demo: true,
  },
  {
    id: 'petite-chatte',
    slug: 'petite-chatte',
    name: 'Petite Chatte',
    short: 'Une petite chatte au regard tendre et à la queue enroulée.',
    description:
      "Petite Chatte est crochetée maille après maille, avec de petites oreilles pointues et une queue enroulée. Personnalisez ses couleurs.",
    price: 2400,
    images: ['/images/products/petite-chatte-1.jpg'],
    available: true,
    customizable: true,
    options: [colorOption('main', 'Couleur principale'), colorOption('secondary', 'Couleur secondaire')],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 23 cm (démo — à remplacer)',
    prepTime: '5 à 7 jours (démo — à remplacer)',
    featured: true, isNew: true, bestSeller: false,
    category: 'animaux',
    seoTitle: 'Petite Chatte — poupée chat au crochet',
    seoDescription: 'Poupée chat crochetée à la main, personnalisable. Une création artisanale livrée partout en Algérie.',
    demo: true,
  },
  {
    id: 'petit-renard',
    slug: 'petit-renard',
    name: 'Petit Renard',
    short: 'Un renardeau malicieux aux couleurs d\'automne.',
    description:
      "Petit Renard a une queue touffue et un air espiègle. Choisissez ses couleurs pour un renard d'automne ou plus original.",
    price: 2600,
    images: ['/images/products/petit-renard-1.jpg'],
    available: true,
    customizable: true,
    options: [colorOption('main', 'Couleur principale'), colorOption('secondary', 'Couleur secondaire')],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 24 cm (démo — à remplacer)',
    prepTime: '6 à 8 jours (démo — à remplacer)',
    featured: true, isNew: true, bestSeller: false,
    category: 'animaux',
    seoTitle: 'Petit Renard — poupée crochet personnalisable',
    seoDescription: 'Petit renard crocheté à la main avec des couleurs au choix. Création artisanale, livraison en Algérie.',
    demo: true,
  },
  {
    id: 'petite-fraise',
    slug: 'petite-fraise',
    name: 'Petite Fraise',
    short: 'Une petite fraise toute ronde, un porte-bonheur gourmand.',
    description:
      "Petite Fraise est une mini création gourmande, crochetée à la main. Modèle non personnalisable : parfait pour un petit cadeau.",
    price: 1500,
    images: ['/images/products/petite-fraise-1.jpg'],
    available: true,
    customizable: false,
    options: [],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 10 cm (démo — à remplacer)',
    prepTime: '3 à 5 jours (démo — à remplacer)',
    featured: false, isNew: false, bestSeller: true,
    category: 'mini',
    seoTitle: 'Petite Fraise — mini peluche crochet',
    seoDescription: 'Petite fraise crochetée à la main, idée cadeau gourmande et douce. Livraison en Algérie.',
    demo: true,
  },
  {
    id: 'petit-canard',
    slug: 'petit-canard',
    name: 'Petit Canard',
    short: 'Un canard joyeux (actuellement épuisé).',
    description:
      "Petit Canard est un modèle joyeux et rond. Il est actuellement indisponible — un exemple de produit épuisé.",
    price: 1800,
    images: ['/images/products/petit-canard-1.jpg'],
    available: false,
    customizable: true,
    options: [colorOption('main', 'Couleur principale', ['yellow', 'peach', 'cream', 'white', 'custom'])],
    materials: 'Fil de coton, rembourrage polyester (démo — à remplacer)',
    dimensions: 'Environ 15 cm (démo — à remplacer)',
    prepTime: '4 à 6 jours (démo — à remplacer)',
    featured: false, isNew: false, bestSeller: false,
    category: 'mini',
    seoTitle: 'Petit Canard — peluche crochet',
    seoDescription: 'Petit canard crocheté à la main. Actuellement indisponible.',
    demo: true,
  },
];

const byId = new Map(products.map((p) => [p.id, p]));
const bySlug = new Map(products.map((p) => [p.slug, p]));

module.exports = {
  colors,
  products,
  byId: (id) => byId.get(id),
  bySlug: (slug) => bySlug.get(slug),
};
