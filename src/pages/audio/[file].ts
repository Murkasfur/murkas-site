// Трек для «Мой вайб»: GET /audio/<id>.<ext>
// Лежит в R2 под audio/ (кладёт только бот). Поддерживает Range-запросы:
// без них плеер в Safari/iOS не играет, а в остальных нельзя перематывать.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AUDIO_NAME } from '../../lib/media-core';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const file = params.file ?? '';
  if (!AUDIO_NAME.test(file)) return new Response('Not found', { status: 404 });
  const key = `audio/${file}`;

  const head = await env.MEDIA.head(key);
  if (!head) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=60' } });
  const size = head.size;

  const h = new Headers();
  head.writeHttpMetadata(h);
  h.set('accept-ranges', 'bytes');
  h.set('etag', head.httpEtag);
  // имя файла новое при каждой замене трека, поэтому можно кэшировать навсегда
  h.set('cache-control', 'public, max-age=31536000, immutable');

  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (m && (m[1] || m[2])) {
    let start: number, end: number;
    if (m[1]) {
      start = +m[1];
      end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    } else {
      // bytes=-500: последние 500 байт
      start = Math.max(0, size - +m[2]);
      end = size - 1;
    }
    if (start >= size || start > end) {
      h.set('content-range', `bytes */${size}`);
      return new Response(null, { status: 416, headers: h });
    }
    const obj = await env.MEDIA.get(key, { range: { offset: start, length: end - start + 1 } });
    if (!obj) return new Response('Not found', { status: 404 });
    h.set('content-range', `bytes ${start}-${end}/${size}`);
    h.set('content-length', String(end - start + 1));
    return new Response(obj.body, { status: 206, headers: h });
  }

  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  h.set('content-length', String(size));
  return new Response(obj.body, { headers: h });
};
