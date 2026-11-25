// Логика бота: команды, кнопки и пошаговые диалоги.
import type { Env } from './env';
import { api, downloadFile, send, edit, answer, esc, type Update, type Message, type CallbackQuery, type Keyboard } from './tg';
import { SETTINGS_KEY, mergeSettings, type Settings } from '../../src/lib/settings-core';
import { pages, type PageKey } from '../../src/data/site';
import { computeNow, type NowSource } from '../../src/lib/now-core';
import { mediaCallback, pendingCommand, rejectedCommand, storageLine } from './media';
import { sniff, shortId } from '../../src/lib/media-core';
import {
  STATUSES, statusLabel, parsePair, parseDate, parseUrl, dateText,
  listEvents, getEvent, insertEvent, updateEvent, deleteEvent, toNowEvent, KINDS, kindLabel, type Kind,
  type EventDraft, type EventRow, type Status,
} from './events';

// ---------- состояние диалога (таблица bot_state) ----------

type Field = 'title' | 'city' | 'date' | 'venue' | 'url';
type State =
  | { flow: 'add'; step: Field | 'kind' | 'status' | 'confirm'; draft: EventDraft }
  | { flow: 'edit'; id: string; field: Field }
  | { flow: 'now' }
  | { flow: 'homeLabel'; id: string; slot: number }
  | { flow: 'hero' }
  | { flow: 'default' };

const getState = async (env: Env, chat: number) => {
  const row = await env.DB.prepare(`SELECT state FROM bot_state WHERE chat_id = ?`).bind(chat).first<{ state: string }>();
  return row ? (JSON.parse(row.state) as State) : null;
};
const setState = (env: Env, chat: number, s: State) =>
  env.DB.prepare(
    `INSERT INTO bot_state (chat_id, state) VALUES (?, ?)
     ON CONFLICT (chat_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
  ).bind(chat, JSON.stringify(s)).run();
const clearState = (env: Env, chat: number) => env.DB.prepare(`DELETE FROM bot_state WHERE chat_id = ?`).bind(chat).run();

// ---------- настройки сайта (KV) ----------

const getSettings = async (env: Env) => mergeSettings(await env.SETTINGS.get(SETTINGS_KEY, 'json'));
const saveSettings = (env: Env, s: Settings) => env.SETTINGS.put(SETTINGS_KEY, JSON.stringify(s));

const PAGE_NAMES: Record<PageKey, string> = {
  home: 'Главная', characters: 'Персонажи', fursuits: 'Фурсьюты', events: 'Ивенты',
  photos: 'Фото', arts: 'Арт', portfolio: 'Портфолио',
};

// ---------- тексты ----------

const HELP = `<b>Бот murkas.net</b> 🐾

<b>Сайт</b>
/status - что сейчас на сайте
/maintenance - закрыть или открыть весь сайт
/pages - какие страницы готовы, а какие «в работе»
/now - ручной статус в «Сейчас» (сверх расписания)
/default - статус, когда ничего не происходит

<b>Ивенты</b>
/events - список, нажми на ивент чтобы изменить
/addevent - добавить новый

<b>Загрузки</b>
/pending - что ждёт проверки
/rejected - отклонённые (вернуть или удалить)
/limit - сколько файлов в сутки можно загрузить с одного IP
/home - три фото в карточке «Фурсьюты» на главной
/hero - картинка в карточке «Привет, это» на главной

/cancel - отменить то, что делаешь сейчас`;

const ASK: Record<Field, string> = {
  title: 'Как называется?\n<i>Русское | English</i>, если одинаково - просто одно.\nНапример: <code>Зимний мит | Winter meet</code>',
  city: 'Где?\n<i>Русское | English</i>. Например: <code>Торонто | Toronto</code>',
  date: `Когда?
<code>12.12.2026 18:00-22:00</code> - мит, пати, панель (со временем)
<code>12.12.2026</code> - конвент на весь день
<code>12.12.2026 14.12.2026</code> - конвент на несколько дней
<code>~2027-03</code> - точной даты нет, примерно март 2027
<code>~2027-07 лето 2027 | summer 2027</code> - примерно, со своей подписью`,
  venue: 'Где именно? Отель, парк, бар...\n<i>Русское | English</i>, если одинаково - просто одно.\nНапример: <code>Sheraton Centre Toronto</code>',
  url: 'Ссылка на сайт ивента (https://...)',
};
const STEPS = 7;
const kindRow = (prefix: string): Keyboard => [KINDS.map((k) => ({ text: `${k.emoji} ${k.ru}`, callback_data: prefix + k.key }))];

const CANCEL_BTN = { text: 'Отмена', callback_data: 'x' };

/** Прошёл, а статус «Буду в…» - сайт сам считает его посещённым (src/lib/events.ts) */
const autoWent = (e: EventDraft) => {
  const end = e.end_date ?? e.start_date;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  return !!end && end < today && ['full', 'partial', 'nosuit'].includes(e.status ?? '');
};

function eventCard(e: EventDraft & { id?: string }) {
  const pair = (ru?: string | null, en?: string | null) => esc(ru ?? '?') + (en ? ` <i>/ ${esc(en)}</i>` : '');
  return [
    `<b>${pair(e.title_ru, e.title_en)}</b>`,
    `📍 ${pair(e.city_ru, e.city_en)}`,
    `📅 ${esc(dateText(e))}${e.approx_en ? ` <i>/ ${esc(e.approx_en)}</i>` : ''}`,
    kindLabel(e.kind),
    e.venue_ru ? `🏛 ${pair(e.venue_ru, e.venue_en)}` : '',
    statusLabel(e.status ?? 'full') + (autoWent(e) ? '\n<i>Ивент прошёл - на сайте уже «Был». Если не пошёл, поставь «Не был».</i>' : ''),
    e.url ? `🔗 ${esc(e.url)}` : '',
  ].filter(Boolean).join('\n');
}

const eventKb = (id: string): Keyboard => [
  [{ text: '✏️ Название', callback_data: `ef:${id}:title` }, { text: '✏️ Город', callback_data: `ef:${id}:city` }],
  [{ text: '✏️ Дата', callback_data: `ef:${id}:date` }, { text: '✏️ Ссылка', callback_data: `ef:${id}:url` }],
  [{ text: '✏️ Тип', callback_data: `ek:${id}` }, { text: '✏️ Место', callback_data: `ef:${id}:venue` }],
  ...statusRows(`es:${id}:`),
  [{ text: '🗑 Удалить', callback_data: `ed:${id}` }, { text: '← К списку', callback_data: 'el' }],
];

const statusRows = (prefix: string): Keyboard => {
  const btns = STATUSES.map((s) => ({ text: `${s.emoji} ${s.ru}`, callback_data: prefix + s.key }));
  return [btns.slice(0, 2), btns.slice(2, 4), btns.slice(4, 6)];
};

async function eventsList(env: Env): Promise<[string, Keyboard]> {
  const all = await listEvents(env.DB);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const key = (e: EventRow) => e.start_date ?? e.sort_key ?? '9999';
  // будущие + последний месяц; старое в архиве, его редко надо трогать
  const shown = all.filter((e) => key(e) >= monthAgo).slice(0, 30);
  const kb: Keyboard = shown.map((e) => [
    { text: `${key(e) < today ? '· ' : ''}${dateText(e)} - ${e.title_ru}`.slice(0, 60), callback_data: `ev:${e.id}` },
  ]);
  kb.push([{ text: '➕ Добавить ивент', callback_data: 'ea' }]);
  const old = all.length - shown.length;
  return [`<b>Ивенты</b> (${all.length})${old ? `\nСтарше месяца не показываю: ${old}` : ''}\nНажми, чтобы изменить:`, kb];
}

async function statusText(env: Env) {
  const s = await getSettings(env);
  const db = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM events) AS events,
            (SELECT count(*) FROM media WHERE status = 'published') AS published,
            (SELECT count(*) FROM media WHERE status = 'pending') AS pending`,
  ).first<{ events: number; published: number; pending: number }>();
  const wip = pages.filter((p) => s.pages[p.key] === 'wip').map((p) => PAGE_NAMES[p.key]);
  const now = await currentNow(env, s);
  return `<b>murkas.net</b>
${s.maintenance ? '🔴 Сайт закрыт (maintenance)' : '🟢 Сайт открыт'}
🚧 В работе: ${wip.length ? wip.join(', ') : 'ничего'}
💬 Сейчас: ${esc(now.ru)} <i>/ ${esc(now.en)}</i> (${SOURCE[now.source]})

📅 Ивентов: ${db?.events ?? 0}
🖼 Опубликовано фото и артов: ${db?.published ?? 0}
⏳ Ждут модерации: ${db?.pending ?? 0}${db?.pending ? ' (/pending)' : ''}
${await storageLine(env)}
📤 Лимит загрузок: ${s.uploadLimit} в сутки с одного IP`;
}

const SOURCE: Record<NowSource, string> = {
  manual: 'вручную', event: 'ивент', sleep: 'сон', con: 'конвент', holiday: 'праздник', class: 'пары', default: 'по умолчанию',
};

async function currentNow(env: Env, s?: Settings) {
  const settings = s ?? (await getSettings(env));
  return computeNow(new Date(), (await listEvents(env.DB)).map(toNowEvent), settings);
}

/** «Текст | Text 2ч» -> пара + срок. Срок: 30м, 2ч, 1д (или 30m, 2h, 1d) */
function parseManual(text: string): { ru: string; en: string; until: string | null } | null {
  let t = text.trim();
  let until: string | null = null;
  const d = t.match(/\s+(\d+)\s*(м|мин|m|ч|h|д|d)$/i);
  if (d) {
    const unit = d[2].toLowerCase();
    const ms = +d[1] * (unit.startsWith('м') || unit === 'm' ? 60e3 : unit === 'ч' || unit === 'h' ? 3600e3 : 864e5);
    until = new Date(Date.now() + ms).toISOString();
    t = t.slice(0, d.index).trim();
  }
  const p = parsePair(t);
  return p ? { ru: p[0], en: p[1] ?? p[0], until } : null;
}

const untilText = (until: string | null) =>
  until
    ? `до ${new Date(until).toLocaleString('ru-RU', { timeZone: 'America/Toronto', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'пока не снимешь (/now авто)';

async function nowScreen(env: Env): Promise<[string, Keyboard]> {
  const s = await getSettings(env);
  const now = await currentNow(env, s);
  const lines = [
    `<b>Сейчас на сайте:</b> ${esc(now.ru)} <i>/ ${esc(now.en)}</i>`,
    `Источник: ${SOURCE[now.source]}`,
  ];
  if (s.manual) lines.push(`\nРучной статус ${untilText(s.manual.until)}`);
  lines.push(
    '',
    'Поставить свой: <code>/now Гуляю | Walking 2ч</code>',
    'Срок: <code>30м</code>, <code>2ч</code>, <code>1д</code>. Без срока - висит, пока не снимешь.',
    `По умолчанию: <i>${esc(s.now.ru)}</i> (/default)`,
  );
  const kb: Keyboard = s.manual ? [[{ text: '🔄 Вернуть расписание', callback_data: 'nowauto' }]] : [];
  return [lines.join('\n'), kb];
}

const maintKb = (on: boolean): Keyboard => [[on ? { text: '🟢 Открыть сайт', callback_data: 'mt:off' } : { text: '🔴 Закрыть сайт', callback_data: 'mt:on' }]];
const maintText = (on: boolean) =>
  on ? '🔴 Сайт <b>закрыт</b>: все видят «Сайт ненадолго закрыт».' : '🟢 Сайт <b>открыт</b>.';

const pagesKb = (s: Settings): Keyboard =>
  pages.filter((p) => p.key !== 'home').map((p) => [
    { text: `${s.pages[p.key] === 'wip' ? '🚧' : '✅'} ${PAGE_NAMES[p.key]}`, callback_data: `pg:${p.key}` },
  ]);
const PAGES_TEXT = '<b>Страницы</b>\n✅ готова, 🚧 «в работе». Нажми, чтобы переключить.\nНа сайте поменяется в течение минуты.';

// ---------- входящие ----------

export async function handleUpdate(env: Env, u: Update) {
  const admins = env.ADMIN_IDS.split(',').map((s) => +s.trim());
  const from = u.message?.from?.id ?? u.callback_query?.from.id;
  if (!from || !admins.includes(from)) return; // чужим молчим
  if (u.message?.chat.type && u.message.chat.type !== 'private') return;
  if (u.callback_query) return onCallback(env, u.callback_query);
  if (u.message?.photo || u.message?.document) return onFile(env, u.message);
  if (u.message?.text) return onText(env, u.message);
}

/** Прислали картинку: если ждём фото для «Привет, это» - ставим */
async function onFile(env: Env, msg: Message) {
  const chat = msg.chat.id;
  const st = await getState(env, chat);
  if (st?.flow !== 'hero') return send(env, chat, 'Чтобы поставить картинку в «Привет, это» на главной, сначала /hero');
  const file = msg.document ?? msg.photo![msg.photo!.length - 1]; // у фото последний размер - самый большой
  if ((file.file_size ?? 0) > 20 * 1024 * 1024) return send(env, chat, 'Больше 20 МБ - Telegram не даёт ботам такие скачивать. Пришли поменьше.');
  const bytes = await downloadFile(env, file.file_id);
  const type = bytes && sniff(bytes);
  if (!bytes || !type) return send(env, chat, 'Не получилось прочитать картинку. Нужен JPG, PNG, WebP или GIF.');
  const name = `${shortId(10)}.${type.ext}`;
  await env.MEDIA.put(`media/${name}`, bytes, { httpMetadata: { contentType: type.mime } });
  return setHero(env, chat, name);
}

async function setHero(env: Env, chat: number, file: string | null) {
  const s = await getSettings(env);
  const old = s.hero;
  s.hero = file;
  await saveSettings(env, s);
  await clearState(env, chat);
  // старую картинку, загруженную именно для «Привет» (не из галереи), убираем из R2
  if (old && old !== file) {
    const inGallery = await env.DB.prepare(`SELECT id FROM media WHERE r2_key = ?`).bind(`media/${old}`).first();
    if (!inGallery) await env.MEDIA.delete(`media/${old}`);
  }
  return send(env, chat, file ? 'Готово ✅ Картинка в «Привет, это» обновится на главной в течение минуты.' : 'Убрало картинку из «Привет, это».');
}

async function onText(env: Env, msg: Message) {
  const chat = msg.chat.id;
  const text = msg.text!.trim();
  const [cmdRaw, ...rest] = text.split(/\s+/);
  const cmd = cmdRaw.startsWith('/') ? cmdRaw.slice(1).split('@')[0].toLowerCase() : null;
  const arg = rest.join(' ');

  if (cmd) {
    await clearState(env, chat);
    switch (cmd) {
      case 'start':
      case 'help':
        return send(env, chat, HELP);
      case 'cancel':
        return send(env, chat, 'Ок, отменило.');
      case 'status':
        return send(env, chat, await statusText(env));
      case 'maintenance': {
        const s = await getSettings(env);
        if (arg === 'on' || arg === 'off') {
          s.maintenance = arg === 'on';
          await saveSettings(env, s);
        }
        return send(env, chat, maintText(s.maintenance), maintKb(s.maintenance));
      }
      case 'pages':
      case 'page': {
        const s = await getSettings(env);
        const [key, val] = rest as [PageKey, string];
        if (key in s.pages && (val === 'live' || val === 'wip')) {
          s.pages[key] = val;
          await saveSettings(env, s);
        }
        return send(env, chat, PAGES_TEXT, pagesKb(s));
      }
      case 'now': {
        if (/^(авто|auto|off|сброс)$/i.test(arg)) {
          const s = await getSettings(env);
          s.manual = null;
          await saveSettings(env, s);
          const now = await currentNow(env, s);
          return send(env, chat, `Вернуло расписание 🔄\nСейчас: ${esc(now.ru)} <i>(${SOURCE[now.source]})</i>`);
        }
        if (arg) return saveManual(env, chat, arg);
        const [t, kb] = await nowScreen(env);
        return send(env, chat, t, kb);
      }
      case 'default': {
        if (arg) return saveDefault(env, chat, arg);
        const s = await getSettings(env);
        await setState(env, chat, { flow: 'default' });
        return send(env, chat, `По умолчанию: <b>${esc(s.now.ru)}</b> <i>/ ${esc(s.now.en)}</i>\nПоказывается, когда нет пар, ивентов, сна и праздников.\n\nНапиши новый: <i>Русский | English</i>`, [[CANCEL_BTN]]);
      }
      case 'events': {
        const [t, kb] = await eventsList(env);
        return send(env, chat, t, kb);
      }
      case 'hero': {
        const sets = await getSettings(env);
        await setState(env, chat, { flow: 'hero' });
        return send(env, chat, `<b>Картинка в «Привет, это»</b>\nСейчас: ${sets.hero ? 'стоит' : 'нет (зелёная заглушка)'}\n\nПришли фото сюда (можно файлом, чтобы без сжатия). Или открой фото с сайта в «🔍 По одному» и нажми <b>👋 В «Привет»</b>.`, [
          ...(sets.hero ? [[{ text: '🗑 Убрать картинку', callback_data: 'hhx' }]] : []),
          [CANCEL_BTN],
        ]);
      }
      case 'home': {
        const [t, kb] = await homeScreen(env);
        return send(env, chat, t, kb);
      }
      case 'pending':
        return pendingCommand(env, chat);
      case 'rejected':
        return rejectedCommand(env, chat);
      case 'limit': {
        const s = await getSettings(env);
        const n = Number(arg);
        if (arg && Number.isInteger(n) && n >= 0 && n <= 10000) {
          s.uploadLimit = n;
          await saveSettings(env, s);
          return send(env, chat, `Лимит: <b>${n}</b> файлов в сутки с одного IP ✅${n === 0 ? '\n<i>0 = загрузки выключены.</i>' : ''}`);
        }
        return send(env, chat, `Сейчас: <b>${s.uploadLimit}</b> файлов в сутки с одного IP.\nПоменять: <code>/limit 500</code> (0 = выключить загрузки)`);
      }
      case 'addevent':
        await setState(env, chat, { flow: 'add', step: 'title', draft: {} });
        return send(env, chat, `<b>Новый ивент</b> 1/${STEPS}\n\n${ASK.title}`, [[CANCEL_BTN]]);
      default:
        return send(env, chat, 'Не знаю такую команду. /help');
    }
  }

  const st = await getState(env, chat);
  if (!st) return send(env, chat, 'Выбери, что сделать: /help');

  if (st.flow === 'now') return saveManual(env, chat, text);
  if (st.flow === 'default') return saveDefault(env, chat, text);
  if (st.flow === 'homeLabel') {
    const p = parsePair(text);
    if (!p) return send(env, chat, 'Пусто или слишком длинно. Напиши: <i>Русский | English</i>');
    return saveHomeSlot(env, chat, st.id, st.slot, p[0], p[1] ?? p[0]);
  }
  if (st.flow === 'hero') return send(env, chat, 'Жду картинку: пришли фото или файл. /cancel - отменить');

  // разбираем ответ на текущий шаг
  const field = st.flow === 'add' ? st.step : st.field;
  let patch: Partial<EventDraft> | null = null;
  let err = '';
  if (field === 'title' || field === 'city') {
    const p = parsePair(text);
    if (!p) err = 'Пусто или слишком длинно (до 120 символов)';
    else patch = field === 'title' ? { title_ru: p[0], title_en: p[1] } : { city_ru: p[0], city_en: p[1] };
  } else if (field === 'date') {
    const d = parseDate(text);
    if (typeof d === 'string') err = d;
    else patch = d;
  } else if (field === 'venue') {
    const p = parsePair(text);
    if (!p) err = 'Пусто или слишком длинно (до 120 символов)';
    else patch = { venue_ru: p[0], venue_en: p[1] };
  } else if (field === 'url') {
    const url = parseUrl(text);
    if (!url) err = 'Нужна ссылка, которая начинается с https://';
    else patch = { url };
  } else {
    return send(env, chat, 'Тут нужно нажать кнопку выше 👆');
  }
  if (err || !patch) return send(env, chat, `${err}. Попробуй ещё раз:\n\n${ASK[field as Field]}`, [[CANCEL_BTN]]);

  if (st.flow === 'edit') {
    await updateEvent(env.DB, st.id, patch);
    await clearState(env, chat);
    const e = await getEvent(env.DB, st.id);
    return e ? send(env, chat, `Сохранило ✅\n\n${eventCard(e)}`, eventKb(e.id)) : send(env, chat, 'Ивент пропал 🤔');
  }

  // мастер добавления: следующий шаг
  const draft = { ...st.draft, ...patch };
  const next = { title: 'city', city: 'date', date: 'kind', venue: 'status' } as const;
  if (field === 'url') return confirmAdd(env, chat, draft);
  const step = next[field as keyof typeof next];
  await setState(env, chat, { flow: 'add', step, draft });
  if (step === 'kind') return send(env, chat, `<b>Новый ивент</b> 4/${STEPS}\n\nЧто это?`, [...kindRow('wk:'), [CANCEL_BTN]]);
  if (step === 'status') return send(env, chat, `<b>Новый ивент</b> 6/${STEPS}\n\nКак иду?`, [...statusRows('ws:'), [CANCEL_BTN]]);
  return send(env, chat, `<b>Новый ивент</b> ${step === 'city' ? 2 : 3}/${STEPS}\n\n${ASK[step]}`, [[CANCEL_BTN]]);
}

// ---------- плитки «Фурсьюты» на главной ----------

const SLOT = ['1️⃣', '2️⃣', '3️⃣'];

async function homeScreen(env: Env): Promise<[string, Keyboard]> {
  const s = await getSettings(env);
  const lines = s.home.map((x, i) => `${SLOT[i]} ${x ? `${esc(x.ru || 'без подписи')} <i>(${x.id})</i>` : '<i>само: закреплённое или свежее фото</i>'}`);
  const kb: Keyboard = s.home.flatMap((x, i) => (x ? [[{ text: `❌ Освободить ${i + 1}`, callback_data: `hc:${i}` }]] : []));
  return [
    `<b>Карточка «Фурсьюты» на главной</b>\n\n${lines.join('\n')}\n\nЧтобы поставить фото: открой его в «🔍 По одному» и нажми <b>🏠 На главную</b>.`,
    kb,
  ];
}

async function saveHomeSlot(env: Env, chat: number, id: string, slot: number, ru: string, en: string) {
  const s = await getSettings(env);
  s.home[slot] = { id, ru, en };
  await saveSettings(env, s);
  await clearState(env, chat);
  return send(env, chat, `Готово ✅ Плитка ${slot + 1}${ru ? `: <b>${esc(ru)}</b>` : ' без подписи'}. На главной - в течение минуты.\n/home - все три`);
}

async function saveManual(env: Env, chat: number, text: string) {
  const m = parseManual(text);
  if (!m) return send(env, chat, 'Пусто или слишком длинно. Пример: <code>/now Гуляю | Walking 2ч</code>');
  const s = await getSettings(env);
  s.manual = m;
  await saveSettings(env, s);
  await clearState(env, chat);
  return send(
    env, chat,
    `Поставило ✅ <b>${esc(m.ru)}</b> <i>/ ${esc(m.en)}</i>\n${untilText(m.until)}${m.en === m.ru && !text.includes('|') ? '\n<i>Английского не было, на /en тот же текст.</i>' : ''}`,
    [[{ text: '🔄 Вернуть расписание', callback_data: 'nowauto' }]],
  );
}

async function saveDefault(env: Env, chat: number, text: string) {
  const p = parsePair(text);
  if (!p) return send(env, chat, 'Пусто или слишком длинно. Напиши: <i>Русский | English</i>');
  const s = await getSettings(env);
  s.now = { ru: p[0], en: p[1] ?? p[0] };
  await saveSettings(env, s);
  await clearState(env, chat);
  return send(env, chat, `Статус по умолчанию обновило ✅\n<b>${esc(s.now.ru)}</b> <i>/ ${esc(s.now.en)}</i>`);
}

async function confirmAdd(env: Env, chat: number, draft: EventDraft, msg?: Message) {
  await setState(env, chat, { flow: 'add', step: 'confirm', draft });
  const text = `<b>Проверь</b> 👇\n\n${eventCard(draft)}`;
  const kb: Keyboard = [[{ text: '✅ Сохранить', callback_data: 'wsave' }, CANCEL_BTN]];
  return msg ? edit(env, msg, text, kb) : send(env, chat, text, kb);
}

async function onCallback(env: Env, cb: CallbackQuery) {
  const msg = cb.message;
  const data = cb.data ?? '';
  if (!msg) return answer(env, cb);
  const chat = msg.chat.id;
  const [kind, a, b] = data.split(':');

  switch (kind) {
    case 'x':
      await clearState(env, chat);
      await answer(env, cb, 'Отменило');
      return edit(env, msg, '<i>Отменено</i>');

    case 'nowauto': {
      const s = await getSettings(env);
      s.manual = null;
      await saveSettings(env, s);
      await answer(env, cb, 'Вернуло расписание');
      const [t, kb] = await nowScreen(env);
      return edit(env, msg, t, kb);
    }

    case 'mt': {
      const s = await getSettings(env);
      s.maintenance = a === 'on';
      await saveSettings(env, s);
      await answer(env, cb, s.maintenance ? 'Сайт закрыт' : 'Сайт открыт');
      return edit(env, msg, maintText(s.maintenance), maintKb(s.maintenance));
    }

    case 'pg': {
      const s = await getSettings(env);
      const key = a as PageKey;
      if (!(key in s.pages)) return answer(env, cb);
      s.pages[key] = s.pages[key] === 'wip' ? 'live' : 'wip';
      await saveSettings(env, s);
      await answer(env, cb, `${PAGE_NAMES[key]}: ${s.pages[key] === 'wip' ? 'в работе' : 'готова'}`);
      return edit(env, msg, PAGES_TEXT, pagesKb(s));
    }

    case 'el': {
      await answer(env, cb);
      const [t, kb] = await eventsList(env);
      return edit(env, msg, t, kb);
    }

    case 'ea':
      await answer(env, cb);
      await setState(env, chat, { flow: 'add', step: 'title', draft: {} });
      return send(env, chat, `<b>Новый ивент</b> 1/${STEPS}\n\n${ASK.title}`, [[CANCEL_BTN]]);

    case 'ev': {
      await answer(env, cb);
      const e = await getEvent(env.DB, a);
      return e ? edit(env, msg, eventCard(e), eventKb(e.id)) : edit(env, msg, 'Ивент не найден, /events');
    }

    case 'es': {
      await updateEvent(env.DB, a, { status: b as Status });
      const e = await getEvent(env.DB, a);
      await answer(env, cb, statusLabel(b));
      return e && edit(env, msg, eventCard(e), eventKb(e.id));
    }

    case 'ef': {
      await answer(env, cb);
      await setState(env, chat, { flow: 'edit', id: a, field: b as Field });
      return send(env, chat, ASK[b as Field], [[CANCEL_BTN]]);
    }

    case 'ed': {
      const e = await getEvent(env.DB, a);
      if (!e) return answer(env, cb, 'Уже удалён');
      const photos = await env.DB.prepare(`SELECT count(*) AS n FROM media WHERE event_id = ? AND status != 'deleted'`).bind(a).first<number>('n');
      await answer(env, cb);
      return edit(env, msg, `Удалить <b>${esc(e.title_ru)}</b>?${photos ? `\n\nУ него ${photos} фото - они останутся, просто без ивента.` : ''}`, [
        [{ text: '🗑 Да, удалить', callback_data: `edok:${a}` }, { text: 'Нет', callback_data: `ev:${a}` }],
      ]);
    }

    case 'edok':
      await deleteEvent(env.DB, a);
      await answer(env, cb, 'Удалено');
      return edit(env, msg, '🗑 Ивент удалён. /events');

    case 'ws': {
      const st = await getState(env, chat);
      if (st?.flow !== 'add') return answer(env, cb, 'Это уже неактуально');
      await answer(env, cb);
      const draft = { ...st.draft, status: a as Status };
      await setState(env, chat, { flow: 'add', step: 'url', draft });
      return edit(env, msg, `<b>Новый ивент</b> 7/${STEPS}\n\nСтатус: ${statusLabel(a)}\n\n${ASK.url}`, [[{ text: 'Без ссылки →', callback_data: 'wnourl' }, CANCEL_BTN]]);
    }

    case 'wk': {
      const st = await getState(env, chat);
      if (st?.flow !== 'add') return answer(env, cb, 'Это уже неактуально');
      await answer(env, cb);
      await setState(env, chat, { flow: 'add', step: 'venue', draft: { ...st.draft, kind: a as Kind } });
      return edit(env, msg, `<b>Новый ивент</b> 5/${STEPS}\n\nТип: ${kindLabel(a)}\n\n${ASK.venue}`, [[{ text: 'Без места →', callback_data: 'wnovenue' }, CANCEL_BTN]]);
    }

    case 'wnovenue': {
      const st = await getState(env, chat);
      if (st?.flow !== 'add') return answer(env, cb, 'Это уже неактуально');
      await answer(env, cb);
      await setState(env, chat, { flow: 'add', step: 'status', draft: { ...st.draft, venue_ru: null, venue_en: null } });
      return edit(env, msg, `<b>Новый ивент</b> 6/${STEPS}\n\nКак иду?`, [...statusRows('ws:'), [CANCEL_BTN]]);
    }

    case 'ek':
      await answer(env, cb);
      return api(env, 'editMessageReplyMarkup', {
        chat_id: chat, message_id: msg.message_id,
        reply_markup: { inline_keyboard: [...kindRow(`ekk:${a}:`), [{ text: '← Назад', callback_data: `ev:${a}` }]] },
      });

    case 'ekk': {
      await updateEvent(env.DB, a, { kind: b as Kind });
      const e = await getEvent(env.DB, a);
      await answer(env, cb, kindLabel(b));
      return e && edit(env, msg, eventCard(e), eventKb(e.id));
    }

    case 'hh': {
      const row = await env.DB.prepare(`SELECT r2_key FROM media WHERE id = ? AND status = 'published'`).bind(a).first<{ r2_key: string | null }>();
      if (!row?.r2_key) return answer(env, cb, 'Сначала прими фото');
      await answer(env, cb, 'Ставлю в «Привет»');
      return setHero(env, chat, row.r2_key.split('/').pop()!);
    }

    case 'hhx':
      await answer(env, cb);
      return setHero(env, chat, null);

    case 'hm': {
      const sets = await getSettings(env);
      await answer(env, cb);
      return api(env, 'editMessageReplyMarkup', {
        chat_id: chat, message_id: msg.message_id,
        reply_markup: { inline_keyboard: [
          sets.home.map((x, i) => ({ text: `${SLOT[i]} ${x ? (x.ru || 'фото').slice(0, 14) : 'пусто'}`, callback_data: `hms:${a}:${i}` })),
          [{ text: '← Назад', callback_data: `ivb:${a}` }],
        ] },
      });
    }

    case 'hms': {
      const row = await env.DB.prepare(`SELECT caption_ru, caption_en FROM media WHERE id = ?`).bind(a).first<{ caption_ru: string | null; caption_en: string | null }>();
      await answer(env, cb);
      await setState(env, chat, { flow: 'homeLabel', id: a, slot: +b });
      const hint = row?.caption_ru ? `\nПодпись фото: <code>${esc(row.caption_ru)}${row.caption_en ? ` | ${esc(row.caption_en)}` : ''}</code>` : '';
      return send(env, chat, `Подпись на плитке ${+b + 1}: <i>Русский | English</i>\nНапример: <code>На байке | On the bike</code>${hint}`, [
        [{ text: 'Без подписи', callback_data: `hml:${a}:${b}` }, CANCEL_BTN],
      ]);
    }

    case 'hml':
      await answer(env, cb);
      return saveHomeSlot(env, chat, a, +b, '', '');

    case 'hc': {
      const sets = await getSettings(env);
      sets.home[+a] = null;
      await saveSettings(env, sets);
      await answer(env, cb, 'Освобождено');
      const [t, kb] = await homeScreen(env);
      return edit(env, msg, t, kb);
    }

    case 'wnourl': {
      const st = await getState(env, chat);
      if (st?.flow !== 'add') return answer(env, cb, 'Это уже неактуально');
      await answer(env, cb);
      return confirmAdd(env, chat, { ...st.draft, url: null }, msg);
    }

    case 'wsave': {
      const st = await getState(env, chat);
      if (st?.flow !== 'add' || st.step !== 'confirm') return answer(env, cb, 'Это уже неактуально');
      const id = await insertEvent(env.DB, st.draft);
      await clearState(env, chat);
      await answer(env, cb, 'Сохранено');
      const e = await getEvent(env.DB, id);
      return edit(env, msg, `Добавило ✅ На сайте появится в течение минуты.\n\n${eventCard(e!)}`, eventKb(id));
    }

    default:
      if (await mediaCallback(env, cb, kind, a, b)) return;
      return answer(env, cb);
  }
}
