// Для каждой страницы: подтянуть живые настройки (maintenance, статусы
// страниц, «Сейчас») и поставить короткий кэш на HTML.
// Плюс поддомен portfolio.murkas.net: его адреса тихо переписываются
// на страницы /portfolio/* этого же сайта.
import { defineMiddleware } from 'astro:middleware';
import { getSettings } from './lib/settings';

const PF_HOST = /^portfolio\./;
// Эти адреса общие для всех доменов - их не переписываем
const SHARED = /^\/(api|media|audio|_astro|_image|portfolio|ru\/portfolio)(\/|$)|^\/favicon\.|^\/img\//;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const isApi = path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/audio/');
  const onPf = PF_HOST.test(ctx.url.hostname);
  ctx.locals.pfBase = onPf ? '' : '/portfolio';
  if (!isApi) ctx.locals.settings = await getSettings();

  let res: Response;
  if (onPf && !SHARED.test(path)) {
    // / -> /portfolio, /projects -> /portfolio/projects, /ru/x -> /ru/portfolio/x
    const m = path.match(/^\/ru(\/.*)?$/);
    const rest = m ? (m[1] ?? '') : path === '/' ? '' : path;
    res = await next(`${m ? '/ru' : ''}/portfolio${rest}${ctx.url.search}`);
  } else {
    res = await next();
  }

  if (!isApi && !res.headers.has('Cache-Control') && res.headers.get('Content-Type')?.includes('text/html')) {
    // maintenance отдаём без кэша, чтобы сайт сразу открылся после выключения
    res.headers.set('Cache-Control', ctx.locals.settings?.maintenance ? 'no-store' : 'public, max-age=30');
  }
  return res;
});
