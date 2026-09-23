// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://bescheiben.com.br/',
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
});
