// Карточка «Сейчас»: что Муркас делает прямо сейчас.
// Без зависимостей - считает и сайт, и бот (бот показывает это в /now).
//
// Приоритет, срабатывает первое подходящее:
//   1. ручной статус из бота (/now ...), пока не истёк
//   2. короткие ивенты со временем: в пути -> на ивенте -> еду домой
//      (внутри дней конвента - без дороги)
//   3. сон
//   4. конвент (ивент без времени) - весь день
//   5. канадский праздник (пар нет)
//   6. пары: в пути -> на перемене -> на паре -> на обеде -> еду домой
//   7. российский праздник
//   8. статус по умолчанию
import { terms, routine, type ClassSlot } from '../data/schedule';
import { holidaysOn } from './holidays';
import type { Settings } from './settings-core';
import { weatherStatus, type Weather } from './weather';

type T = { ru: string; en: string };
export type NowSource = 'manual' | 'event' | 'sleep' | 'con' | 'holiday' | 'class' | 'weather' | 'default';
export type NowStatus = T & { source: NowSource };

export type NowEvent = {
  title: T;
  start: string | null;
  end?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
};

const GOING = new Set(['full', 'partial', 'nosuit', 'went']);
export const TZ = 'America/Toronto';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Торонтские дата и минуты от полуночи */
export function toronto(at: Date) {
  const p = Object.fromEntries(fmt.formatToParts(at).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, minutes: +p.hour * 60 + +p.minute, weekday: new Date(date).getUTCDay() };
}

const mins = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
/** «Абсолютные» минуты по местному времени: день * 1440 + минуты. DST не мешает. */
const abs = (date: string, hm: string | number) =>
  (Date.parse(date) / 864e5) * 1440 + (typeof hm === 'number' ? hm : mins(hm));

const st = (ru: string, en: string, source: NowSource): NowStatus => ({ ru, en, source });

function classStatus(slots: ClassSlot[], m: number): NowStatus | null {
  if (!slots.length) return null;
  const s = [...slots].sort((a, b) => mins(a.start) - mins(b.start));
  const { travel, breakBefore, lunchGap } = routine;

  // на паре / на перемене за 15 минут до пары (кроме онлайн-пары первой в день)
  for (let i = 0; i < s.length; i++) {
    const a = mins(s[i].start);
    if (m >= a && m < mins(s[i].end)) return st(`На паре · ${s[i].name}`, `In class · ${s[i].name}`, 'class');
    if (m >= a - breakBefore && m < a && (i > 0 || !s[i].online)) return st('На перемене', 'On a break', 'class');
  }
  // дорога - только вокруг очных пар: туда, если перед ней не было очной пары, обратно, если после неё нет очной
  for (let i = 0; i < s.length; i++) {
    if (s[i].online) continue;
    const prev = s[i - 1];
    const next = s[i + 1];
    const a = mins(s[i].start);
    const b = mins(s[i].end);
    if ((!prev || prev.online) && m >= a - travel && m < a - breakBefore) return st('В пути на пары', 'On my way to class', 'class');
    if ((!next || next.online) && m >= b && m < b + travel) return st('Еду домой с пар', 'Heading home from class', 'class');
  }
  // окно между парами: обе очные (в колледже) или обе онлайн (дома)
  for (let i = 0; i < s.length - 1; i++) {
    if (!!s[i].online !== !!s[i + 1].online) continue;
    const b = mins(s[i].end);
    const n = mins(s[i + 1].start);
    if (m >= b && m < n) return n - b >= lunchGap ? st('На обеде', 'Lunch break', 'class') : st('На перемене', 'On a break', 'class');
  }
  return null;
}

export function computeNow(at: Date, events: NowEvent[], settings: Settings, weather?: Weather | null): NowStatus {
  // 1. ручной
  const man = settings.manual;
  if (man && (!man.until || Date.parse(man.until) > at.getTime())) return st(man.ru, man.en, 'manual');

  const { date, minutes, weekday } = toronto(at);
  const now = abs(date, minutes);
  const going = events.filter((e) => e.start && GOING.has(e.status));
  const cons = going.filter((e) => !e.startTime);
  const conOn = (d: string) => cons.find((e) => d >= e.start! && d <= (e.end || e.start!));

  // 2. короткие ивенты
  let travelTo: NowStatus | null = null;
  let travelBack: NowStatus | null = null;
  for (const e of going) {
    if (!e.startTime) continue;
    const s = abs(e.start!, e.startTime);
    let f = abs(e.end || e.start!, e.endTime || mins(e.startTime) + 180);
    if (f <= s) f += 1440;
    const con = conOn(e.start!);
    const t = e.title;
    if (now >= s && now < f) {
      return con
        ? st(`${con.title.ru} · ${t.ru}`, `${con.title.en} · ${t.en}`, 'event')
        : st(`На ивенте · ${t.ru}`, `At an event · ${t.en}`, 'event');
    }
    if (con) continue;
    if (now >= s - routine.travel && now < s) travelTo ??= st(`В пути · ${t.ru}`, `On my way · ${t.en}`, 'event');
    if (now >= f && now < f + routine.travel) travelBack ??= st(`Еду домой · ${t.ru}`, `Heading home · ${t.en}`, 'event');
  }
  if (travelTo || travelBack) return (travelTo ?? travelBack)!;

  // 3. сон
  const sf = mins(routine.sleep.from);
  const stt = mins(routine.sleep.to);
  if (sf < stt ? minutes >= sf && minutes < stt : minutes >= sf || minutes < stt) return st('Сплю 💤', 'Sleeping 💤', 'sleep');

  // 4. конвент
  const con = conOn(date);
  if (con) return st(`На конвенте · ${con.title.ru}`, `At a con · ${con.title.en}`, 'con');

  // 5. канадский праздник
  const hol = holidaysOn(date);
  if (hol.ca) return st(`Выходной · ${hol.ca.ru}`, `Day off · ${hol.ca.en}`, 'holiday');

  // 6. пары
  const term = terms.find((t) => date >= t.start && date <= t.end && !t.breaks.some(([a, b]) => date >= a && date <= b));
  if (term) {
    const c = classStatus(term.classes.filter((x) => x.day === weekday), minutes);
    if (c) return c;
  }

  // 7. российский праздник
  if (hol.ru) return st(`Праздную · ${hol.ru.ru}`, `Celebrating · ${hol.ru.en}`, 'holiday');

  // 8. непогода, мороз или жара - вместо статуса по умолчанию
  const ws = weatherStatus(weather);
  if (ws) return st(ws.ru, ws.en, 'weather');

  // 9. по умолчанию
  return st(settings.now.ru, settings.now.en, 'default');
}
