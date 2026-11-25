// Ивенты: разбор того, что ты пишешь боту, и работа с таблицей events.

export type Status = 'full' | 'partial' | 'nosuit' | 'cant' | 'went' | 'missed';
export const STATUSES: { key: Status; ru: string; emoji: string }[] = [
  { key: 'full', ru: 'Буду в фулле', emoji: '🦝' },
  { key: 'partial', ru: 'Буду в партиале', emoji: '🐾' },
  { key: 'nosuit', ru: 'Буду без сьюта', emoji: '🙂' },
  { key: 'cant', ru: 'Не смогу', emoji: '🚫' },
  { key: 'went', ru: 'Был', emoji: '✅' },
  { key: 'missed', ru: 'Не был', emoji: '➖' },
];
export const statusLabel = (s: string) => {
  const x = STATUSES.find((v) => v.key === s);
  return x ? `${x.emoji} ${x.ru}` : s;
};

export type EventDraft = {
  title_ru?: string;
  title_en?: string | null;
  city_ru?: string;
  city_en?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  approx_ru?: string | null;
  approx_en?: string | null;
  sort_key?: string | null;
  status?: Status;
  url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  kind?: Kind | null;
  venue_ru?: string | null;
  venue_en?: string | null;
  suit?: 'full' | 'partial' | 'nosuit' | null;
};

export type Kind = 'con' | 'meet' | 'local';
export const KINDS: { key: Kind; ru: string; emoji: string }[] = [
  { key: 'con', ru: 'Кон', emoji: '🏨' },
  { key: 'meet', ru: 'Мит', emoji: '🐾' },
  { key: 'local', ru: 'Локальное', emoji: '📍' },
];
export const kindLabel = (k?: string | null) => {
  const x = KINDS.find((v) => v.key === k);
  return x ? `${x.emoji} ${x.ru}` : '❔ тип не указан';
};
const SUITS = ['full', 'partial', 'nosuit'];
export type EventRow = Required<Omit<EventDraft, 'status'>> & { id: string; status: Status };

/** «Русское | English» -> пара. Если английского нет - null (сайт покажет русское). */
export function parsePair(text: string): [string, string | null] | null {
  const [ru, en] = text.split('|').map((s) => s.trim());
  if (!ru || ru.length > 120 || (en && en.length > 120)) return null;
  return [ru, en && en !== ru ? en : null];
}

const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 2026-12-12 или 12.12.2026 -> '2026-12-12' (с проверкой, что такая дата есть) */
function parseDay(s: string): string | null {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 2000 || y > 2100) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Понимает:
 *   12.12.2026                    - один день
 *   12.12.2026 14.12.2026         - несколько дней (или через «..» / « - »)
 *   ~2027-03                      - примерно, март 2027
 *   ~2027-07 лето 2027 | summer 2027  - примерно, со своей подписью
 */
export function parseDate(text: string): Partial<EventDraft> | string {
  let t = text.trim();
  // время в конце: «18:00-22:00» или «18:00» (тогда считается 3 часа)
  let start_time: string | null = null;
  let end_time: string | null = null;
  const tm = t.match(/\s+(\d{1,2}):(\d{2})(?:\s*[-–—]\s*(\d{1,2}):(\d{2}))?$/);
  if (tm) {
    const hm = (h: string, m: string) => (+h < 24 && +m < 60 ? `${h.padStart(2, '0')}:${m}` : null);
    start_time = hm(tm[1], tm[2]);
    end_time = tm[3] ? hm(tm[3], tm[4]) : start_time && `${String((+tm[1] + 3) % 24).padStart(2, '0')}:${tm[2]}`;
    if (!start_time || !end_time) return 'Не понял время';
    t = t.slice(0, tm.index).trim();
  }
  const approx = t.match(/^[~≈]\s*(\d{4})-(\d{1,2})(?:\s+(.+))?$/);
  if (approx) {
    const y = +approx[1];
    const mo = +approx[2];
    if (mo < 1 || mo > 12) return 'Месяц должен быть от 01 до 12';
    if (start_time) return 'У примерной даты не бывает времени';
    const label = approx[3] ? parsePair(approx[3]) : null;
    return {
      start_time: null,
      end_time: null,
      start_date: null,
      end_date: null,
      sort_key: `${y}-${String(mo).padStart(2, '0')}-01`,
      approx_ru: label ? label[0] : `${MONTHS_RU[mo - 1]} ${y}`,
      approx_en: label ? label[1] : `${MONTHS_EN[mo - 1]} ${y}`,
    };
  }
  const parts = t.split(/\s*(?:\.\.|\s-\s|–|—|\s)\s*/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return 'Не понял дату';
  const start = parseDay(parts[0]);
  const end = parts[1] ? parseDay(parts[1]) : null;
  if (!start || (parts[1] && !end)) return 'Не понял дату';
  if (end && end < start) return 'Конец раньше начала';
  if (start_time && end && end !== start) return 'Время - только для однодневных ивентов';
  return { start_time, end_time, start_date: start, end_date: end && end !== start ? end : null, sort_key: null, approx_ru: null, approx_en: null };
}

export function parseUrl(text: string): string | null {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const day = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return `${dd} ${MONTHS_RU[m - 1].slice(0, 3)} ${y}`;
};
export const dateText = (e: EventDraft) =>
  (e.start_date ? (e.end_date ? `${day(e.start_date)} - ${day(e.end_date)}` : day(e.start_date)) : `≈ ${e.approx_ru ?? '?'}`) +
  (e.start_time ? `, ${e.start_time}-${e.end_time}` : '');

export async function listEvents(db: D1Database): Promise<EventRow[]> {
  const { results } = await db.prepare(`SELECT * FROM events ORDER BY coalesce(start_date, sort_key)`).all<EventRow>();
  return results;
}
export const getEvent = (db: D1Database, id: string) => db.prepare(`SELECT * FROM events WHERE id = ?`).bind(id).first<EventRow>();

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);

export async function insertEvent(db: D1Database, d: EventDraft): Promise<string> {
  const year = (d.start_date ?? d.sort_key ?? '').slice(0, 4);
  const base = slug(d.title_en ?? d.title_ru ?? '') || `ev-${crypto.randomUUID().slice(0, 6)}`;
  let id = year && !base.includes(year) ? `${base}-${year}` : base;
  for (let i = 2; await getEvent(db, id); i++) id = `${base}-${year}-${i}`.replace('--', '-');
  await db
    .prepare(
      `INSERT INTO events (id, title_ru, title_en, city_ru, city_en, start_date, end_date, approx_ru, approx_en, sort_key, status, url, start_time, end_time, kind, venue_ru, venue_en, suit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, d.title_ru, d.title_en ?? null, d.city_ru, d.city_en ?? null, d.start_date ?? null, d.end_date ?? null,
      d.approx_ru ?? null, d.approx_en ?? null, d.sort_key ?? null, d.status ?? 'full', d.url ?? null,
      d.start_time ?? null, d.end_time ?? null, d.kind ?? null, d.venue_ru ?? null, d.venue_en ?? null,
      SUITS.includes(d.status ?? 'full') ? (d.status ?? 'full') : null)
    .run();
  return id;
}

const EDITABLE = ['title_ru', 'title_en', 'city_ru', 'city_en', 'start_date', 'end_date', 'approx_ru', 'approx_en', 'sort_key', 'status', 'url', 'start_time', 'end_time', 'kind', 'venue_ru', 'venue_en', 'suit'] as const;

export async function updateEvent(db: D1Database, id: string, patch: Partial<EventDraft>) {
  // «в чём был» запоминаем отдельно: когда статус станет «Был», статистика всё равно знает, фулл это или нет
  if (patch.status && SUITS.includes(patch.status)) patch = { ...patch, suit: patch.status as EventDraft['suit'] };
  const keys = EDITABLE.filter((k) => k in patch);
  if (!keys.length) return;
  await db
    .prepare(`UPDATE events SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...keys.map((k) => (patch as Record<string, unknown>)[k] ?? null), id)
    .run();
}

export const deleteEvent = (db: D1Database, id: string) => db.prepare(`DELETE FROM events WHERE id = ?`).bind(id).run();

/** Ивенты в формате для расчёта «Сейчас» (src/lib/now-core.ts) */
export const toNowEvent = (e: EventRow) => ({
  title: { ru: e.title_ru, en: e.title_en ?? e.title_ru },
  start: e.start_date,
  end: e.end_date,
  startTime: e.start_time,
  endTime: e.end_time,
  status: e.status,
});
