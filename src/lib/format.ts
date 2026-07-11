const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function isoDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toISOString();
}

export function readingLabel(min: number): string {
  return `${Math.max(1, Math.round(min))} min de lecture`;
}

/** Derive a short human topic label from the slug for the card tag. */
export function topicFromSlug(topics: string[] | undefined): string {
  if (topics && topics.length) return topics[0];
  return 'Le mag';
}

/** Extract H2 anchors from generated body HTML to build a table of contents. */
export function extractHeadings(html: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  const re = /<h2[^>]*\sid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push({ id: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  return out;
}

/** Ensure every <h2> has a stable id (idempotent) so the TOC + rail can link. */
export function withHeadingIds(html: string): string {
  let i = 0;
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (full, attrs = '', inner) => {
    if (/\sid=/.test(attrs || '')) return full;
    const slug =
      inner
        .replace(/<[^>]+>/g, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `section-${++i}`;
    return `<h2${attrs || ''} id="${slug}">${inner}</h2>`;
  });
}
