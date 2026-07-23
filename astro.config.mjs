import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://en.hlknasalstrips.com',
  output: 'static',
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
