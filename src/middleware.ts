// Для каждой страницы: подтянуть живые настройки (maintenance, статусы
// страниц, «Сейчас») и поставить короткий кэш на HTML.
import { defineMiddleware } from 'astro:middleware';
import { getSettings } from './lib/settings';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const isApi = ctx.url.pathname.startsWith('/api/') || ctx.url.pathname.startsWith('/media/');
  if (!isApi) ctx.locals.settings = await getSettings();
  const res = await next();
  if (!isApi && !res.headers.has('Cache-Control') && res.headers.get('Content-Type')?.includes('text/html')) {
    // maintenance отдаём без кэша, чтобы сайт сразу открылся после выключения
    res.headers.set('Cache-Control', ctx.locals.settings?.maintenance ? 'no-store' : 'public, max-age=30');
  }
  return res;
});
