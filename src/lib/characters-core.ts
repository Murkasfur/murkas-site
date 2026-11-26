// Персонажи и образы: описание полей, разбор списков и тексты.
// Без зависимостей: импортируют и сайт (src/lib/characters.ts), и бот (bot/src/characters.ts).
// Схема таблиц - migrations/0006_characters.sql

export type Lang = 'ru' | 'en';
export type Pair = { ru: string; en: string };
export type Theme = 'watermelon' | 'redpanda';
export type LookKind = 'fullsuit' | 'partial' | 'kigurumi' | 'other';
export type RuleKind = 'ok' | 'ask' | 'no' | 'info';

export type CharacterRow = {
  id: string; position: number; visible: number; theme: Theme;
  name_ru: string; name_en: string | null; label_ru: string | null; label_en: string | null;
  tagline_ru: string | null; tagline_en: string | null; species_ru: string | null; species_en: string | null;
  pronouns_ru: string | null; pronouns_en: string | null; summary_ru: string | null; summary_en: string | null;
  story_ru: string | null; story_en: string | null;
  traits: string | null; likes: string | null; dislikes: string | null; palette: string | null; marks: string | null;
  art_ok: string | null; art_ask: string | null; art_no: string | null; facts: string | null;
  hero_file: string | null; hero_artist: string | null; ref_file: string | null; updated_at: string;
};

export type LookRow = {
  id: string; character_id: string; position: number; visible: number; kind: LookKind;
  name_ru: string; name_en: string | null; subtitle_ru: string | null; subtitle_en: string | null;
  status_ru: string | null; status_en: string | null; maker: string | null;
  since_ru: string | null; since_en: string | null; type_ru: string | null; type_en: string | null;
  species_ru: string | null; species_en: string | null;
  parts: string | null; parts_note_ru: string | null; parts_note_en: string | null; features: string | null;
  pills: string | null; rules_ok: string | null; rules_ask: string | null; rules_no: string | null;
  notes: string | null; addons: string | null; timeline: string | null;
  cover_file: string | null; angle_front: string | null; angle_side: string | null; angle_back: string | null; angle_motion: string | null;
  updated_at: string;
};

// ---------- разбор ----------

const lines = (v: string | null | undefined) => (v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
const cells = (line: string) => line.split('|').map((s) => s.trim());

/** Пара из двух колонок: если английского нет - русский */
export const pair = (ru: string | null | undefined, en: string | null | undefined): Pair | null =>
  ru ? { ru, en: en || ru } : en ? { ru: en, en } : null;

/** «ru | en» на строку -> пары */
export const parseList = (v: string | null | undefined): Pair[] =>
  lines(v).map((l) => { const [ru, en] = cells(l); return { ru, en: en || ru }; });

/** «Корка | Rind | #2E7D32» */
export const parsePalette = (v: string | null | undefined) =>
  lines(v).flatMap((l) => {
    const c = cells(l);
    const hex = c.find((x) => /^#[0-9a-f]{6}$/i.test(x));
    if (!hex) return [];
    const names = c.filter((x) => x !== hex);
    return [{ name: { ru: names[0] ?? hex, en: names[1] || names[0] || hex }, hex: hex.toUpperCase() }];
  });

/** «ok | Фото - можно | Photos - yes» */
export const parsePills = (v: string | null | undefined) =>
  lines(v).flatMap((l) => {
    const [k, ru, en] = cells(l);
    const kind = (['ok', 'ask', 'no', 'info'] as RuleKind[]).find((x) => x === k?.toLowerCase());
    return kind && ru ? [{ kind, text: { ru, en: en || ru } }] : [];
  });

/** «Заголовок | Title | текст | text» */
export const parseNotes = (v: string | null | undefined) =>
  lines(v).flatMap((l) => {
    const c = cells(l);
    if (c.length < 2) return [];
    if (c.length === 2) return [{ title: { ru: c[0], en: c[0] }, text: { ru: c[1], en: c[1] } }];
    if (c.length === 3) return [{ title: { ru: c[0], en: c[1] }, text: { ru: c[2], en: c[2] } }];
    return [{ title: { ru: c[0], en: c[1] || c[0] }, text: { ru: c[2], en: c[3] || c[2] } }];
  });

/** «2023 | Реф и заказ | Ref and order» */
export const parseTimeline = (v: string | null | undefined) =>
  lines(v).flatMap((l) => {
    const [when, ru, en] = cells(l);
    return ru ? [{ when, text: { ru, en: en || ru } }] : [];
  });

/** «@ник | https://...» или просто «Имя» */
export const parseLink = (v: string | null | undefined) => {
  if (!v) return null;
  const [name, url] = cells(v);
  return name ? { name, url: url && /^https:\/\//.test(url) ? url : null } : null;
};

/** Длинный текст: русский, строка «---», английский */
export const splitLong = (v: string): [string, string | null] => {
  const [ru, en] = v.split(/\n\s*-{3,}\s*\n/);
  return [ru.trim(), en?.trim() || null];
};
export const paragraphs = (v: string | null | undefined) => (v ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

// ---------- поля для бота ----------

export type FieldType = 'pair' | 'long' | 'list' | 'palette' | 'pills' | 'notes' | 'timeline' | 'link' | 'file';
export type Field = { key: string; label: string; type: FieldType; hint?: string };

const HINT: Record<FieldType, string> = {
  pair: 'Напиши: <i>Русский | English</i> (английский можно не писать)',
  long: 'Пришли текст на русском, потом строку <code>---</code>, потом английский. Абзацы - через пустую строку.',
  list: 'Один пункт на строку: <i>русский | english</i>',
  palette: 'Цвет на строку: <i>Корка | Rind | #2E7D32</i>',
  pills: 'Правило на строку: <i>ok | Фото - можно | Photos - yes</i>\nok = можно, ask = спроси, no = нельзя, info = просто инфо',
  notes: 'Карточка на строку: <i>Заголовок | Title | текст | text</i>',
  timeline: 'Шаг на строку: <i>2023 | Реф и заказ | Ref and order</i>',
  link: 'Напиши: <i>Имя | https://ссылка</i> (ссылку можно не писать)',
  file: 'Пришли картинку (лучше файлом, чтобы без сжатия)',
};
export const hintFor = (f: Field) => f.hint ?? HINT[f.type];

/** Поля персонажа. key - колонка; для pair/long это основа без _ru/_en */
export const CHARACTER_FIELDS: Field[] = [
  { key: 'name', label: 'Имя', type: 'pair' },
  { key: 'label', label: 'Подпись над именем', type: 'pair', hint: 'Например: <i>Фурсона | Fursona</i>' },
  { key: 'tagline', label: 'Строка под именем', type: 'pair' },
  { key: 'species', label: 'Вид', type: 'pair' },
  { key: 'pronouns', label: 'Местоимения', type: 'pair', hint: 'Например: <i>он / его | he / him</i>' },
  { key: 'summary', label: 'Коротко', type: 'long', hint: '2-3 предложения, видны сразу.\n' + HINT.long },
  { key: 'story', label: 'История', type: 'long' },
  { key: 'traits', label: 'Черты характера', type: 'list' },
  { key: 'likes', label: 'Любит', type: 'list' },
  { key: 'dislikes', label: 'Не любит', type: 'list' },
  { key: 'palette', label: 'Палитра', type: 'palette' },
  { key: 'marks', label: 'Особые приметы', type: 'list' },
  { key: 'art_ok', label: 'Художникам: можно', type: 'list' },
  { key: 'art_ask', label: 'Художникам: спроси', type: 'list' },
  { key: 'art_no', label: 'Художникам: нельзя', type: 'list' },
  { key: 'facts', label: 'Факты', type: 'list' },
  { key: 'hero_file', label: 'Главный арт', type: 'file' },
  { key: 'hero_artist', label: 'Автор главного арта', type: 'link' },
  { key: 'ref_file', label: 'Реф (для «Скачать реф»)', type: 'file' },
];

export const LOOK_FIELDS: Field[] = [
  { key: 'name', label: 'Название', type: 'pair', hint: 'Например: <i>Фуллсьют | Fullsuit</i>' },
  { key: 'subtitle', label: 'Описание', type: 'pair' },
  { key: 'status', label: 'Статус (чип)', type: 'pair', hint: 'Например: <i>Готов к кону | Con ready</i>' },
  { key: 'maker', label: 'Мейкер', type: 'link' },
  { key: 'since', label: 'Появился', type: 'pair', hint: 'Например: <i>осень 2025 | fall 2025</i>' },
  { key: 'type', label: 'Тип', type: 'pair' },
  { key: 'species', label: 'Вид', type: 'pair' },
  { key: 'parts', label: 'Из чего состоит', type: 'list' },
  { key: 'parts_note', label: 'Пояснение к составу', type: 'pair' },
  { key: 'features', label: 'Что умеет', type: 'list' },
  { key: 'pills', label: 'Памятка коротко', type: 'pills' },
  { key: 'rules_ok', label: 'Памятка: можно', type: 'list' },
  { key: 'rules_ask', label: 'Памятка: сначала спроси', type: 'list' },
  { key: 'rules_no', label: 'Памятка: нельзя', type: 'list' },
  { key: 'notes', label: 'Памятка: пояснения', type: 'notes' },
  { key: 'addons', label: 'Дополнения', type: 'list' },
  { key: 'timeline', label: 'Как он появился', type: 'timeline' },
  { key: 'cover_file', label: 'Главное фото', type: 'file' },
  { key: 'angle_front', label: 'Фото: анфас', type: 'file' },
  { key: 'angle_side', label: 'Фото: профиль', type: 'file' },
  { key: 'angle_back', label: 'Фото: со спины', type: 'file' },
  { key: 'angle_motion', label: 'Фото: в движении', type: 'file' },
];

/** Колонки, в которые можно писать (защита от подстановки чужих имён в SQL) */
export const columnsOf = (f: Field) => (f.type === 'pair' || f.type === 'long' ? [`${f.key}_ru`, `${f.key}_en`] : [f.key]);

export const LOOK_KINDS: { key: LookKind; ru: string; en: string }[] = [
  { key: 'fullsuit', ru: 'Фуллсьют', en: 'Fullsuit' },
  { key: 'partial', ru: 'Партиал', en: 'Partial' },
  { key: 'kigurumi', ru: 'Кигуруми', en: 'Kigurumi' },
  { key: 'other', ru: 'Другое', en: 'Other' },
];

/** 'Arbyss Kigurumi!' -> 'arbyss-kigurumi' */
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

// ---------- тексты сайта ----------

export const T = {
  en: {
    charsTitle: 'Characters',
    charsSubtitle: 'My OCs. Open one to see the lore, refs, art rules and their fursuits.',
    suitsTitle: 'Fursuits',
    suitsSubtitle: 'All suits by character. Open one to see photos, what it can do and where to meet it.',
    open: 'Open',
    aboutChar: 'About {name}',
    species: 'Species', pronouns: 'Pronouns', looks: 'Looks',
    downloadRef: 'Download ref', allArts: 'All art', artBy: 'Art: {name}',
    story: 'Story', storySub: 'the whole lore', readMore: 'Read more', readLess: 'Show less',
    character: 'Personality', likes: 'Likes', dislikes: 'Dislikes',
    palette: 'Palette', paletteSub: 'tap a color to copy it', copied: 'Copied {hex}',
    forArtists: 'For artists', forArtistsSub: "what's important to get right", marks: 'Distinctive marks',
    artOk: 'Okay', artAsk: 'Ask first', artNo: 'Please don\'t',
    looksTitle: 'Looks and suits', looksSub: 'tap to open the fursuit',
    relations: 'Others', facts: 'Facts', arts: 'Art', artsSub: 'featuring this character', allArtsWith: 'All art with {name}',
    otherChars: 'Other characters',
    fursuits: 'Fursuits', look: 'Look',
    maker: 'Maker', since: 'Since', type: 'Type',
    parts: 'What it\'s made of', features: 'What it can do',
    events: 'events in this look', event1: 'event in this look',
    upload: 'Upload a photo',
    angles: { front: 'Front', side: 'Side', back: 'Back', motion: 'In motion' },
    noPhotos: 'No photos of the {look} yet', noPhotosText: 'Took a picture of me in it? Upload it - after a check it will appear here and in Photos.',
    ifYouMeet: 'If you meet me:', fullMemo: 'Full guide',
    memoTitle: 'Guide: met me in suit?', memoSub: 'The short version is at the top of the page, here are the details.',
    mainRule: 'If I say "no", it\'s a no.', mainRuleText: 'If something bothers me, I\'ll tell you. If I don\'t say anything, everything is fine, don\'t worry.',
    memoOk: 'Okay', memoAsk: 'Ask first', memoNo: 'Please don\'t',
    addons: 'Add-ons', where: 'Where to meet', all: 'All', inDays: 'In {n} days', today: 'Today', then: 'Next: {name}',
    history: 'How it came to be',
    empty: 'Nothing here yet :(',
  },
  ru: {
    charsTitle: 'Персонажи',
    charsSubtitle: 'Мои OC. Открой персонажа - там лор, рефы, правила для артов и его фурсьюты.',
    suitsTitle: 'Фурсьюты',
    suitsSubtitle: 'Все костюмы по персонажам. Открой - там фото, что умеют и где встретить.',
    open: 'Открыть',
    aboutChar: 'О персонаже {name}',
    species: 'Вид', pronouns: 'Местоимения', looks: 'Образы',
    downloadRef: 'Скачать реф', allArts: 'Все арты', artBy: 'Арт: {name}',
    story: 'История', storySub: 'лор целиком', readMore: 'Читать дальше', readLess: 'Свернуть',
    character: 'Характер', likes: 'Любит', dislikes: 'Не любит',
    palette: 'Палитра', paletteSub: 'нажми на цвет, чтобы скопировать', copied: 'Скопировано: {hex}',
    forArtists: 'Для художников', forArtistsSub: 'что важно не перепутать', marks: 'Особые приметы',
    artOk: 'Можно', artAsk: 'Спроси', artNo: 'Нельзя',
    looksTitle: 'Образы и костюмы', looksSub: 'нажми, чтобы открыть фурсьют',
    relations: 'Связи', facts: 'Факты', arts: 'Арты', artsSub: 'с этим персонажем', allArtsWith: 'Все арты с {name}',
    otherChars: 'Другие персонажи',
    fursuits: 'Фурсьюты', look: 'Образ',
    maker: 'Мейкер', since: 'Появился', type: 'Тип',
    parts: 'Из чего состоит', features: 'Что умеет',
    events: 'ивентов в этом образе', event1: 'ивент в этом образе',
    upload: 'Загрузить фото',
    angles: { front: 'Анфас', side: 'Профиль', back: 'Со спины', motion: 'В движении' },
    noPhotos: 'Фото в образе «{look}» пока нет', noPhotosText: 'Сфоткал меня в нём? Загрузи - после проверки фото появится здесь и в «Фото».',
    ifYouMeet: 'Если встретил меня:', fullMemo: 'Вся памятка',
    memoTitle: 'Памятка: встретил меня в костюме?', memoSub: 'Коротко - наверху страницы, тут подробно.',
    mainRule: 'Если я говорю «нет» - это нет.', mainRuleText: 'Если мне что-то не нравится - я сам скажу. Не говорю - значит, всё хорошо, не переживай.',
    memoOk: 'Можно', memoAsk: 'Сначала спроси', memoNo: 'Нельзя',
    addons: 'Дополнения', where: 'Где встретить', all: 'Все', inDays: 'Через {n} дн.', today: 'Сегодня', then: 'Дальше: {name}',
    history: 'Как он появился',
    empty: 'Пока пусто :(',
  },
} as const;

export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
