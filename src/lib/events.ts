// Ивенты из базы D1 -> тот же формат, что использовали заглушки (EventItem),
// чтобы страницы не пришлось переписывать.
import type { EventItem, EventKind, Suit, L, Attendance } from '../data/mock';

export type EventRow = {
  id: string;
  title_ru: string;
  title_en: string | null;
  city_ru: string;
  city_en: string | null;
  start_date: string | null;
  end_date: string | null;
  approx_ru: string | null;
  approx_en: string | null;
  sort_key: string | null;
  status: Attendance;
  url: string | null;
  start_time: string | null;
  end_time: string | null;
  kind: EventKind | null;
  venue_ru: string | null;
  venue_en: string | null;
  suit: Suit | null;
  photos: number | null;
};

const pair = (ru: string | null, en: string | null): L | undefined =>
  ru == null ? undefined : en && en !== ru ? { ru, en } : ru;

export const rowToEvent = (r: EventRow): EventItem => ({
  id: r.id,
  title: pair(r.title_ru, r.title_en)!,
  city: pair(r.city_ru, r.city_en)!,
  start: r.start_date,
  end: r.end_date ?? undefined,
  approx: pair(r.approx_ru, r.approx_en),
  sortKey: r.sort_key ?? undefined,
  status: r.status,
  photos: r.photos ?? undefined,
  startTime: r.start_time ?? undefined,
  endTime: r.end_time ?? undefined,
  url: r.url ?? undefined,
  kind: r.kind ?? undefined,
  venue: pair(r.venue_ru, r.venue_en),
  suit: r.suit ?? undefined,
});

/** Все ивенты по дате + число опубликованных фото у каждого + до 3 превью */
export async function listEvents(db: D1Database): Promise<EventItem[]> {
  const [events, previews] = await db.batch([
    db.prepare(
      `SELECT e.*, (SELECT count(*) FROM media m WHERE m.event_id = e.id AND m.kind = 'photo' AND m.status = 'published') AS photos
       FROM events e
       ORDER BY coalesce(e.start_date, e.sort_key)`,
    ),
    db.prepare(
      `SELECT event_id, r2_key FROM (
         SELECT event_id, r2_key, row_number() OVER (PARTITION BY event_id ORDER BY pinned DESC, coalesce(taken_date, published_at) DESC) AS n
         FROM media WHERE kind = 'photo' AND status = 'published' AND event_id IS NOT NULL AND r2_key IS NOT NULL
       ) WHERE n <= 3`,
    ),
  ]);
  const byEvent = new Map<string, string[]>();
  for (const p of previews.results as { event_id: string; r2_key: string }[]) {
    byEvent.set(p.event_id, [...(byEvent.get(p.event_id) ?? []), `/media/${p.r2_key.split('/').pop()}?w=400`]);
  }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  return (events.results as EventRow[]).map((r) => attended({ ...rowToEvent(r), previews: byEvent.get(r.id) }, today));
}

const GOING = new Set(['full', 'partial', 'nosuit']);

/**
 * Ивент прошёл, а статус всё ещё «Буду в…» - значит был. Показываем «Был» и считаем в статистике,
 * а в чём был - берём из прежнего статуса. В базе ничего не меняется: если не пошёл,
 * достаточно поставить в боте «Не был» / «Не смогу».
 */
function attended(e: EventItem, today: string): EventItem {
  const end = e.end ?? e.start;
  if (!end || end >= today || !GOING.has(e.status)) return e;
  return { ...e, status: 'went', suit: e.suit ?? (e.status as EventItem['suit']) };
}

/** Фото для статистики: всего опубликовано и сколько из них загрузили гости через сайт */
export async function photoStats(db: D1Database) {
  const r = await db
    .prepare(`SELECT count(*) AS total, count(batch_id) AS guests FROM media WHERE kind = 'photo' AND status = 'published'`)
    .first<{ total: number; guests: number }>();
  return { total: r?.total ?? 0, guests: r?.guests ?? 0 };
}
