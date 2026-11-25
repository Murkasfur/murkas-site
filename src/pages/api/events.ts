// Список ивентов: GET /api/events
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { listEvents } from '../../lib/events';
import { json } from '../../lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  const events = await listEvents(env.DB);
  return json({ ok: true, events }, { headers: { 'cache-control': 'public, max-age=60' } });
};
