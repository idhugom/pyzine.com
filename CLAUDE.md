# CLAUDE.md — Pyzine, Le mag

> Guide de référence pour toute intervention de Claude sur ce dépôt.
> **But de ce fichier** : cadrer *comment* travailler (branche, qualité, clés,
> rédaction, images). Il **décrit et complète** l'existant — il ne demande **pas**
> de refondre le site actuel.

---

## Règles d'intervention Claude (importantes)

### Règle n°1 — TOUJOURS travailler sur `main` (très important)

Toute session — développement, rédaction, amélioration, correction, etc. — se fait
**directement sur la branche `main`** de GitHub. Ne **JAMAIS** créer de branche ni
travailler sur une branche secondaire. Commits clairs, puis `git push origin main`.

> Rappel : à chaque push sur `main`, GitHub Actions déclenche le build + le
> déploiement Cloudflare Pages (voir `.github/workflows/deploy.yml`). Un commit sur
> `main` est donc potentiellement une mise en ligne — vérifie que le build passe.

### Règle n°2 — Toujours en qualité optimale

Se placer systématiquement dans le **réglage le plus performant / le plus
« intelligent »** du modèle pour chaque intervention (raisonnement maximal, rédaction
la plus soignée). **Seule exception** : la génération d'images OpenAI reste en
`quality: "medium"` (voir §6) — c'est un choix volontaire de coût/rendu, pas une
baisse de qualité rédactionnelle.

### Règle n°3 — Clés API / tokens

Toutes les clés et tokens nécessaires sont **fournis par l'environnement cloud de
Claude Code**, via les variables d'environnement (`process.env`) :

| Variable | Usage |
| --- | --- |
| `OPENAI_API_KEY` | Génération des images (et, pour le pipeline hérité, du texte) |
| `OPENAI_IMAGE_MODEL` | Modèle image (défaut projet : `gpt-image-2`) |
| `OPENAI_TEXT_MODEL` | Modèle texte du pipeline hérité (défaut : `gpt-5.6-terra`) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Déploiement Cloudflare Pages |

**Récupère-les depuis l'environnement. Ne les redemande jamais. Ne les écris JAMAIS
en dur** dans le code, un fichier, ou un commit. Si une clé manque, signale-le — ne
la remplace pas par une valeur factice.

---

## Le projet en bref (état actuel — pour contexte)

**Pyzine — Le mag** est un **moteur éditorial statique haute performance** qui a
remplacé un ancien WordPress. Il publie des articles de fond, généralistes, sur des
sujets **très variés** (jardinage, cuisine, tech, auto, maison, voyage, bien-être,
sport, finance perso…).

- **Stack** : [Astro](https://astro.build) → build statique dans `dist/`, déployé sur
  **Cloudflare Pages** (projet `pyzine`, préprod `pyzine.pages.dev`).
- **Domaine canonique** : `https://www.pyzine.com` · `trailingSlash: never` ·
  URLs propres (`/mon-slug`).
- **Design** : masthead noir, **mode clair uniquement**, une seule couleur d'accent
  `#7883FF`. Type : **Instrument Serif** (titres) + **Inter** (texte), auto-hébergés.
- **Contenu** : **1 article = 1 fichier JSON** dans `src/content/articles/`
  (~627 articles). Le corps est du **HTML sémantique** dans le champ `bodyHtml`.
- **SEO** : slugs identiques à l'ancien site, redirections **301** `/<slug>.php` →
  `/<slug>` (générées au build dans `dist/_redirects`), sitemap, RSS, données
  structurées (Article, FAQ, Breadcrumb).

### Arborescence utile

```
src/
  content/articles/<slug>.json   # 1 fichier = 1 article (source de vérité du contenu)
  content.config.ts              # schéma Zod de la collection (valide au build)
  layouts/Base.astro             # <head> SEO, header, footer
  pages/
    index.astro                  # accueil (hero + mosaïque + fil)
    [slug].astro                 # page article (sommaire, progression, FAQ, related)
    articles.astro · a-propos.astro · 404.astro · rss.xml.ts
  components/ (Card, Header, Footer) · styles/ · lib/
scripts/                         # pipeline hérité (fetch WP, génération, images)
public/images/posts/<slug>.webp  # photo hero de chaque article
```

### Commandes

```bash
npm install
npm run dev       # serveur de dev
npm run build     # build statique -> dist/ (+ génère dist/_redirects)
npm run preview   # prévisualise le build
npm run ai:images # complète les photos hero manquantes (OpenAI gpt-image-2)
npm run deploy    # build + déploiement Cloudflare Pages
```

> Avant tout commit qui touche au contenu ou au code, lance **`npm run build`** :
> le schéma `content.config.ts` valide chaque JSON. Un article mal formé casse le build.

---

## Règles de rédaction

> Adapte ces réglages au projet et améliore-les si tu repères mieux — mais garde
> l'esprit : des articles **de référence**, réellement plus utiles que la concurrence.

### 0. Règles d'or (prioritaires)

1. **Rédaction par Claude, pas par l'API.** Désormais **c'est Claude qui rédige** le
   contenu des articles, **directement en session**, en produisant le fichier JSON de
   l'article. On n'utilise **plus** le pipeline OpenAI (`gpt-5.6-terra`) pour écrire
   le texte. Le pipeline (`scripts/`) reste dans le dépôt à titre historique/legacy —
   **ne pas le supprimer, ne pas s'en servir pour rédiger**. **Seules les images**
   passent encore par OpenAI (§6).
2. **Anti-cannibalisation.** Si le sujet est libre, **vérifie d'abord l'existant**
   (voir §3) : chaque nouvel article doit porter sur un sujet **distinct** de ce qui
   est déjà publié, pour éviter de se cannibaliser en SEO.
3. **Qualité avant tout.** Chaque article doit apporter **les meilleures informations
   disponibles** sur son sujet : des détails en plus et, *selon la pertinence*, des
   éléments riches (tableau, comparaison 2 colonnes, astuces, FAQ, citation,
   chiffres…). Ce sont des **exemples** : inutile de tout mettre à chaque fois (§4).
4. **Photo OpenAI obligatoire.** **Jamais** publier un article sans visuel. Toujours
   une **vraie photo hero générée par OpenAI**, « photo généraliste sur le thème,
   ultra réaliste », **avant publication** (§6).
5. **Liens internes.** Ajouter **1 à 3 liens internes** (jusqu'à 4 si pertinent) par
   article, vers d'autres pages du site (§5).

### 1. Le site en bref

Pyzine est un **magazine généraliste** francophone : un lecteur y arrive presque
toujours depuis une **recherche Google précise** (« comment faire pousser de l'ail »,
« changer une sonde lambda », « congeler une génoise »…). L'article doit **répondre
totalement à cette intention**, mieux que n'importe quel autre résultat.

- Public : grand public francophone, curieux, pressé, qui veut une réponse **fiable et
  actionnable** sans blabla.
- Registre : **magazine haut de gamme**, expert mais accessible.
- Pas de niche imposée : la force du site est la **diversité des sujets** traités avec
  le même niveau d'exigence.

### 2. Identité & ton

- **Langue** : français impeccable. **Vouvoiement** systématique.
- **Ton** : clair, vivant, expert mais accessible ; on explique, on n'assomme pas.
- **Honnêteté** : n'invente **jamais** de chiffres, prix, dates ou statistiques
  précis non vérifiables. Reste sur des informations **durables et générales**. Pas de
  fausse promesse, **pas de clickbait**, pas de remplissage.
- **Neutralité** : pas de personne célèbre nommée gratuitement, pas de marque mise en
  avant sans raison, pas d'avis médical/juridique/financier péremptoire (nuance et
  renvoi vers un professionnel quand le sujet l'exige).
- **Cohérence visuelle** : le corps utilise les blocs stylés du site (§4). Pas de
  `<h1>` dans `bodyHtml` (le titre est géré par le gabarit). Pas de section FAQ dans
  `bodyHtml` (elle vit dans le champ `faq`).

### 3. Avant d'écrire — anti-cannibalisation

Le sujet est souvent **libre**. Avant de choisir/écrire :

1. **Inventorie l'existant** — les sujets déjà couverts vivent dans
   `src/content/articles/*.json`. Rapidement :
   ```bash
   ls src/content/articles/ | sed 's/\.json$//'                 # tous les slugs
   grep -rl "<mot-clé>" src/content/articles/                    # sujets proches
   ```
2. **Écarte les doublons et quasi-doublons.** Si un angle très proche existe déjà,
   change d'angle, précise/complète l'existant, ou choisis un autre sujet.
3. **Un slug = un sujet.** Le slug doit être **unique, court, en minuscules, sans
   accents ni ponctuation**, mots séparés par des tirets (ex :
   `congeler-une-genoise-astuces`). Il devient l'URL `/<slug>` — **on ne le change
   jamais après publication** (SEO / redirections).
4. **Maille avec l'existant** plutôt que de le concurrencer : relie le nouvel article
   aux articles voisins par des liens internes (§5).

### 4. Qualité rédactionnelle

Cible : **1600 à 2600 mots**, densité élevée, zéro remplissage.

**Structure de `bodyHtml`** (HTML sémantique, sans `<h1>`, sans FAQ) :

- 1 paragraphe `<p>` d'**introduction** qui pose l'intention et la promesse (pas de
  titre au-dessus).
- Ensuite **4 à 7 sections `<h2>`** descriptives (elles alimentent le sommaire
  automatique). `<h3>` pour les sous-sections si besoin.
- Paragraphes `<p>` aérés, listes `<ul>`/`<ol>` quand c'est pertinent, `<strong>`
  pour les points saillants, `<blockquote>` pour une citation/idée forte (optionnel).

**Blocs spéciaux** (classes exactes, à utiliser **uniquement quand ça apporte de la
valeur**) :

- Encadré : `<div class="callout"><p class="callout__title">Titre</p><p>…</p></div>`
  — variantes `callout callout--warn` (mise en garde) et `callout callout--key`
  (point essentiel). **Au moins un `callout` par article.**
- Tableau (toujours enveloppé) :
  `<div class="table-wrap"><table><thead>…</thead><tbody>…</tbody></table></div>`
  — dès qu'une comparaison chiffrée/critères s'y prête.
- Comparaison 2 colonnes :
  `<div class="compare"><div class="compare__col compare__col--a"><h4>Option A</h4><ul><li>…</li></ul></div><div class="compare__col compare__col--b"><h4>Option B</h4><ul><li>…</li></ul></div></div>`
- Chiffre marquant : `<div class="stat"><div class="stat__num">7×</div><div class="stat__label">…</div></div>`

> Ces blocs sont des **exemples** : mets un tableau **ou** une comparaison quand le
> sujet s'y prête, pas systématiquement. La règle, c'est la pertinence.

**Champs de l'article** (le fichier JSON doit valider `src/content.config.ts`) :

| Champ | Règle |
| --- | --- |
| `title` | Titre lisible (peut garder l'angle exact de la requête). |
| `slug` | Unique, minuscules, sans accents, tirets (= l'URL). |
| `date` | Date ISO (`YYYY-MM-DDTHH:MM:SS`). `modified` optionnel. |
| `kicker` | Rubrique courte, 1-3 mots (ex : « Potager », « Cybersécurité »). |
| `topics` | 1 à 3 thèmes courts, capitalisés (servent aux filtres + related). |
| `excerpt` | Chapô accrocheur, ~160-240 caractères. |
| `metaTitle` | SEO, **50-62 caractères**, naturel. |
| `metaDescription` | **140-160 caractères**, naturelle. |
| `keyTakeaways` | **3 à 5** enseignements concrets « À retenir ». |
| `readingTime` | Entier (min). ≈ nombre de mots / 200. |
| `bodyHtml` | Le corps HTML (voir ci-dessus). |
| `faq` | **3 à 6** vraies questions/réponses ; `a` en HTML court (`<p>`). |
| `image` | Objet image (§6) — **jamais `null` à la publication**. |
| `featured` | `false` par défaut. |

> Astuce : recopie la structure d'un article existant récent comme gabarit, puis
> remplace le contenu. Termine **toujours** par `npm run build` pour valider.

### 5. Liens internes (1 à 4 par article)

Chaque article doit **mailler le site** : insère **1 à 3 liens internes** (jusqu'à 4
si vraiment pertinent) dans `bodyHtml`, vers d'autres articles/pages Pyzine.

- Format : lien **relatif** vers l'URL propre, `<a href="/slug-cible">ancre
  descriptive</a>` (pas d'URL absolue, pas de `.php`, pas de `/` final).
- **Vérifie que le slug cible existe** (`ls src/content/articles/`) — un lien mort est
  pire que pas de lien.
- Ancre **naturelle et descriptive** (le sujet de la cible), jamais « cliquez ici ».
- Privilégie des cibles **thématiquement proches** (même `topics`) : elles renforcent
  le maillage et rejoignent le bloc « articles liés » déjà généré automatiquement en
  bas de page par `[slug].astro`.
- Ne sur-optimise pas : des liens utiles au lecteur, insérés là où ils ont du sens.

### 6. Photo — toujours une vraie photo OpenAI avant publication

**Règle absolue : jamais publier un article sans visuel.** Toujours une **vraie photo
de couverture (hero) générée par OpenAI**, **ultra réaliste**, avant publication.

- **Une seule image (hero) par article.** Pas de galerie, pas d'image dans le corps.
- **Modèle & paramètres** (via `OPENAI_API_KEY` de l'environnement) :
  ```json
  { "model": "gpt-image-2", "size": "1536x1024", "quality": "medium" }
  ```
- **Prompt** : « photographie éditoriale **ultra réaliste**, généraliste sur le
  thème », scène crédible et concrète, lumière naturelle douce, cadrage large et
  aéré, couleurs riches et naturelles. **Aucun texte, aucun logo, aucune personne
  célèbre, pas de watermark.**
- **Sortie & stockage** : l'image est convertie en **WebP** (largeur max 1600, ~q82)
  et enregistrée dans `public/images/posts/<slug>.webp`, puis référencée dans le
  champ `image` de l'article :
  ```json
  "image": { "src": "/images/posts/<slug>.webp", "width": 1600, "height": 1024,
             "alt": "<description brève>", "generated": true }
  ```
- **Automatisation** : `npm run ai:images` génère les hero **manquants** pour les
  articles dont `image` est absent (script `scripts/gen-images.mjs`, déjà réglé sur
  `gpt-image-2` / `1536x1024` / `medium`). Renseigne un `alt` court et descriptif.

---

## Checklist avant de publier (commit sur `main`)

- [ ] Sujet **non cannibalisant** vérifié dans `src/content/articles/` (§3).
- [ ] Article rédigé **par Claude**, en français, vouvoiement, 1600-2600 mots (§4).
- [ ] Structure OK : intro, 4-7 `<h2>`, ≥1 `callout`, tableau/comparaison si pertinent,
      **pas de `<h1>`**, **pas de FAQ dans `bodyHtml`**.
- [ ] `metaTitle` (50-62), `metaDescription` (140-160), `keyTakeaways` (3-5),
      `faq` (3-6) renseignés.
- [ ] **1 à 4 liens internes** vers des slugs **existants** (§5).
- [ ] **Photo hero OpenAI** présente : `public/images/posts/<slug>.webp` + champ
      `image` rempli (§6).
- [ ] `npm run build` **passe** (schéma validé, pas d'erreur).
- [ ] Commit clair, puis `git push origin main` — **jamais** de branche (§Règle n°1).
