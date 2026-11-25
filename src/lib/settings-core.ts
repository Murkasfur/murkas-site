// Живые настройки сайта, которые меняются ботом без пересборки.
// Лежат одним JSON в Cloudflare KV (ключ `settings`). Чего нет в KV -
// берётся из src/data/site.ts, так что пустой KV = сайт как в коде.
// Этот файл без зависимостей: его импортирует и сайт, и бот (bot/).
import { site, pages, type PageKey, type PageStatus } from '../data/site';

export const SETTINGS_KEY = 'settings';

export type Settings = {
  maintenance: boolean;
  pages: Record<PageKey, PageStatus>;
  /** Статус «Сейчас» по умолчанию - когда нет пар, ивентов и т.п. (/default) */
  now: { ru: string; en: string };
  /** Ручной статус (/now): перекрывает расписание. until = ISO-время или null (пока не снимешь) */
  manual?: { ru: string; en: string; until: string | null } | null;
};

export const defaultSettings = (): Settings => ({
  maintenance: site.maintenance,
  pages: Object.fromEntries(pages.map((p) => [p.key, p.status])) as Record<PageKey, PageStatus>,
  now: { ...site.now },
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
  const m = r.manual;
  if (m && typeof m === 'object' && typeof m.ru === 'string' && typeof m.en === 'string') {
    s.manual = { ru: m.ru, en: m.en, until: typeof m.until === 'string' ? m.until : null };
  }
  return s;
}

export const pageKeys = pages.map((p) => p.key);
