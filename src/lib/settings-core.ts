// Живые настройки сайта, которые меняются ботом без пересборки.
// Лежат одним JSON в Cloudflare KV (ключ `settings`). Чего нет в KV -
// берётся из src/data/site.ts, так что пустой KV = сайт как в коде.
// Этот файл без зависимостей: его импортирует и сайт, и бот (bot/).
import { site, pages, type PageKey, type PageStatus } from '../data/site';
import { LIMITS, AUDIO_NAME } from './media-core';

export const SETTINGS_KEY = 'settings';

export type Settings = {
  maintenance: boolean;
  pages: Record<PageKey, PageStatus>;
  /** Статус «Сейчас» по умолчанию - когда нет пар, ивентов и т.п. (/default) */
  now: { ru: string; en: string };
  /** Ручной статус (/now): перекрывает расписание. until = ISO-время или null (пока не снимешь) */
  manual?: { ru: string; en: string; until: string | null } | null;
  /** Сколько файлов в сутки можно загрузить с одного IP (/limit) */
  uploadLimit: number;
  /** Три плитки «Фурсьюты» на главной: фото и подпись (бот: «🏠 На главную», /home). null = подобрать само */
  home: (HomeSlot | null)[];
  /** Фото в карточке «Привет, это» на главной: имя файла в R2 media/ (бот: «👋 В «Привет»», /hero) */
  hero: string | null;
  /** Трек в «Мой вайб» на главной (бот: /vibe, прислать аудиофайл). null = диск без звука */
  vibe: Vibe | null;
};
/** audio - файл в R2 audio/, cover - картинка в R2 media/ (или null = стандартная обложка) */
export type Vibe = { audio: string; title: string; artist: string; cover: string | null };
export type HomeSlot = { id: string; ru: string; en: string };

export const defaultSettings = (): Settings => ({
  maintenance: site.maintenance,
  pages: Object.fromEntries(pages.map((p) => [p.key, p.status])) as Record<PageKey, PageStatus>,
  now: { ...site.now },
  uploadLimit: LIMITS.perDay,
  home: [null, null, null],
  hero: null,
  vibe: null,
});

/** Сливает то, что лежит в KV, с дефолтами; мусор и лишние ключи игнорирует */
export function mergeSettings(raw: unknown): Settings {
  const s = defaultSettings();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Partial<Settings>;
  if (typeof r.maintenance === 'boolean') s.maintenance = r.maintenance;
  if (r.pages && typeof r.pages === 'object') {
    for (const k of Object.keys(s.pages) as PageKey[]) {
      const v = (r.pages as Record<string, unknown>)[k];
      if (v === 'live' || v === 'wip') s.pages[k] = v;
    }
  }
  if (r.now && typeof r.now === 'object') {
    if (typeof r.now.ru === 'string' && r.now.ru.trim()) s.now.ru = r.now.ru;
    if (typeof r.now.en === 'string' && r.now.en.trim()) s.now.en = r.now.en;
  }
  if (typeof r.uploadLimit === 'number' && r.uploadLimit >= 0 && r.uploadLimit <= 10000) s.uploadLimit = Math.floor(r.uploadLimit);
  if (Array.isArray(r.home)) {
    s.home = [0, 1, 2].map((i) => {
      const x = (r.home as unknown[])[i] as Partial<HomeSlot> | null;
      return x && typeof x.id === 'string' ? { id: x.id, ru: String(x.ru ?? ''), en: String(x.en ?? x.ru ?? '') } : null;
    });
  }
  if (typeof r.hero === 'string' && /^[a-z0-9]{6,20}\.(jpg|png|webp|gif)$/.test(r.hero)) s.hero = r.hero;
  const v = r.vibe;
  if (v && typeof v === 'object' && typeof v.audio === 'string' && AUDIO_NAME.test(v.audio)) {
    s.vibe = {
      audio: v.audio,
      title: String(v.title ?? '').slice(0, 100),
      artist: String(v.artist ?? '').slice(0, 100),
      cover: typeof v.cover === 'string' && /^[a-z0-9]{6,20}\.(jpg|png|webp|gif)$/.test(v.cover) ? v.cover : null,
    };
  }
  const m = r.manual;
  if (m && typeof m === 'object' && typeof m.ru === 'string' && typeof m.en === 'string') {
    s.manual = { ru: m.ru, en: m.en, until: typeof m.until === 'string' ? m.until : null };
  }
  return s;
}

export const pageKeys = pages.map((p) => p.key);
