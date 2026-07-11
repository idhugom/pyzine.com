// Fetch all posts from the live WordPress REST API and normalize them.
// Output: data/wp-posts.json  (metadata + original text for AI context)
import { mkdir, writeFile } from 'node:fs/promises';
import { WP_BASE, getJSON, decodeEntities, htmlToText } from './lib/wp.mjs';

const PER_PAGE = 100;
const OUT = new URL('../data/', import.meta.url);

function pickImage(media) {
  if (!media) return null;
  const d = media.media_details || {};
  const sizes = d.sizes || {};
  const best =
    sizes.large || sizes['1536x1536'] || sizes.full || sizes.medium_large || null;
  return {
    url: (best && best.source_url) || media.source_url,
    fullUrl: media.source_url,
    width: (best && best.width) || d.width || null,
    height: (best && best.height) || d.height || null,
    alt: decodeEntities(media.alt_text || ''),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // 1) discover page count
  const first = await getJSON(`${WP_BASE}/posts?per_page=${PER_PAGE}&page=1&_fields=id`);
  const totalPages = Number(first.headers.get('x-wp-totalpages') || '1');
  const total = Number(first.headers.get('x-wp-total') || '0');
  console.log(`WordPress reports ${total} posts across ${totalPages} pages.`);

  const fields = 'id,slug,title,date,modified,featured_media,categories,tags,content,excerpt,link';
  const posts = [];
  for (let page = 1; page <= totalPages; page++) {
    const { data } = await getJSON(`${WP_BASE}/posts?per_page=${PER_PAGE}&page=${page}&_fields=${fields}`);
    posts.push(...data);
    console.log(`  page ${page}/${totalPages} — ${data.length} posts (running total ${posts.length})`);
  }

  // 2) resolve featured media in batches
  const mediaIds = [...new Set(posts.map((p) => p.featured_media).filter(Boolean))];
  const mediaMap = new Map();
  const mFields = 'id,source_url,alt_text,media_details';
  for (let i = 0; i < mediaIds.length; i += 100) {
    const chunk = mediaIds.slice(i, i + 100);
    const { data } = await getJSON(
      `${WP_BASE}/media?include=${chunk.join(',')}&per_page=100&_fields=${mFields}`
    );
    for (const m of data) mediaMap.set(m.id, m);
    console.log(`  media ${Math.min(i + 100, mediaIds.length)}/${mediaIds.length}`);
  }

  // 3) normalize
  const normalized = posts
    .map((p) => {
      const media = mediaMap.get(p.featured_media);
      const image = pickImage(media);
      return {
        id: p.id,
        slug: p.slug,
        title: decodeEntities(p.title?.rendered || ''),
        date: p.date,
        modified: p.modified,
        categories: p.categories || [],
        tags: p.tags || [],
        originalLink: p.link,
        hasFeaturedImage: Boolean(image && image.url),
        image, // {url, fullUrl, width, height, alt} or null
        excerpt: htmlToText(p.excerpt?.rendered || ''),
        // trimmed original body — used only as source context for the rewrite
        sourceText: htmlToText(p.content?.rendered || '').slice(0, 7000),
      };
    })
    // newest first
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  await writeFile(new URL('wp-posts.json', OUT), JSON.stringify(normalized, null, 2));
  const withImg = normalized.filter((p) => p.hasFeaturedImage).length;
  console.log(`\nSaved ${normalized.length} posts -> data/wp-posts.json`);
  console.log(`  with featured image: ${withImg}`);
  console.log(`  missing image (need generation): ${normalized.length - withImg}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
