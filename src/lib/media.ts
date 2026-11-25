// Опубликованные фото и арты из базы -> те же типы, что были у заглушек (Photo, Art),
// чтобы страницы и окно просмотра не пришлось переписывать.
import { env } from 'cloudflare:workers';
import type { Photo, Art, L, PhotoCategory, ArtType, Character } from '../data/mock';

type Row = {
  id: string; kind: 'photo' | 'art'; title_ru: string | null; title_en: string | null; caption_ru: string | null; caption_en: string | null;
  character: string | null; category: string | null; event_id: string | null; taken_date: string | null; created_date: string | null;
  city_ru: string | null; city_en: string | null; original_url: string | null; pinned: number; width: number | null; height: number | null;
  r2_key: string | null; mime: string | null; published_at: string | null; uploaded_at: string;
  person_name: string | null; person_url: string | null; p_name: string | null; p_url: string | null;
  ev_title_ru: string | null; ev_title_en: string | null; ev_city_ru: string | null; ev_city_en: string | null; ev_start: string | null; ev_end: string | null;
};

const pair = (ru: string | null, en: string | null): L | undefined => (ru ? (en && en !== ru ? { ru, en } : ru) : en ?? undefined);

/** Адрес картинки. w = ширина превью (сайт сам уменьшает и кэширует), без w - оригинал */
export const mediaUrl = (r2Key: string | null, w?: 400 | 800 | 1600) =>
  r2Key ? `/media/${r2Key.split('/').pop()}${w ? `?w=${w}` : ''}` : undefined;

async function rows(kind: 'photo' | 'art') {
  const { results } = await env.DB.prepare(
    `SELECT m.*, p.name AS p_name, p.url AS p_url,
            e.title_ru AS ev_title_ru, e.title_en AS ev_title_en, e.city_ru AS ev_city_ru, e.city_en AS ev_city_en, e.start_date AS ev_start, e.end_date AS ev_end
     FROM media m
     LEFT JOIN people p ON p.id = m.person_id
     LEFT JOIN events e ON e.id = m.event_id
     WHERE m.kind = ? AND m.status = 'published'
     ORDER BY m.pinned DESC, coalesce(m.taken_date, m.created_date, m.published_at) DESC
     LIMIT 1000`,
  ).bind(kind).all<Row>();
  return results;
}

const person = (r: Row) => {
  const name = r.p_name ?? r.person_name;
  return name ? { name, url: r.p_url ?? r.person_url ?? undefined } : undefined;
};
/** «ref,full» -> ['ref', 'full'] */
const list = (v: string | null) => (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const ratio = (r: Row) => (r.width && r.height ? r.height / r.width : 1);
const day = (s: string | null) => s?.slice(0, 10) ?? null;
/** Время из базы хранится в UTC ('2026-11-25 02:10:00') - дата нужна торонтская, иначе вечером «завтра» */
const localDay = (s: string | null) =>
  s ? new Date(`${s.replace(' ', 'T')}Z`).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : null;

export async function listPhotos(): Promise<Photo[]> {
  try {
    return (await rows('photo')).map((r) => {
      const event = pair(r.ev_title_ru, r.ev_title_en);
      return {
        id: r.id,
        // у загрузок нет отдельного названия: название = подпись, иначе ивент
        title: pair(r.title_ru, r.title_en) ?? pair(r.caption_ru, r.caption_en) ?? event ?? { ru: 'Фото', en: 'Photo' },
        character: (r.character ?? undefined) as Character | undefined,
        cats: list(r.category) as PhotoCategory[],
        event,
        eventId: r.event_id ?? undefined,
        photographer: person(r),
        date: day(r.taken_date) ?? r.ev_start ?? localDay(r.uploaded_at)!,
        // день неизвестен, а ивент шёл несколько дней - показываем весь диапазон
        dateEnd: !day(r.taken_date) && r.ev_start && r.ev_end && r.ev_end > r.ev_start ? r.ev_end : undefined,
        added: r.published_at ?? r.uploaded_at,
        pinned: !!r.pinned,
        caption: r.title_ru ? pair(r.caption_ru, r.caption_en) : undefined,
        city: pair(r.city_ru, r.city_en) ?? pair(r.ev_city_ru, r.ev_city_en),
        ratio: ratio(r),
        src: mediaUrl(r.r2_key, 1600),
        thumb: mediaUrl(r.r2_key, 800),
        original: mediaUrl(r.r2_key),
      };
    });
  } catch (err) {
    console.error('listPhotos failed', err);
    return [];
  }
}

export async function listArts(): Promise<Art[]> {
  try {
    return (await rows('art')).map((r) => ({
      id: r.id,
      // у загрузок нет отдельного названия: подпись и есть название
      title: pair(r.title_ru, r.title_en) ?? pair(r.caption_ru, r.caption_en) ?? r.p_name ?? r.person_name ?? { ru: 'Арт', en: 'Art' },
      caption: r.title_ru ? pair(r.caption_ru, r.caption_en) : undefined,
      character: (r.character ?? 'arbyss') as Art['character'],
      types: list(r.category) as ArtType[],
      artist: person(r) ?? { name: '?' },
      created: day(r.created_date),
      uploaded: localDay(r.published_at) ?? undefined,
      added: r.published_at ?? r.uploaded_at,
      original: r.original_url ?? undefined,
      pinned: !!r.pinned,
      ratio: ratio(r),
      src: mediaUrl(r.r2_key, 1600),
      thumb: mediaUrl(r.r2_key, 800),
      originalFile: mediaUrl(r.r2_key),
    }));
  } catch (err) {
    console.error('listArts failed', err);
    return [];
  }
}

export type HomeTile = { id?: string; src?: string; label: string };

/**
 * Плитки «Фурсьюты» на главной. Слоты, выбранные в боте, - как есть; пустые заполняются
 * закреплёнными, потом свежими фото (подпись - подпись фото или ивент). Нет фото - заглушки.
 */
export async function homeTiles(slots: ({ id: string; ru: string; en: string } | null)[], lang: 'ru' | 'en', fallback: string[]): Promise<HomeTile[]> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT m.id, m.r2_key, m.caption_ru, m.caption_en, e.title_ru AS ev_ru, e.title_en AS ev_en
       FROM media m LEFT JOIN events e ON e.id = m.event_id
       WHERE m.kind = 'photo' AND m.status = 'published' AND m.r2_key IS NOT NULL
       ORDER BY m.pinned DESC, coalesce(m.published_at, m.uploaded_at) DESC
       LIMIT 50`,
    ).all<{ id: string; r2_key: string; caption_ru: string | null; caption_en: string | null; ev_ru: string | null; ev_en: string | null }>();
    const byId = new Map(results.map((r) => [r.id, r]));
    const chosen = new Set(slots.flatMap((x) => (x && byId.has(x.id) ? [x.id] : [])));
    const spare = results.filter((r) => !chosen.has(r.id));
    const auto = (r: (typeof results)[number]) => (lang === 'en' ? r.caption_en ?? r.caption_ru ?? r.ev_en ?? r.ev_ru : r.caption_ru ?? r.ev_ru) ?? '';
    return [0, 1, 2].map((i) => {
      const slot = slots[i];
      const picked = slot && byId.get(slot.id);
      if (picked) return { id: picked.id, src: mediaUrl(picked.r2_key, 800), label: slot![lang] || '' };
      const r = spare.shift();
      return r ? { id: r.id, src: mediaUrl(r.r2_key, 800), label: auto(r) } : { label: fallback[i] };
    });
  } catch (err) {
    console.error('homeTiles failed', err);
    return fallback.map((label) => ({ label }));
  }
}
