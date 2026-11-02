import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://brewratio.pages.dev',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
