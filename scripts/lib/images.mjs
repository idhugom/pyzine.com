import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT_DIR = new URL('../../public/images/posts/', import.meta.url);
export const POSTS_IMG_DIR = OUT_DIR;

async function fetchBuffer(url, retries = 4) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(1500 * 2 ** i);
    }
  }
  throw lastErr;
}

/**
 * Download + optimize the existing WordPress featured image for a post.
 * Produces public/images/posts/<slug>.webp (max width 1600, q82).
 * Returns the image record or null if the post has no featured image.
 */
export async function prepareFeaturedImage(post, { force = false } = {}) {
  if (!post.image || !post.image.url) return null;
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = new URL(`${post.slug}.webp`, OUT_DIR);
  const rel = `/images/posts/${post.slug}.webp`;
  if (existsSync(outPath) && !force) {
    const meta = await sharp(outPath).metadata();
    return { src: rel, width: meta.width, height: meta.height, alt: post.image.alt || post.title, generated: false };
  }
  // Try the full-res URL first, then fall back to the sized URL, then thumb.
  const candidates = [...new Set([post.image.fullUrl, post.image.url].filter(Boolean))];
  let buf;
  let lastErr;
  for (const u of candidates) {
    try { buf = await fetchBuffer(u, 2); break; } catch (e) { lastErr = e; }
  }
  if (!buf) throw lastErr || new Error('no image url');
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  const targetW = Math.min(1600, meta.width || 1600);
  const out = await img.resize({ width: targetW, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await sharp(out).toFile(fileURLToPathSafe(outPath));
  const outMeta = await sharp(out).metadata();
  return { src: rel, width: outMeta.width, height: outMeta.height, alt: post.image.alt || post.title, generated: false };
}

// tiny helper (avoid importing node:url everywhere)
function fileURLToPathSafe(u) {
  return decodeURIComponent(u.pathname);
}
