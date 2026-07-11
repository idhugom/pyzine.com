import { setTimeout as sleep } from 'node:timers/promises';
import { MODEL, ARTICLE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from './prompt.mjs';

const OPENAI = 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;

// --- request body used by BOTH the sync pilot and the Batch pipeline ---
export function buildRequestBody(post) {
  return {
    model: MODEL,
    input: [
      { role: 'developer', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(post) },
    ],
    reasoning: { effort: 'high', mode: 'standard' },
    text: {
      verbosity: 'high',
      format: {
        type: 'json_schema',
        name: 'pyzine_article',
        strict: true,
        schema: ARTICLE_SCHEMA,
      },
    },
    max_output_tokens: 30000,
  };
}

// Extract the assistant text from a Responses API response object.
export function extractOutputText(resp) {
  if (typeof resp.output_text === 'string' && resp.output_text) return resp.output_text;
  const parts = [];
  for (const item of resp.output ?? []) {
    if (item.type === 'message') {
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' && c.text) parts.push(c.text);
      }
    }
  }
  return parts.join('');
}

export async function callResponses(post, { retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${OPENAI}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(post)),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const resp = await res.json();
      if (resp.status === 'incomplete') {
        throw new Error(`incomplete: ${resp.incomplete_details?.reason || 'unknown'}`);
      }
      const text = extractOutputText(resp);
      const gen = JSON.parse(text);
      return { gen, usage: resp.usage };
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const wait = Math.min(3000 * 2 ** attempt, 30000);
      console.warn(`   retry ${attempt + 1}/${retries} (${err.message.slice(0, 120)}) in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// --- HTML hardening / post-processing ---
const ICONS = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout__icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout__icon"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout__icon"><path d="m13 2-3 7h6l-3 7"/><path d="M6 21h12"/></svg>',
};

export function postProcessHtml(html) {
  let out = String(html || '').trim();

  // 1) protect already-wrapped tables, wrap bare ones, restore
  out = out.replace(/<div class="table-wrap">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/gi, '§§W§§$1§§/W§§');
  out = out.replace(/<table[\s\S]*?<\/table>/gi, (m) => `<div class="table-wrap">${m}</div>`);
  out = out.replace(/§§W§§/g, '<div class="table-wrap">').replace(/§§\/W§§/g, '</div>');

  // 2) inject a callout icon if none present right after the opening tag
  out = out.replace(/<div class="callout([^"]*)">\s*(?!<svg)/gi, (full, mods) => {
    const kind = /warn/.test(mods) ? 'warn' : /key/.test(mods) ? 'key' : 'info';
    return `<div class="callout${mods}">${ICONS[kind]}`;
  });

  // 3) drop any stray <h1> the model may have added
  out = out.replace(/<h1[\s\S]*?<\/h1>/gi, '');

  return out;
}

function wordCount(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

// Merge WordPress metadata + generated content + image into a content-collection record.
export function toArticleRecord(post, gen, image) {
  const bodyHtml = postProcessHtml(gen.bodyHtml);
  const words = wordCount(bodyHtml);
  const readingTime = gen.readingTime && gen.readingTime > 0 ? gen.readingTime : Math.max(3, Math.round(words / 200));
  return {
    title: post.title,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    wpId: post.id,
    kicker: gen.kicker || (gen.topics && gen.topics[0]) || 'Le mag',
    topics: (gen.topics && gen.topics.length ? gen.topics : ['Le mag']).slice(0, 3),
    excerpt: gen.excerpt || post.excerpt || '',
    metaTitle: gen.metaTitle || post.title,
    metaDescription: gen.metaDescription || gen.excerpt || post.excerpt || '',
    keyTakeaways: gen.keyTakeaways || [],
    bodyHtml,
    faq: (gen.faq || []).map((f) => ({ q: f.q, a: f.a })),
    readingTime,
    image: image || null,
    featured: false,
  };
}
