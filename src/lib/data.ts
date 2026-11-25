// Данные из D1 для страниц (весь сайт рендерится на Worker).
// Если база недоступна - страница всё равно открывается, просто без ивентов,
// а ошибка уходит в логи Cloudflare (observability).
import { env } from 'cloudflare:workers';
import type { EventItem } from '../data/mock';
import { listEvents } from './events';

export async function getEvents(): Promise<EventItem[]> {
  try {
    return await listEvents(env.DB);
  } catch (err) {
    console.error('getEvents failed', err);
    return [];
  }
}
