// Персонажи и образы из D1 для страниц сайта. Если база недоступна - страницы
// открываются пустыми, ошибка уходит в логи Cloudflare.
import { env } from 'cloudflare:workers';
import type { CharacterRow, LookRow, LookKind } from './characters-core';

/** Картинка из R2 media/ по имени файла. w = ширина превью */
export const fileUrl = (file: string | null | undefined, w?: 400 | 800 | 1600) =>
  file ? `/media/${file.split('/').pop()}${w ? `?w=${w}` : ''}` : null;

export type MediaThumb = { id: string; src: string; full: string; ratio: number; artist?: string | null };
export type EventLite = {
  id: string; title_ru: string; title_en: string | null; city_ru: string; city_en: string | null;
  start_date: string | null; end_date: string | null; approx_ru: string | null; approx_en: string | null;
  sort_key: string | null; status: string; suit: string | null; look_id: string | null;
};

export type CharacterWithLooks = CharacterRow & { looks: LookRow[] };

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`${name} failed`, err);
    return fallback;
  }
}

/** Все видимые персонажи с их видимыми образами, по порядку */
export const listCharacters = () =>
  safe('listCharacters', async () => {
    const [chars, looks] = await env.DB.batch([
      env.DB.prepare(`SELECT * FROM characters WHERE visible = 1 ORDER BY position, name_ru`),
      env.DB.prepare(`SELECT * FROM looks WHERE visible = 1 ORDER BY position, name_ru`),
    ]);
    const all = looks.results as LookRow[];
    return (chars.results as CharacterRow[]).map((c) => ({ ...c, looks: all.filter((l) => l.character_id === c.id) }));
  }, [] as CharacterWithLooks[]);

const thumb = (r: { id: string; r2_key: string; width: number | null; height: number | null; artist?: string | null }): MediaThumb => ({
  id: r.id,
  src: fileUrl(r.r2_key, 800)!,
  full: fileUrl(r.r2_key, 1600)!,
  ratio: r.width && r.height ? r.height / r.width : 1,
  artist: r.artist ?? null,
});

/** Арты с персонажем (для блока «Арты» на его странице) */
export const charArts = (id: string, limit = 8) =>
  safe('charArts', async () => {
    const { results } = await env.DB.prepare(
      `SELECT m.id, m.r2_key, m.width, m.height, coalesce(p.name, m.person_name) AS artist
       FROM media m LEFT JOIN people p ON p.id = m.person_id
       WHERE m.kind = 'art' AND m.status = 'published' AND m.r2_key IS NOT NULL AND m.character IN (?, 'both')
       ORDER BY m.pinned DESC, coalesce(m.created_date, m.published_at) DESC
       LIMIT ?`,
    ).bind(id, limit).all<{ id: string; r2_key: string; width: number | null; height: number | null; artist: string | null }>();
    return results.map(thumb);
  }, [] as MediaThumb[]);

/** Категория фото, по которой подбирать снимки образа, пока они не привязаны к нему напрямую */
const CATEGORY: Partial<Record<LookKind, string>> = { fullsuit: 'full', partial: 'partial' };
/** Фото образа: привязанные к нему + (если таких нет) по персонажу и категории */
export const lookPhotos = (look: LookRow, limit = 12) =>
  safe('lookPhotos', async () => {
    const cat = CATEGORY[look.kind];
    const { results } = await env.DB.prepare(
      `SELECT id, r2_key, width, height FROM media
       WHERE kind = 'photo' AND status = 'published' AND r2_key IS NOT NULL
         AND (look_id = ?1 OR (look_id IS NULL AND ?2 IS NOT NULL AND character IN (?3, 'both') AND (',' || category || ',') LIKE '%,' || ?2 || ',%'))
       ORDER BY (look_id = ?1) DESC, pinned DESC, coalesce(taken_date, published_at) DESC
       LIMIT ?4`,
    ).bind(look.id, cat ?? null, look.character_id, limit).all<{ id: string; r2_key: string; width: number | null; height: number | null }>();
    return results.map(thumb);
  }, [] as MediaThumb[]);

/** Ивенты образа: только явно отмеченные в боте (таблица event_looks), прошедшие и ближайшие */
export const lookEvents = (look: LookRow, char: CharacterRow) =>
  safe('lookEvents', async () => {
    const [all, marked] = await env.DB.batch([
      env.DB.prepare(
        `SELECT id, title_ru, title_en, city_ru, city_en, start_date, end_date, approx_ru, approx_en, sort_key, status, suit, look_id
         FROM events ORDER BY coalesce(start_date, sort_key)`,
      ),
      env.DB.prepare(`SELECT event_id FROM event_looks WHERE look_id = ?`).bind(look.id),
    ]);
    const mine = new Set((marked.results as { event_id: string }[]).map((r) => r.event_id));
    const now = today();
    const ended = (e: EventLite) => (e.end_date ?? e.start_date ?? '9999') < now;
    const rows = all.results as EventLite[];
    const went = rows.filter((e) => mine.has(e.id) && ended(e) && !['cant', 'missed'].includes(e.status));
    const upcoming = rows.filter((e) => !ended(e) && !['cant', 'missed'].includes(e.status));
    return { went: went.reverse(), upcoming, character: char.id };
  }, { went: [] as EventLite[], upcoming: [] as EventLite[], character: char.id });

export async function getCharacter(id: string) {
  const all = await listCharacters();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  return { character: c, others: all.filter((x) => x.id !== id), arts: await charArts(id) };
}

export async function getLook(id: string) {
  const all = await listCharacters();
  for (const c of all) {
    const look = c.looks.find((l) => l.id === id);
    if (look) {
      const [photos, events] = await Promise.all([lookPhotos(look), lookEvents(look, c)]);
      return { look, character: c, siblings: c.looks, photos, events };
    }
  }
  return null;
}
