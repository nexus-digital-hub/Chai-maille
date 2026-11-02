# Petite Maille — boutique de poupées au crochet

Site vitrine + boutique de commande (sans paiement en ligne) pour une créatrice de poupées au crochet.
Le client choisit ses couleurs, remplit un formulaire, et la créatrice reçoit la commande par **WhatsApp**, puis rappelle pour confirmer. (L'envoi d'e-mail a été retiré : le code du site est public et aucune clé secrète n'y est nécessaire.)

> ## Deux façons de publier
> - **Gratuit, sur GitHub Pages (version statique, recommandée sans budget)** : voir la section « Publier gratuitement sur GitHub Pages » plus bas. La commande part uniquement par WhatsApp.
> - **Avec un serveur Node.js** (`npm start`) : numéro de commande officiel, commandes enregistrées, prix recalculés côté serveur. Nécessite un hébergeur Node.js (certains ont une offre gratuite, mais sans disque persistant).
>
> Le catalogue (`data/products.js`) et les textes sont les mêmes dans les deux cas.

## 1. Les choix techniques (et pourquoi)

| Choix | Pourquoi |
|---|---|
| **Node.js 20+ sans aucune dépendance** | Rien à installer (`npm install` inutile), moins de pannes et de failles, facile à comprendre. |
| **Pages HTML + JavaScript simple** (pas de React) | Chargement très rapide en 4G, code lisible, aucune étape de « build ». |
| **Un serveur est indispensable** | Le total doit être recalculé côté serveur, les commandes doivent être enregistrées. Un site 100 % statique ne peut pas faire cela de façon sûre. |
| **Commandes dans des fichiers JSON** (`storage/orders/`) | Zéro base de données à gérer, lisibles à la main, sauvegardables en copiant le dossier. Limite : prévu pour quelques centaines de commandes par mois. Au-delà, remplacer les 3 fonctions de `server/orders.js` par SQLite/Postgres. |
| **WhatsApp = lien pré-rempli** | L'envoi automatique exige l'API WhatsApp Business (compte Meta vérifié, modèles approuvés, jeton secret, frais). Un site seul ne peut pas l'envoyer. Ici, la page de confirmation propose un bouton qui ouvre WhatsApp avec le message prêt ; le client appuie sur « Envoyer ». Le code est prêt pour ajouter l'API plus tard (`server/notify.js`). |
| **Polices du système** | Aucun téléchargement : affichage immédiat et pas de service externe. |

## 2. Structure du projet

```
config/site.js            Configuration centrale (lit le fichier .env)
config/delivery-prices.js Tarifs de livraison par wilaya (vide par défaut)
data/products.js          LE catalogue : produits, prix, couleurs
data/wilayas.js           Les 58 wilayas
server/index.js           Serveur, API, sécurité, limitation de débit
server/orders.js          Validation, calcul des prix, numéro de commande, stockage
server/notify.js          Message WhatsApp
server/pages.js           En-tête, pied de page, SEO / Open Graph
views/*.html              Contenu de chaque page
public/css/style.css      Design (couleurs en haut du fichier)
public/js/*.js            Panier et pages
public/images/products/   Photos des poupées (à ajouter)
public/images/site/       Photo d'accueil, portrait, grille Instagram (à ajouter)
storage/orders/           Commandes enregistrées (créé automatiquement)
test/orders.test.js       Tests automatiques
scripts/build-static.js   Génère la version statique (dist/)
.github/workflows/pages.yml  Publication automatique sur GitHub Pages
public/js/order-message.js   Texte du message WhatsApp (serveur et version statique)
```

## 3. Lancer en local

1. Installer Node.js 20 ou plus (https://nodejs.org).
2. Dans le dossier du projet : copier `.env.example` en `.env`.
3. `npm start` puis ouvrir http://localhost:3000
4. Tests : `npm test` — voir les commandes reçues : `npm run orders`

## 4. Déployer

Il faut un hébergeur qui exécute Node.js (Render, Railway, Fly.io, un VPS, ou un hébergement cPanel avec « Setup Node.js App »).
Un hébergement uniquement statique ne convient pas.

1. Envoyer tous les fichiers (sauf `.env`, `storage/`, `node_modules/`).
2. Commande de démarrage : `npm start` (aucune installation ni build).
3. Définir les variables d'environnement du §6 dans le tableau de bord de l'hébergeur.
4. **Stockage persistant** : `DATA_DIR` doit pointer vers un disque persistant (sur Render/Railway : « Volume »/« Disk »). Sans cela, les commandes disparaissent à chaque redéploiement — le message WhatsApp reste alors votre seule trace.
5. Mettre `SITE_URL=https://votre-domaine`, `TRUST_PROXY=1` et `DEMO_MODE=false`. Activer le HTTPS (fourni par les hébergeurs ci-dessus).

## 5. Gérer la boutique

**Numéro WhatsApp** : variable `WHATSAPP_NUMBER` du fichier `.env` — c'est le seul endroit. Format international sans « + » : `0550 12 34 56` → `213550123456`. Redémarrer le site après modification.

**Ajouter un produit** : ouvrir `data/products.js`, copier un bloc existant à la fin de la liste, changer `id`, `slug` (lettres minuscules et tirets), `name`, textes, `price` et `images`, puis déposer les photos dans `public/images/products/` avec les noms indiqués (ex. `petite-lapine-1.jpg`). Supprimer `demo: true`. Rien d'autre à modifier : accueil, catalogue, fiche, sitemap et partage s'adaptent seuls.

**Modifier un prix** : changer `price` (en DA) dans `data/products.js`. Le serveur utilise toujours ce prix, jamais celui du navigateur.

**Rendre un produit indisponible** : `available: false`.

**Ajouter une couleur** : ajouter une ligne dans `colors` en haut de `data/products.js`, puis son identifiant dans la liste `ALL` ou dans les `choices` d'un produit.

**Livraison** (`DELIVERY_MODE`) :
- `manual` (défaut) : aucun frais calculé, affiché « à confirmer ».
- `flat` : un tarif unique, `DELIVERY_FLAT_FEE`.
- `per_wilaya` : remplir `config/delivery-prices.js` (code de wilaya → prix). Une wilaya non renseignée reste « à confirmer ». Aucun tarif n'est inventé.

**Photos** : redimensionner à environ 1200 px de large, en JPG ou WebP léger (squoosh.app) avant de les déposer, pour un chargement rapide. Le site charge les images en différé (`loading="lazy"`). Seule la taille que vous déposez est envoyée : il n'y a pas de génération automatique de plusieurs tailles.

**Textes à compléter** : ils sont surlignés en jaune (prénom de la créatrice, présentation, livraison, conditions, confidentialité).

## 6. Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port du serveur | 3000 |
| `SITE_URL` | Adresse publique (partage, sitemap) | http://localhost:PORT |
| `DEMO_MODE` | `false` pour masquer les badges « Démo » | true |
| `TRUST_PROXY` | `1` derrière un hébergeur/proxy | 0 |
| `BRAND_NAME`, `ORDER_PREFIX`, `INSTAGRAM_HANDLE`, `CONTACT_EMAIL` | Marque | Petite Maille, LSM |
| `WHATSAPP_NUMBER` | Numéro de la créatrice | 213550000000 (exemple) |
| `DELIVERY_MODE`, `DELIVERY_FLAT_FEE` | Livraison | manual, 0 |
| `DATA_DIR` | Dossier des commandes (persistant) | ./storage |
| `ORDER_RATE_LIMIT` | Commandes max par adresse IP / 15 min | 6 |

## 7. Parcours d'une commande

1. Le client choisit ses couleurs sur la fiche et ajoute au panier (le panier est gardé dans son navigateur ; une configuration différente crée une ligne distincte).
2. Il remplit le formulaire (téléphone obligatoire, 58 wilayas), vérifie le récapitulatif et confirme.
3. Le serveur valide tout, **recalcule les prix à partir du catalogue**, crée le numéro (`#LSM-2026-00001`), enregistre la commande, puis prépare le message WhatsApp.
4. La page de confirmation affiche le numéro et le total, et propose d'envoyer la commande sur WhatsApp (message prêt). La créatrice reçoit la commande sur WhatsApp dès que le client appuie sur « Envoyer ».
5. La créatrice rappelle le client pour confirmer.

## 8. Sécurité

- Prix, totaux, produits et options recalculés/validés côté serveur ; le navigateur ne décide de rien.
- Entrées nettoyées, longueurs limitées, téléphone et e-mail du client validés, corps de requête limité à 50 Ko.
- Limitation de débit (commandes et API), champ piège anti-robots, jeton anti-doublon.
- En-têtes de sécurité (CSP, anti-framing, etc.). Aucun secret dans le code ni dans le navigateur ; `.env` est exclu par `.gitignore`.
- Les données de commande contiennent des informations personnelles : protégez le serveur et le dossier `storage/`.
- Limite connue : pas de page d'administration. Les commandes se consultent sur WhatsApp ou avec `npm run orders`.

## 9. À remplacer avant le lancement

- [ ] `WHATSAPP_NUMBER` (le numéro actuel est un exemple)
- [ ] `INSTAGRAM_HANDLE`, `BRAND_NAME`, `ORDER_PREFIX`
- [ ] Produits, prix, descriptions, matériaux, dimensions, délais dans `data/products.js` (retirer `demo: true`)
- [ ] Photos produits, `public/images/site/hero.jpg`, `createur.jpg`, `insta-1.jpg` à `insta-6.jpg`
- [ ] Une image de partage `public/images/og-default.png` (1200×630) avec votre vrai logo
- [ ] Textes surlignés en jaune : prénom, présentation, livraison, conditions, confidentialité
- [ ] `DELIVERY_MODE` et tarifs
- [ ] `SITE_URL`, `TRUST_PROXY=1`, `DEMO_MODE=false`, HTTPS, disque persistant
- [ ] Passer une vraie commande test de bout en bout depuis un téléphone

## 10. Publier gratuitement sur GitHub Pages (version statique)

**Ce que fait cette version** : le site est généré en simples fichiers (`npm run build:static` → dossier `dist/`). Le client compose sa commande, puis le site ouvre WhatsApp avec le message prêt (numéro de commande local du type `#LSM-261102-JC3`). La page de confirmation lui rappelle d'appuyer sur « Envoyer » dans WhatsApp.

**Ce qu'elle ne fait pas** (il n'y a pas de serveur) :
- aucune commande n'est enregistrée : **WhatsApp est votre seule trace** (gardez la conversation) ;
- tant que le client n'a pas envoyé le message, vous ne recevez rien ;
- les prix du message viennent du navigateur du client : vérifiez le total quand vous le rappelez ;
- pas de protection anti-spam. Ces limites disparaissent avec la version serveur.

**Étapes (une seule fois)**
1. Créez un compte sur github.com, puis un dépôt **public** (par ex. `petite-maille`). Les pages gratuites exigent un dépôt public : votre code sera donc visible, mais il ne contient aucun secret.
2. Envoyez-y tout le contenu du projet (bouton « Add file → Upload files », ou `git push`). La branche doit s'appeler `main`.
3. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
4. Dans **Settings → Secrets and variables → Actions → onglet Variables → New repository variable**, créez au minimum `WHATSAPP_NUMBER` (ex. `213550123456`). Facultatives : `INSTAGRAM_HANDLE`, `BRAND_NAME`, `ORDER_PREFIX`, `DELIVERY_MODE`, `DELIVERY_FLAT_FEE`, `DEMO_MODE` (mettre `false` pour lancer), `CONTACT_EMAIL`, et `SITE_URL` si vous avez un domaine personnalisé. Ce sont des variables, pas des secrets : le numéro WhatsApp est visible sur le site de toute façon.
5. Onglet **Actions** : le workflow « Publier le site » se lance à chaque envoi sur `main` (ou à la main : « Run workflow »). Au bout d'une à deux minutes, le site est en ligne à `https://VOTRE-COMPTE.github.io/petite-maille/`.

**Mettre à jour le site** : modifiez `data/products.js` (prix, produits), ajoutez les photos dans `public/images/...`, envoyez sur GitHub : le site se republie tout seul.

**Sans le workflow** : lancez `npm run build:static` sur votre PC (avec `SITE_URL=https://VOTRE-COMPTE.github.io/petite-maille` et `WHATSAPP_NUMBER=...` dans `.env`), puis publiez le contenu du dossier `dist/` (par exemple en le glissant sur Netlify Drop, gratuit).

**Remarque** : le workflow GitHub n'a pas pu être exécuté depuis mon environnement. Le build local et le parcours complet de commande ont été testés dans un navigateur sous un sous-dossier, comme sur GitHub Pages. Si l'onglet Actions affiche une erreur, copiez-la-moi.
