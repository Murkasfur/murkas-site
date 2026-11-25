// Праздники для карточки «Сейчас». Даты считаются правилами, так что
// работают на любой год (включая Пасху и «третий понедельник февраля»).
//   ca - канадские (Онтарио): колледж закрыт, пар нет
//   ru - российские: пары не отменяют, видны в свободное время

type T = { ru: string; en: string };
export type Holidays = { ca?: T; ru?: T };

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 864e5).toISOString().slice(0, 10);
const weekday = (date: string) => new Date(date).getUTCDay();

/** n-й `wd` (0 = вс) месяца; n = -1 - последний */
function nthWeekday(y: number, m: number, wd: number, n: number) {
  if (n > 0) {
    const first = iso(y, m, 1);
    return addDays(first, ((wd - weekday(first) + 7) % 7) + (n - 1) * 7);
  }
  const last = iso(y, m + 1, 0);
  return addDays(last, -((weekday(last) - wd + 7) % 7));
}

/** Католическая/протестантская Пасха (для Good Friday) */
function easterWestern(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, month, day);
}

/** Православная Пасха (юлианская, переведённая в григорианский календарь; верно для 1900-2099) */
function easterOrthodox(y: number) {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return addDays(iso(y, month, day), 13);
}

const cache = new Map<number, Map<string, Holidays>>();

function build(y: number) {
  const map = new Map<string, Holidays>();
  const ca = (date: string, ru: string, en: string) => map.set(date, { ...map.get(date), ca: { ru, en } });
  const rus = (date: string, ru: string, en: string) => map.set(date, { ...map.get(date), ru: { ru, en } });

  ca(iso(y, 1, 1), 'Новый год', "New Year's Day");
  ca(nthWeekday(y, 2, 1, 3), 'День семьи', 'Family Day');
  ca(addDays(easterWestern(y), -2), 'Страстная пятница', 'Good Friday');
  ca(addDays(iso(y, 5, 25), -(((weekday(iso(y, 5, 25)) + 6) % 7) || 7)), 'День Виктории', 'Victoria Day');
  ca(iso(y, 7, 1), 'День Канады', 'Canada Day');
  ca(nthWeekday(y, 8, 1, 1), 'Гражданский праздник', 'Civic Holiday');
  ca(nthWeekday(y, 9, 1, 1), 'День труда', 'Labour Day');
  ca(nthWeekday(y, 10, 1, 2), 'День благодарения', 'Thanksgiving');
  ca(iso(y, 12, 25), 'Рождество', 'Christmas');
  ca(iso(y, 12, 26), 'День подарков', 'Boxing Day');

  // Масленица первой: если на её неделю выпадает 23 февраля или 8 марта, покажется конкретный праздник
  const easter = easterOrthodox(y);
  for (let i = -55; i <= -49; i++) rus(addDays(easter, i), 'Масленица 🥞', 'Maslenitsa 🥞');
  rus(iso(y, 1, 1), 'Новый год 🎄', 'New Year 🎄');
  for (const d of [2, 3, 4, 5, 6, 8]) rus(iso(y, 1, d), 'Новогодние каникулы 🎄', 'New Year holidays 🎄');
  rus(iso(y, 1, 7), 'Рождество', 'Orthodox Christmas');
  rus(iso(y, 1, 25), 'Татьянин день', "Students' Day");
  rus(iso(y, 2, 23), '23 Февраля', 'Defender of the Fatherland Day');
  rus(iso(y, 3, 8), '8 Марта 🌷', "Women's Day 🌷");
  rus(easter, 'Пасха', 'Orthodox Easter');
  rus(iso(y, 5, 1), 'Праздник Весны и Труда', 'Spring and Labour Day');
  rus(iso(y, 11, 4), 'День народного единства', 'Unity Day');
  return map;
}

export function holidaysOn(date: string): Holidays {
  const y = +date.slice(0, 4);
  if (!cache.has(y)) cache.set(y, build(y));
  return cache.get(y)!.get(date) ?? {};
}
