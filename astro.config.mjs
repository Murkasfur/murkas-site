// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Страницы по умолчанию собираются заранее (статично и быстро).
// API (src/pages/api/*) и страницы с `export const prerender = false`
// работают на Cloudflare Workers и видят D1 / R2 / KV.
export default defineConfig({
  site: 'https://murkas.net',
  // Все страницы рендерятся на Worker: так maintenance, статусы страниц
  // и данные из базы меняются сразу, без пересборки.
  output: 'server',
  adapter: cloudflare(),
  // Сессии Astro нам не нужны: настройки и статус лежат в своём KV
  session: false,
  // /photos вместо /photos/ - без лишнего редиректа при каждом переходе
  build: { format: 'file' },
  trailingSlash: 'never',
});
