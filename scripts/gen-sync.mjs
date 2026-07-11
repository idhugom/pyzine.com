// Synchronous pilot generator (Responses API). Validates the prompt + full
// pipeline end-to-end and populates the site with real articles.
//
// Usage:
//   node scripts/gen-sync.mjs [count] [offset]
//   node scripts/gen-sync.mjs --slugs slug-a,slug-b
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { callResponses, toArticleRecord } from './lib/openai.mjs';
import { prepareFeaturedImage } from './lib/images.mjs';

const POSTS = JSON.parse(await readFile(new URL('../data/wp-posts.json', import.meta.url)));
const ART_DIR = new URL('../src/content/articles/', import.meta.url);
await mkdir(ART_DIR, { recursive: true });

const args = process.argv.slice(2);
let selection;
if (args[0] === '--slugs') {
  const set = new Set(args[1].split(','));
  selection = POSTS.filter((p) => set.has(p.slug));
} else {
  const count = Number(args[0] || 12);
  const offset = Number(args[1] || 0);
  selection = POSTS.slice(offset, offset + count);
}

const CONCURRENCY = 3;
const results = { ok: 0, skip: 0, fail: 0, tokens: 0 };

async function worker(queue) {
  while (queue.length) {
    const post = queue.shift();
    const outPath = new URL(`${post.slug}.json`, ART_DIR);
    if (existsSync(outPath) && process.env.FORCE !== '1') {
      results.skip++;
      console.log(`  ⏭  ${post.slug} (exists)`);
      continue;
    }
    try {
      const [image, { gen, usage }] = await Promise.all([
        prepareFeaturedImage(post).catch((e) => {
          console.warn(`  ⚠ image ${post.slug}: ${e.message}`);
          return null;
        }),
        callResponses(post),
      ]);
      const record = toArticleRecord(post, gen, image);
      await writeFile(outPath, JSON.stringify(record, null, 2));
      results.ok++;
      results.tokens += usage?.total_tokens || 0;
      console.log(`  ✅ ${post.slug}  (${(record.bodyHtml.match(/<h2/g) || []).length} sections, ${record.faq.length} FAQ, ${usage?.output_tokens || '?'} out-tok)`);
    } catch (e) {
      results.fail++;
      console.error(`  ❌ ${post.slug}: ${e.message}`);
    }
  }
}

console.log(`Generating ${selection.length} articles with gpt-5.6-terra (concurrency ${CONCURRENCY})…\n`);
const queue = [...selection];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
console.log(`\nDone. ok=${results.ok} skip=${results.skip} fail=${results.fail} total_tokens≈${results.tokens}`);
