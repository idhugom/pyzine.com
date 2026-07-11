// Build the OpenAI Batch input file (JSONL) for every post that does NOT yet
// have a generated article. custom_id = slug.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { buildRequestBody } from './lib/openai.mjs';

const POSTS = JSON.parse(await readFile(new URL('../data/wp-posts.json', import.meta.url)));
const ART_DIR = new URL('../src/content/articles/', import.meta.url);
const BATCH_DIR = new URL('../data/batch/', import.meta.url);
await mkdir(BATCH_DIR, { recursive: true });

let existing = new Set();
try {
  existing = new Set((await readdir(ART_DIR)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));
} catch {}

const onlyMissing = process.env.ALL === '1' ? false : true;
const todo = POSTS.filter((p) => !(onlyMissing && existing.has(p.slug)));

const lines = todo.map((p) =>
  JSON.stringify({
    custom_id: p.slug,
    method: 'POST',
    url: '/v1/responses',
    body: buildRequestBody(p),
  })
);

const outFile = new URL('requests.jsonl', BATCH_DIR);
await writeFile(outFile, lines.join('\n') + '\n');
console.log(`build-batch: ${todo.length} requests -> data/batch/requests.jsonl`);
console.log(`  (skipped ${existing.size} already-generated; set ALL=1 to include everything)`);
