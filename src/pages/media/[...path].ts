// Опубликованные фото и арты: GET /media/<id>.<ext>
// Лежат в R2 под media/ (туда попадает только принятое модератором).
//   ?w=400|800|1600 - уменьшенная копия в WebP (через Cloudflare Images; первые 5000 разных в месяц бесплатно)
//   без ?w          - оригинал (кнопка «Скачать»)
// Ответ кэшируется в Cloudflare, поэтому каждая картинка уменьшается и читается из R2 один раз.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const WIDTHS = [400, 800, 1600];
type Images = {
  input(s: ReadableStream): { transform(o: object): { output(o: object): Promise<{ response(): Response }> } };
};

export const GET: APIRoute = async ({ params, url }) => {
  const path = params.path ?? '';
  if (!/^[a-z0-9]{6,20}\.(jpg|png|webp|gif)$/.test(path)) return new Response('Not found', { status: 404 });
  const w = WIDTHS.includes(Number(url.searchParams.get('w'))) && !path.endsWith('.gif') ? Number(url.searchParams.get('w')) : 0;

  // ключ кэша без лишних параметров, чтобы ?w=123 и прочий мусор не плодили копии
  const key = new Request(`${url.origin}/media/${path}${w ? `?w=${w}` : ''}`);
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit;

  const obj = await env.MEDIA.get(`media/${path}`);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=60' } });

  let res: Response | null = null;
  const images = (env as unknown as { IMAGES?: Images }).IMAGES;
  if (w && images) {
    try {
      const out = await images.input(obj.body).transform({ width: w, fit: 'scale-down' }).output({ format: 'image/webp', quality: 82 });
      const r = out.response();
      res = new Response(r.body, { headers: { 'content-type': 'image/webp' } });
    } catch (err) {
      console.error('resize failed, serving original', err);
    }
  }
  if (!res) {
    // если уменьшить не вышло, тело уже прочитано - берём файл заново
    const orig = w && images ? await env.MEDIA.get(`media/${path}`) : obj;
    if (!orig) return new Response('Not found', { status: 404 });
    const h = new Headers();
    orig.writeHttpMetadata(h);
    res = new Response(orig.body, { headers: h });
  }
  res.headers.set('cache-control', 'public, max-age=31536000, immutable');
  res.headers.set('etag', `${obj.httpEtag}${w ? `-w${w}` : ''}`);
  await cache?.put(key, res.clone()).catch(() => {});
  return res;
};
