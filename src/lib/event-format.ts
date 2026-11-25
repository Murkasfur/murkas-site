// Подписи для ивентов: плитка даты, строка «город • тип • дата уточняется», окончания.
import { loc, type EventItem, type EventKind } from '../data/mock';
import { useTranslations, type Lang, type UiKey } from '../i18n/ui';

export function eventFormat(lang: Lang) {
  const t = useTranslations(lang);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-CA';
  const d = (s: string) => new Date(`${s}T12:00:00`);
  const fmt = (s: string, o: Intl.DateTimeFormatOptions) => d(s).toLocaleDateString(locale, o).replace(/\s?г\.$/, '').replace('.', '');
  const monShort = (s: string) => fmt(s, { month: 'short' }).slice(0, 3).toUpperCase();
  const dayMonth = (s: string) => fmt(s, { day: 'numeric', month: 'short' });

  return {
    fmt,
    /** Плитка даты: крупно число (или TBA), мелко месяц и год */
    tile(e: EventItem) {
      if (!e.start) {
        const [first, year] = loc(e.approx, lang).split(/\s+/);
        const season = /^(весна|лето|осень|зима|spring|summer|autumn|fall|winter)$/i.test(first ?? '');
        return { big: 'TBA', small: `≈ ${season ? first : `${(first ?? '').slice(0, 3)} ${year ?? ''}`}`.toUpperCase().trim() };
      }
      const a = d(e.start).getDate();
      if (!e.end || e.end === e.start) return { big: String(a), small: `${monShort(e.start)} ${e.start.slice(0, 4)}` };
      const same = e.start.slice(0, 7) === e.end.slice(0, 7);
      return { big: `${a}–${d(e.end).getDate()}`, small: same ? `${monShort(e.start)} ${e.start.slice(0, 4)}` : `${monShort(e.start)}–${monShort(e.end)}` };
    },
    /** «13–15 фев 2027» */
    range(e: EventItem) {
      if (!e.start) return `≈ ${loc(e.approx, lang)}`;
      const multi = e.end && e.end !== e.start;
      return `${multi ? `${d(e.start).getDate()}–${dayMonth(e.end!)}` : dayMonth(e.start)} ${e.start.slice(0, 4)}`;
    },
    kind: (k?: EventKind) => (k ? t(`events.kind.${k}` as UiKey) : null),
    meta(e: EventItem) {
      return [loc(e.city, lang), e.kind ? t(`events.kind.${e.kind}` as UiKey) : null, !e.start ? t('events.tba') : null, e.startTime ?? null]
        .filter(Boolean)
        .join(' • ');
    },
    /** Русские окончания: 1 день, 2 дня, 5 дней */
    plural(n: number, ru: [string, string, string], en: [string, string]) {
      if (lang !== 'ru') return n === 1 ? en[0] : en[1];
      const a = Math.abs(n) % 100;
      const b = a % 10;
      return a > 10 && a < 20 ? ru[2] : b > 1 && b < 5 ? ru[1] : b === 1 ? ru[0] : ru[2];
    },
  };
}
