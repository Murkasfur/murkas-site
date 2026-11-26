// Важные даты (ДР, праздники) для таймлайна ивентов. Общие для сайта и бота.
// Каждая дата повторяется ежегодно; на сайте показываем ближайший раз начиная с сегодня.
import type { L } from '../data/mock';

export const DATE_ICONS = ['celebration', 'cake', 'favorite', 'park', 'dark_mode', 'star'] as const;
export type DateIcon = (typeof DATE_ICONS)[number];
/** Как иконка выглядит в боте */
export const DATE_ICON_EMOJI: Record<DateIcon, string> = {
  celebration: '🎉', cake: '🎂', favorite: '❤️', park: '🎄', dark_mode: '🎃', star: '⭐',
};
export const isDateIcon = (s: string): s is DateIcon => (DATE_ICONS as readonly string[]).includes(s);

export type SpecialDateRow = {
  id: string;
  name_ru: string;
  name_en: string | null;
  month: number;
  day: number | null;
  icon: string;
};

export type SpecialDate = {
  id: string;
  name: L;
  icon: DateIcon;
  /** Ближайший раз: YYYY-MM-DD, а если число неизвестно - YYYY-MM-00 (встаёт в начало месяца) */
  date: string;
  hasDay: boolean;
  isToday: boolean;
};

export const listSpecialDates = async (db: D1Database) =>
  (await db.prepare(`SELECT * FROM special_dates ORDER BY month, COALESCE(day, 0), name_ru`).all<SpecialDateRow>()).results;

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Ближайшие наступления дат, начиная с today (YYYY-MM-DD), по порядку */
export function upcomingSpecialDates(rows: SpecialDateRow[], today: string): SpecialDate[] {
  const y0 = Number(today.slice(0, 4));
  const ym = today.slice(0, 7);
  const out: SpecialDate[] = [];
  for (const r of rows) {
    const at = (y: number) => {
      // 29 февраля в невисокосный год - 28-го
      const d = r.day == null ? 0 : Math.min(r.day, daysIn(y, r.month));
      return `${y}-${pad(r.month)}-${pad(d)}`;
    };
    let date = at(y0);
    // без числа дата «длится» весь месяц; с числом - уже прошла, если раньше сегодня
    if (r.day == null ? date.slice(0, 7) < ym : date < today) date = at(y0 + 1);
    out.push({
      id: r.id,
      name: r.name_en && r.name_en !== r.name_ru ? { ru: r.name_ru, en: r.name_en } : r.name_ru,
      icon: isDateIcon(r.icon) ? r.icon : 'celebration',
      date,
      hasDay: r.day != null,
      isToday: date === today,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Разбор даты из бота: «14.03», «14/3», «14 марта», «март», «3» (только месяц) */
const MONTHS = [
  ['янв', 'jan'], ['фев', 'feb'], ['мар', 'mar'], ['апр', 'apr'], ['мая', 'май', 'may'], ['июн', 'jun'],
  ['июл', 'jul'], ['авг', 'aug'], ['сен', 'sep'], ['окт', 'oct'], ['ноя', 'nov'], ['дек', 'dec'],
];
const monthOf = (w: string) => {
  const s = w.toLowerCase();
  const i = MONTHS.findIndex((v) => v.some((p) => s.startsWith(p)));
  return i < 0 ? null : i + 1;
};
export function parseDayMonth(text: string): { month: number; day: number | null } | null {
  const s = text.trim();
  let m = /^(\d{1,2})\s*[./-]\s*(\d{1,2})$/.exec(s);
  if (m) return check(+m[2], +m[1]);
  m = /^(\d{1,2})\s+([a-zа-яё]+)\.?$/i.exec(s);
  if (m) {
    const mon = monthOf(m[2]);
    return mon ? check(mon, +m[1]) : null;
  }
  m = /^([a-zа-яё]+)\s+(\d{1,2})$/i.exec(s);
  if (m) {
    const mon = monthOf(m[1]);
    return mon ? check(mon, +m[2]) : null;
  }
  if (/^\d{1,2}$/.test(s)) return check(+s, null);
  const mon = /^[a-zа-яё]+$/i.test(s) ? monthOf(s) : null;
  return mon ? { month: mon, day: null } : null;
}
function check(month: number, day: number | null) {
  if (month < 1 || month > 12) return null;
  if (day != null && (day < 1 || day > daysIn(2024, month))) return null;
  return { month, day };
}

const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
/** «14 марта» или «март (число не указано)» - для бота */
export const dayMonthRu = (r: Pick<SpecialDateRow, 'month' | 'day'>) =>
  r.day == null ? `${MONTH_NOM[r.month - 1]} (число не указано)` : `${r.day} ${MONTH_GEN[r.month - 1]}`;
