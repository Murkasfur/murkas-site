// Ивенты из базы D1 -> тот же формат, что использовали заглушки (EventItem),
// чтобы страницы не пришлось переписывать.
import type { EventItem, L, Attendance } from '../data/mock';

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
});

/** Все ивенты по дате + число опубликованных фото у каждого */
export async function listEvents(db: D1Database): Promise<EventItem[]> {
  const { results } = await db
    .prepare(
      `SELECT e.*, (SELECT count(*) FROM media m WHERE m.event_id = e.id AND m.status = 'published') AS photos
       FROM events e
       ORDER BY coalesce(e.start_date, e.sort_key)`,
    )
    .all<EventRow>();
  return results.map(rowToEvent);
}
