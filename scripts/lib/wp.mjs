// Small helpers shared by migration scripts.
import { setTimeout as sleep } from 'node:timers/promises';

export const WP_BASE = 'https://www.pyzine.com/wp-json/wp/v2';

/** Fetch JSON with retries + exponential backoff. */
export async function getJSON(url, { retries = 5, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { data: await res.json(), headers: res.headers };
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const wait = Math.min(2000 * 2 ** attempt, 20000);
      console.warn(`  retry ${attempt + 1}/${retries} after ${wait}ms — ${err.message}`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/** Decode common HTML entities found in WP rendered titles. */
export function decodeEntities(str = '') {
  return str
    .replace(/&#8217;|&#x2019;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#8239;|&#160;|&nbsp;/g, ' ')
    .replace(/&#8203;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/** Strip HTML to readable plain text (for feeding the AI as source context). */
export function htmlToText(html = '') {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

export const slugify = (s) =>
  decodeEntities(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
