// Временные данные-заглушки. Потом их заменят ответы API (D1 + R2).
// Сегодняшняя дата для расчётов берётся из браузера/сборки, а не отсюда.

/** Текст на двух языках. Имена собственные (Furnal Equinox) можно писать просто строкой. */
export type L = string | { ru: string; en: string };
/** Текст на нужном языке */
export const loc = (v: L | undefined, lang: 'ru' | 'en') => (v === undefined ? '' : typeof v === 'string' ? v : v[lang]);
/** Оба варианта сразу - для поиска (ищется на любом языке) */
export const locAll = (v: L | undefined) => (v === undefined ? '' : typeof v === 'string' ? v : `${v.ru} ${v.en}`);

const TO: L = { ru: 'Торонто', en: 'Toronto' };

export type Attendance = 'full' | 'partial' | 'nosuit' | 'cant' | 'went' | 'missed';

export type EventItem = {
  id: string;
  title: L;
  city: L;
  /** Точная дата начала (YYYY-MM-DD) или null, если дата ещё неизвестна (TBA) */
  start: string | null;
  end?: string;
  /** Для TBA: примерный период, например «март 2027» / "March 2027" */
  approx?: L;
  /** Для сортировки TBA: первый день предполагаемого периода */
  sortKey?: string;
  status: Attendance;
  photos?: number;
  /** Время по Торонто ('HH:MM'). Есть = короткий ивент (мит), нет = конвент на весь день */
  startTime?: string;
  endTime?: string;
  /** Сайт ивента */
  url?: string;
  /** Кон / мит / локальное */
  kind?: EventKind;
  /** Место: отель, парк... */
  venue?: L;
  /** В чём был (или собираюсь) - для статистики */
  suit?: Suit;
  /** Превью фото с ивента (для прошедших) */
  previews?: string[];
};
export type EventKind = 'con' | 'meet' | 'local';
export type Suit = 'full' | 'partial' | 'nosuit';

export const events: EventItem[] = [
  { id: 'fe-2026', title: 'Furnal Equinox 2026', city: TO, start: '2026-03-20', end: '2026-03-22', status: 'went', photos: 64, kind: 'con', suit: 'full', venue: 'Sheraton Centre Toronto' },
  { id: 'spring-meet', title: { ru: 'Весенний мит', en: 'Spring meet' }, city: TO, start: '2026-05-16', status: 'went', photos: 22, kind: 'meet', suit: 'partial' },
  { id: 'pride', title: 'Pride Toronto', city: TO, start: '2026-06-28', status: 'went', photos: 41, kind: 'local', suit: 'full' },
  { id: 'summer-rave', title: 'Furry Rave', city: TO, start: '2026-08-15', status: 'missed', kind: 'local' },
  { id: 'autumn-walk', title: { ru: 'Осенняя прогулка', en: 'Autumn walk' }, city: TO, start: '2026-10-10', status: 'went', photos: 18, kind: 'local', suit: 'nosuit' },
  { id: 'park-meet', title: { ru: 'Мит в High Park', en: 'High Park meet' }, city: TO, start: '2026-11-21', status: 'went', photos: 12, kind: 'meet', suit: 'full' },
  { id: 'winter-meet', title: { ru: 'Зимний мит', en: 'Winter meet' }, city: TO, start: '2026-12-12', status: 'full', kind: 'meet', suit: 'full' },
  { id: 'ny-party', title: { ru: 'Новогодняя вечеринка', en: "New Year's party" }, city: TO, start: '2026-12-27', status: 'nosuit', kind: 'local', suit: 'nosuit' },
  { id: 'fe-2027', title: 'Furnal Equinox 2027', city: TO, start: null, approx: { ru: 'март 2027', en: 'March 2027' }, sortKey: '2027-03-01', status: 'full', kind: 'con', suit: 'full', venue: 'Sheraton Centre Toronto' },
  { id: 'ac-2027', title: 'Anthrocon 2027', city: { ru: 'Питтсбург', en: 'Pittsburgh' }, start: null, approx: { ru: 'лето 2027', en: 'Summer 2027' }, sortKey: '2027-06-20', status: 'partial', kind: 'con', suit: 'partial' },
];

export type Character = 'arbyss' | 'murkas';
export type PhotoCategory = 'group' | 'full' | 'partial' | 'walks' | 'backstage' | 'parties';

export type Photo = {
  id: string;
  title: L;
  /** Модератор ставит в боте; пока не поставил - нет */
  character?: Character;
  category?: PhotoCategory;
  /** Несколько категорий сразу (из базы). Если нет - берётся category */
  cats?: PhotoCategory[];
  event?: L;
  photographer?: { name: string; url?: string };
  date: string;
  /** Если день съёмки неизвестен, а ивент многодневный - последний день ивента */
  dateEnd?: string;
  /** Когда добавлено на сайт (полная метка времени) - для сортировки */
  added?: string;
  pinned?: boolean;
  caption?: L;
  city?: L;
  eventId?: string;
  /** Пропорции (высота / ширина) */
  ratio: number;
  /** Картинка для просмотра, превью для сетки, оригинал для скачивания */
  src?: string;
  thumb?: string;
  original?: string;
};

const ratios = [1.25, 0.85, 1.1, 0.75, 1.35, 0.9, 1.0, 1.2, 0.8, 1.15, 0.95, 1.3];
const cats: PhotoCategory[] = ['full', 'group', 'walks', 'partial', 'parties', 'backstage'];
export const photos: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i + 1}`,
  title: ([
    { ru: 'Arbyss у входа', en: 'Arbyss at the entrance' },
    { ru: 'Общее фото', en: 'Group photo' },
    { ru: 'Прогулка по набережной', en: 'Waterfront walk' },
    { ru: 'В партиале', en: 'In partial' },
    { ru: 'Танцпол', en: 'Dance floor' },
    { ru: 'За кадром', en: 'Behind the scenes' },
  ] as L[])[i % 6],
  character: (i % 3 === 2 ? 'murkas' : 'arbyss') as Character,
  category: cats[i % cats.length],
  event: (i % 2 ? 'Furnal Equinox 2026' : { ru: 'Мит в High Park', en: 'High Park meet' }) as L,
  photographer: i % 4 === 3 ? undefined : { name: '@photographer', url: 'https://t.me/' },
  date: `2026-${String(11 - (i % 9)).padStart(2, '0')}-${String(20 - i).padStart(2, '0')}`,
  pinned: i < 2,
  eventId: i % 2 ? 'fe-2026' : 'park-meet',
  city: TO,
  caption: i === 0 ? { ru: 'Первый день кона, очередь на регистрацию.', en: 'First day of the con, waiting in the registration line.' } : undefined,
  ratio: ratios[i],
}));

export type ArtType = 'full' | 'sketch' | 'ref' | 'stickers' | 'comic' | 'ych';
export type Art = {
  id: string;
  title: L;
  character: Character | 'both';
  type?: ArtType;
  /** Несколько тегов сразу (рефшит + полноцвет). Если нет - берётся type */
  types?: ArtType[];
  artist: { name: string; url?: string };
  /** Когда арт нарисован (не когда загружен). null = неизвестно */
  created: string | null;
  /** Когда загружен на сайт */
  uploaded?: string;
  /** Когда добавлено на сайт (полная метка времени) - для сортировки */
  added?: string;
  /** Ссылка на оригинал (пост художника) */
  original?: string;
  caption?: L;
  pinned?: boolean;
  ratio: number;
  src?: string;
  thumb?: string;
  /** Оригинал для скачивания */
  originalFile?: string;
};

export const arts: Art[] = [
  { id: 'a1', title: { ru: 'Рефшит Arbyss', en: 'Arbyss ref sheet' }, character: 'arbyss', type: 'ref', artist: { name: '@artist_one', url: 'https://x.com/' }, created: '2026-03-03', pinned: true, ratio: 1.3 },
  { id: 'a2', title: { ru: 'Arbyss с арбузом', en: 'Arbyss with a watermelon' }, character: 'arbyss', type: 'full', artist: { name: '@artist_two', url: 'https://x.com/' }, created: '2026-10-12', uploaded: '2026-10-14', original: 'https://x.com/', caption: { ru: 'Летний арт на день рождения персонажа.', en: "Summer art for the character's birthday." }, pinned: true, ratio: 1.1 },
  { id: 'a3', title: { ru: 'Скетч на коне', en: 'Sketch at the con' }, character: 'arbyss', type: 'sketch', artist: { name: '@artist_four', url: 'https://t.me/' }, created: '2026-02-14', ratio: 1.4 },
  { id: 'a4', title: { ru: 'Стикер «ням»', en: 'Sticker "nom"' }, character: 'arbyss', type: 'stickers', artist: { name: '@murkas', url: 'https://murkas.net' }, created: '2026-11-02', ratio: 1 },
  { id: 'a5', title: { ru: 'Arbyss бипает', en: 'Arbyss goes beep' }, character: 'arbyss', type: 'full', artist: { name: '@artist_one', url: 'https://x.com/' }, created: '2026-10-20', ratio: 1.15 },
  { id: 'a6', title: { ru: 'Комикс: первый мит', en: 'Comic: first meet' }, character: 'both', type: 'comic', artist: { name: '@artist_five', url: 'https://t.me/' }, created: '2026-09-05', ratio: 1.45 },
  { id: 'a7', title: { ru: 'Муркас спит', en: 'Murkas sleeping' }, character: 'murkas', type: 'full', artist: { name: '@artist_two', url: 'https://x.com/' }, created: '2026-08-11', ratio: 1.5 },
  { id: 'a8', title: { ru: 'Скетч лапок', en: 'Paw sketch' }, character: 'murkas', type: 'sketch', artist: { name: '@artist_six', url: 'https://t.me/' }, created: null, ratio: 0.9 },
];

/** Все категории фото / теги арта (из базы - списком, у заглушек - одной) */
export const photoCats = (p: Photo): PhotoCategory[] => p.cats ?? (p.category ? [p.category] : []);
export const artTypes = (a: Art): ArtType[] => a.types ?? (a.type ? [a.type] : []);
