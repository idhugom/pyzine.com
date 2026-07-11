// Fill in missing featured images.
//  1) retry downloading the original WordPress image (with size fallback)
//  2) otherwise generate an ultra-realistic photo with gpt-image-2
// Patches the article JSON in place.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import sharp from 'sharp';
import { prepareFeaturedImage } from './lib/images.mjs';

const KEY = process.env.OPENAI_API_KEY;
const OPENAI = 'https://api.openai.com/v1';
const ART_DIR = new URL('../src/content/articles/', import.meta.url);
const IMG_DIR = new URL('../public/images/posts/', import.meta.url);
await mkdir(IMG_DIR, { recursive: true });

const POSTS = JSON.parse(await readFile(new URL('../data/wp-posts.json', import.meta.url)));
const bySlug = new Map(POSTS.map((p) => [p.slug, p]));

function imagePrompt(title, topics) {
  const theme = (topics || []).join(', ');
  return `Photographie éditoriale ultra réaliste, qualité magazine, illustrant le sujet : « ${title} »${theme ? ` (thèmes : ${theme})` : ''}. Scène crédible et concrète, lumière naturelle douce, profondeur de champ, cadrage large et aéré, couleurs riches et naturelles. Aucun texte, aucun logo, aucune personne célèbre, pas de watermark.`;
}

async function generate(prompt, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(`${OPENAI}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1536x1024', quality: 'medium' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) throw new Error('no image data');
      return Buffer.from(b64, 'base64');
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(4000 * 2 ** i);
    }
  }
  throw lastErr;
}

const files = (await readdir(ART_DIR)).filter((f) => f.endsWith('.json'));
const targets = [];
for (const f of files) {
  const data = JSON.parse(await readFile(new URL(f, ART_DIR)));
  if (!data.image) targets.push({ file: f, data });
}
console.log(`${targets.length} article(s) without an image.`);

const CONCURRENCY = Number(process.env.IMG_CONCURRENCY || 4);
let recovered = 0, generated = 0, failed = 0, done = 0;

async function handle({ file, data }) {
  const post = bySlug.get(data.slug) || { slug: data.slug, title: data.title, image: null };
  // 1) retry original
  try {
    const orig = await prepareFeaturedImage(post, { force: true });
    if (orig) {
      data.image = orig;
      await writeFile(new URL(file, ART_DIR), JSON.stringify(data, null, 2));
      recovered++;
      return;
    }
  } catch {}
  // 2) generate
  try {
    const buf = await generate(imagePrompt(data.title, data.topics));
    const out = await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const meta = await sharp(out).metadata();
    const rel = `/images/posts/${data.slug}.webp`;
    await sharp(out).toFile(decodeURIComponent(new URL(`${data.slug}.webp`, IMG_DIR).pathname));
    data.image = { src: rel, width: meta.width, height: meta.height, alt: data.title, generated: true };
    await writeFile(new URL(file, ART_DIR), JSON.stringify(data, null, 2));
    generated++;
  } catch (e) {
    failed++;
    console.warn(`  ❌ ${data.slug}: ${e.message}`);
  }
}

async function worker(queue) {
  while (queue.length) {
    const item = queue.shift();
    await handle(item);
    done++;
    if (done % 20 === 0) console.log(`  …${done}/${targets.length} (recovered ${recovered}, generated ${generated}, failed ${failed})`);
  }
}

const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
console.log(`\nDone. recovered=${recovered} generated=${generated} failed=${failed}`);
