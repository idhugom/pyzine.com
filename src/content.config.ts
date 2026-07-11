import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each article is a self-contained JSON file produced by the migration +
// AI content pipeline (metadata from WordPress, body rewritten by gpt-5.6-terra).
const articles = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    modified: z.coerce.date().optional(),
    kicker: z.string().optional(),
    excerpt: z.string(),
    metaTitle: z.string().optional(),
    metaDescription: z.string(),
    keyTakeaways: z.array(z.string()).default([]),
    bodyHtml: z.string(),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    readingTime: z.number().default(6),
    topics: z.array(z.string()).default([]),
    image: z
      .object({
        src: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        alt: z.string().default(''),
        credit: z.string().optional(),
        generated: z.boolean().default(false),
      })
      .nullable()
      .default(null),
    featured: z.boolean().default(false),
    wpId: z.number().optional(),
  }),
});

export const collections = { articles };
