import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = (await getCollection('articles')).sort(
    (a, b) => +b.data.date - +a.data.date
  );
  return rss({
    title: 'Pyzine — Le mag',
    description: 'Le mag qui décrypte, explore et raconte.',
    site: context.site!,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.excerpt,
      pubDate: a.data.date,
      link: `/${a.data.slug}`,
    })),
    customData: `<language>fr-FR</language>`,
    stylesheet: false,
  });
}
