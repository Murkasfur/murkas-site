// Проверка, что Worker и база живы: GET /api/health
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, error } from '../../lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const row = await env.DB.prepare('SELECT (SELECT count(*) FROM events) AS events, (SELECT count(*) FROM media) AS media').first();
    return json({ ok: true, db: row, time: new Date().toISOString() });
  } catch (e) {
    return error(500, `DB: ${(e as Error).message}`);
  }
};
