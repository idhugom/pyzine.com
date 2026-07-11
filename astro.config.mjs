// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Canonical production domain (used for sitemap, RSS, canonical tags & OG).
// Slugs are preserved 1:1 from the legacy WordPress site.
export default defineConfig({
  site: 'https://www.pyzine.com',
  trailingSlash: 'never',
  build: {
    format: 'file', // clean URLs: /mon-slug  (served as /mon-slug.html)
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
