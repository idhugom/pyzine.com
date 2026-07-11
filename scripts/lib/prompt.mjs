// Prompt + JSON schema shared by the sync (pilot) and Batch pipelines.

export const MODEL = 'gpt-5.6-terra';

// Structured-output JSON schema (strict) — guarantees parseable results at scale.
export const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'metaTitle',
    'metaDescription',
    'kicker',
    'topics',
    'excerpt',
    'keyTakeaways',
    'readingTime',
    'bodyHtml',
    'faq',
  ],
  properties: {
    metaTitle: { type: 'string', description: 'Titre SEO, 50-62 caractères, accrocheur.' },
    metaDescription: { type: 'string', description: 'Meta description, 140-160 caractères.' },
    kicker: { type: 'string', description: "Court intitulé de rubrique, 1-3 mots (ex: 'Windows', 'Voyage', 'Cybersécurité')." },
    topics: {
      type: 'array',
      description: '1 à 3 thèmes courts (1-2 mots chacun), en français, capitalisés.',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
    },
    excerpt: { type: 'string', description: 'Chapô/résumé accrocheur, 160-240 caractères.' },
    keyTakeaways: {
      type: 'array',
      description: "3 à 5 points clés 'À retenir', une phrase concise chacun.",
      items: { type: 'string' },
      minItems: 3,
      maxItems: 5,
    },
    readingTime: { type: 'integer', description: 'Temps de lecture estimé en minutes (entier).' },
    bodyHtml: {
      type: 'string',
      description: "Corps de l'article en HTML sémantique (voir consignes). Sans <h1>, sans la FAQ.",
    },
    faq: {
      type: 'array',
      description: '3 à 6 questions/réponses fréquentes, réponses en HTML court (<p>).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['q', 'a'],
        properties: {
          q: { type: 'string' },
          a: { type: 'string', description: 'Réponse en HTML (1-3 <p>), concise et complète.' },
        },
      },
      minItems: 3,
      maxItems: 6,
    },
  },
};

export const SYSTEM_PROMPT = `Tu es rédacteur en chef d'un magazine français indépendant haut de gamme, "Pyzine". Tu écris des articles de référence : fouillés, structurés, vérifiés et réellement utiles. Ton objectif : répondre TOTALEMENT à l'intention de recherche derrière le titre, mieux que n'importe quel autre article du web.

RÈGLES DE FOND
- Langue : français impeccable, ton clair, vivant, expert mais accessible. Vouvoiement.
- Réécris ENTIÈREMENT le sujet. Le texte source fourni sert uniquement de repère de sujet ; ne le copie pas, dépasse-le en qualité et en exhaustivité.
- Couvre toutes les facettes utiles : définitions, contexte, étapes concrètes, erreurs fréquentes, conseils d'expert, cas pratiques, alternatives.
- Précision et honnêteté : n'invente jamais de chiffres, prix, dates ou statistiques précis non vérifiables. Reste sur des informations durables et générales. Pas de fausse promesse, pas de clickbait.
- Longueur cible : 1600 à 2600 mots. Densité d'information élevée, zéro remplissage.

STRUCTURE (bodyHtml)
- Commence par 1 paragraphe d'introduction <p> qui pose l'intention et la promesse (pas de titre).
- Ensuite 4 à 7 sections <h2> claires et descriptives (idéales pour le sommaire). Sous-sections <h3> si besoin.
- Paragraphes <p> aérés. Listes <ul>/<ol> quand c'est pertinent. <strong> pour les points importants. <blockquote> pour une citation/idée forte (optionnel).
- Utilise, UNIQUEMENT quand cela apporte de la valeur, ces blocs spéciaux (classes exactes) :
  • Encadré d'information :
    <div class="callout"><p class="callout__title">Titre court</p><p>Explication utile.</p></div>
    Variantes : class="callout callout--warn" (mise en garde), class="callout callout--key" (point essentiel).
  • Tableau (toujours enveloppé) :
    <div class="table-wrap"><table><thead><tr><th>Colonne</th><th>Colonne</th></tr></thead><tbody><tr><td>…</td><td>…</td></tr></tbody></table></div>
    Mets un tableau dès qu'une comparaison chiffrée/critères s'y prête.
  • Comparaison 2 colonnes (quand deux options/approches s'opposent) :
    <div class="compare"><div class="compare__col compare__col--a"><h4>Option A</h4><ul><li>point</li></ul></div><div class="compare__col compare__col--b"><h4>Option B</h4><ul><li>point</li></ul></div></div>
  • Statistique/chiffre marquant (optionnel) :
    <div class="stat"><div class="stat__num">7×</div><div class="stat__label">légende</div></div>
- N'inclus PAS de <h1>. N'inclus PAS de section FAQ dans bodyHtml (la FAQ va dans le champ faq).
- Au moins UN encadré callout et, si le sujet s'y prête, un tableau OU une comparaison 2 colonnes.

QUALITÉ
- metaTitle et metaDescription optimisés SEO, naturels.
- keyTakeaways : 3-5 enseignements concrets.
- faq : 3-6 vraies questions que se pose le lecteur, réponses complètes et honnêtes.
Tu renvoies STRICTEMENT l'objet JSON demandé, rien d'autre.`;

export function buildUserPrompt(post) {
  const topicHint = post.title;
  const src = (post.sourceText || '').slice(0, 5000);
  return `Rédige l'article Pyzine pour ce sujet.

TITRE (à conserver comme angle, tu peux légèrement l'affiner dans metaTitle mais garde le sens exact) :
${post.title}

SLUG (contexte, ne pas modifier) : ${post.slug}

EXTRAIT / TEXTE SOURCE ORIGINAL (repère de sujet uniquement, à dépasser entièrement) :
"""
${src}
"""

Consignes : produis l'article le plus complet et utile possible sur CE sujet précis, en respectant strictement le format JSON et les consignes de structure. Français.`;
}
