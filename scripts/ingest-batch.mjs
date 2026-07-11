// Poll the OpenAI Batch job; when complete, parse results and write articles.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extractOutputText, toArticleRecord, postProcessHtml } from './lib/openai.mjs';
import { prepareFeaturedImage } from './lib/images.mjs';

const KEY = process.env.OPENAI_API_KEY;
const OPENAI = 'https://api.openai.com/v1';
const BATCH_DIR = new URL('../data/batch/', import.meta.url);
const ART_DIR = new URL('../src/content/articles/', import.meta.url);
await mkdir(ART_DIR, { recursive: true });

const POSTS = JSON.parse(await readFile(new URL('../data/wp-posts.json', import.meta.url)));
const bySlug = new Map(POSTS.map((p) => [p.slug, p]));

const state = JSON.parse(await readFile(new URL('state.json', BATCH_DIR)));
const bRes = await fetch(`${OPENAI}/batches/${state.batchId}`, {
  headers: { Authorization: `Bearer ${KEY}` },
});
const batch = await bRes.json();
console.log(`Batch ${batch.id}: status=${batch.status}`);
if (batch.request_counts) {
  const c = batch.request_counts;
  console.log(`  requests: total=${c.total} completed=${c.completed} failed=${c.failed}`);
}

if (batch.status !== 'completed' && batch.status !== 'finalizing') {
  if (['failed', 'expired', 'cancelled'].includes(batch.status)) {
    console.error('  Batch did not succeed.');
    if (batch.errors) console.error(JSON.stringify(batch.errors, null, 2));
    process.exit(2);
  }
  console.log('  Not ready yet. Re-run later:  node scripts/ingest-batch.mjs');
  process.exit(0);
}

async function downloadFile(id) {
  const r = await fetch(`${OPENAI}/files/${id}/content`, { headers: { Authorization: `Bearer ${KEY}` } });
  return await r.text();
}

let written = 0, failed = 0;

if (batch.output_file_id) {
  const text = await downloadFile(batch.output_file_id);
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    const slug = row.custom_id;
    const post = bySlug.get(slug);
    if (!post) continue;
    const outPath = new URL(`${slug}.json`, ART_DIR);
    if (existsSync(outPath) && process.env.FORCE !== '1') continue;
    try {
      const body = row.response?.body;
      if (!body || row.response?.status_code >= 400) throw new Error(`status ${row.response?.status_code}`);
      const gen = JSON.parse(extractOutputText(body));
      const image = await prepareFeaturedImage(post).catch(() => null);
      const record = toArticleRecord(post, gen, image);
      await writeFile(outPath, JSON.stringify(record, null, 2));
      written++;
      if (written % 25 === 0) console.log(`  …${written} written`);
    } catch (e) {
      failed++;
      console.warn(`  ⚠ ${slug}: ${e.message}`);
    }
  }
}

if (batch.error_file_id) {
  const text = await downloadFile(batch.error_file_id);
  const n = text.split('\n').filter((l) => l.trim()).length;
  if (n) console.warn(`  ${n} request errors reported by the API (error_file).`);
}

console.log(`\nIngest done: wrote ${written} articles, ${failed} failures.`);
console.log('Next: node scripts/gen-images.mjs (fill missing images) && npm run build');
