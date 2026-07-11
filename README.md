# Pyzine — Le mag

Moteur éditorial **statique haute performance** qui remplace l'ancien WordPress.
Construit avec **Astro**, déployé sur **Cloudflare Pages**.

- **Design** : masthead noir, mode clair uniquement, une seule couleur d'accent `#7883FF`.
- **Type** : Instrument Serif (titres) + Inter (texte), auto-hébergés.
- **Contenu** : les articles sont réécrits intégralement par `gpt-5.6-terra`
  (Responses API + Batch API), avec encadrés, tableaux, comparatifs et FAQ.
- **SEO** : slugs identiques à l'ancien site, redirections 301 des anciennes URLs
  `/<slug>.php` → `/<slug>`, sitemap, RSS, données structurées (Article, FAQ, Breadcrumb).

## Commandes

```bash
npm install
npm run dev            # serveur de dev
npm run build          # build statique -> dist/ (+ génère dist/_redirects)
npm run preview        # prévisualise le build

# --- Pipeline de migration & contenu ---
npm run wp:fetch       # récupère les 625 posts WP -> data/wp-posts.json
npm run ai:pilot 20 0  # génère 20 articles en synchrone (Responses API)
npm run ai:build-batch # prépare le JSONL Batch pour les articles restants
npm run ai:submit      # envoie le job Batch à OpenAI
npm run ai:ingest      # récupère les résultats du Batch -> src/content/articles/
npm run ai:images      # récupère/génère les images à la une manquantes (gpt-image-2)

npm run deploy         # build + déploiement Cloudflare Pages (preprod)
```

## Architecture

```
src/
  content/articles/*.json   # 1 fichier = 1 article (métadonnées WP + contenu IA)
  content.config.ts         # schéma de la collection (validé)
  layouts/Base.astro        # <head> SEO, header, footer, scroll-reveal
  pages/
    index.astro             # accueil éditorial (hero + mosaïque + fil)
    [slug].astro            # page article (sommaire, progression, FAQ, related)
    articles.astro          # archive avec recherche/filtre client
    a-propos.astro · 404.astro · rss.xml.ts
  components/ · styles/ · lib/
scripts/                    # fetch WP, génération IA, images, post-build
public/                     # logo, fonts, images/posts, _headers, _redirects
```

Le **contenu est du HTML sémantique** stocké dans `bodyHtml`. Les classes
`.callout`, `.table-wrap`, `.compare`, `.stat`, `.takeaways`, `.faq` sont
stylées dans `src/styles/article.css`.

## Déploiement (Cloudflare Pages)

Projet Pages : **`pyzine`** — URL de préprod : `https://pyzine.pages.dev`.

Deux voies de déploiement sont configurées :

1. **GitHub Actions** (`.github/workflows/deploy.yml`) : à chaque push sur `main`,
   build `npm run build` puis `wrangler pages deploy dist`. Nécessite les secrets
   dépôt `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`.
2. **Direct** : `npm run deploy` depuis un poste disposant des variables Cloudflare.

### Passer le domaine en production

DNS non encore basculé (préprod le temps de valider). Une fois prêt :

1. Cloudflare Pages → projet `pyzine` → **Custom domains** → ajouter
   `www.pyzine.com` **et** `pyzine.com`.
2. Créer les enregistrements DNS (CNAME `www` → `pyzine.pages.dev`, et l'apex via
   CNAME flattening / redirection).
3. La redirection **apex → www** et les **301 `.php` → URL propre** sont déjà
   écrites dans `dist/_redirects` (générées au build). Elles s'activent dès que les
   deux domaines sont rattachés.

> Réglages build (si vous préférez l'intégration Git native du dashboard plutôt
> que GitHub Actions) : Branche `main` · Build `npm run build` · Sortie `dist` ·
> Répertoire racine vide · Commentaires de build activés.
