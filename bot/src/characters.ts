// Персонажи и образы (фурсьюты): просмотр и правка всех полей из Telegram.
//   /characters - список персонажей и их образов
//   нажал на персонажа или образ -> карточка с кнопками полей -> нажал поле -> прислал текст или картинку
// Форматы полей и их подсказки - src/lib/characters-core.ts (общие с сайтом).
import type { Env } from './env';
import { send, edit, answer, esc, downloadFile, type Message, type CallbackQuery, type Keyboard } from './tg';
import { sniff, shortId } from '../../src/lib/media-core';
import {
  CHARACTER_FIELDS, LOOK_FIELDS, LOOK_KINDS, hintFor, columnsOf, splitLong, parseList, parsePalette, parsePills,
  parseNotes, parseTimeline, slugify, type Field, type CharacterRow, type LookRow, type LookKind,
} from '../../src/lib/characters-core';

/** Состояние диалога (та же таблица bot_state, что и у остального бота) */
export type CharState =
  | { flow: 'char'; t: 'c' | 'l'; id: string; f: number }
  | { flow: 'charNew' };

const setState = (env: Env, chat: number, s: CharState) =>
  env.DB.prepare(
    `INSERT INTO bot_state (chat_id, state) VALUES (?, ?)
     ON CONFLICT (chat_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
  ).bind(chat, JSON.stringify(s)).run();
const clearState = (env: Env, chat: number) => env.DB.prepare(`DELETE FROM bot_state WHERE chat_id = ?`).bind(chat).run();

const CANCEL: Keyboard = [[{ text: 'Отмена', callback_data: 'x' }]];
const fieldsOf = (t: 'c' | 'l') => (t === 'c' ? CHARACTER_FIELDS : LOOK_FIELDS);
const table = (t: 'c' | 'l') => (t === 'c' ? 'characters' : 'looks');

const getChar = (env: Env, id: string) => env.DB.prepare(`SELECT * FROM characters WHERE id = ?`).bind(id).first<CharacterRow>();
const getLook = (env: Env, id: string) => env.DB.prepare(`SELECT * FROM looks WHERE id = ?`).bind(id).first<LookRow>();
const row = (env: Env, t: 'c' | 'l', id: string) => (t === 'c' ? getChar(env, id) : getLook(env, id)) as Promise<Record<string, unknown> | null>;

// ---------- экраны ----------

async function listScreen(env: Env): Promise<[string, Keyboard]> {
  const [chars, looks] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM characters ORDER BY position, name_ru`),
    env.DB.prepare(`SELECT * FROM looks ORDER BY position, name_ru`),
  ]);
  const kb: Keyboard = [];
  for (const c of chars.results as CharacterRow[]) {
    kb.push([{ text: `${c.theme === 'redpanda' ? '🦊' : '🍉'} ${c.name_ru}${c.visible ? '' : ' (скрыт)'}`, callback_data: `ch:c:${c.id}` }]);
    const mine = (looks.results as LookRow[]).filter((l) => l.character_id === c.id);
    const row: Keyboard[number] = mine.map((l) => ({ text: `   ${l.name_ru}${l.visible ? '' : ' 🙈'}`, callback_data: `ch:l:${l.id}` }));
    for (let i = 0; i < row.length; i += 2) kb.push(row.slice(i, i + 2));
  }
  kb.push([{ text: '➕ Новый персонаж', callback_data: 'ch:nc' }]);
  return [`<b>Персонажи и образы</b>\nНажми, чтобы посмотреть и поменять. На сайте обновится в течение минуты.\n\n${chars.results.length ? '' : 'Пока пусто.'}`, kb];
}

const filled = (r: Record<string, unknown>, f: Field) => columnsOf(f).some((c) => r[c] != null && String(r[c]).trim() !== '');

function fieldButtons(t: 'c' | 'l', id: string, r: Record<string, unknown>): Keyboard {
  const fs = fieldsOf(t);
  const kb: Keyboard = [];
  for (let i = 0; i < fs.length; i += 2) {
    kb.push(fs.slice(i, i + 2).map((f, j) => ({ text: `${filled(r, f) ? '✅' : '▫️'} ${f.label}`, callback_data: `ch:f:${t}:${id}:${i + j}` })));
  }
  return kb;
}

async function charCard(env: Env, id: string): Promise<[string, Keyboard] | null> {
  const c = await getChar(env, id);
  if (!c) return null;
  const { results: looks } = await env.DB.prepare(`SELECT id, name_ru, visible FROM looks WHERE character_id = ? ORDER BY position`).bind(id).all<LookRow>();
  const text = [
    `<b>${esc(c.name_ru)}</b>${c.name_en ? ` / ${esc(c.name_en)}` : ''}${c.visible ? '' : ' <i>(скрыт)</i>'}`,
    c.label_ru ? `${esc(c.label_ru)}${c.tagline_ru ? ` · ${esc(c.tagline_ru)}` : ''}` : null,
    `Страница: ${'murkas.net'}/characters/${c.id}`,
    '',
    `Образы: ${looks.length ? looks.map((l) => esc(l.name_ru)).join(', ') : 'нет'}`,
    '',
    '✅ заполнено, ▫️ пусто (на сайте не показывается). Нажми поле, чтобы поменять.',
  ].filter((x): x is string => typeof x === 'string').join('\n');
  const kb = fieldButtons('c', id, c as unknown as Record<string, unknown>);
  kb.push(...looks.map((l) => [{ text: `👗 ${l.name_ru}${l.visible ? '' : ' 🙈'}`, callback_data: `ch:l:${l.id}` }]));
  kb.push([{ text: '➕ Новый образ', callback_data: `ch:n:${id}` }]);
  kb.push([
    { text: c.theme === 'redpanda' ? '🎨 Цвет: красная панда' : '🎨 Цвет: арбуз', callback_data: `ch:th:${id}` },
    { text: c.visible ? '🙈 Скрыть' : '👁 Показать', callback_data: `ch:v:c:${id}` },
  ]);
  kb.push([{ text: '◀ Все персонажи', callback_data: 'ch:L' }]);
  return [text, kb];
}

async function lookCard(env: Env, id: string): Promise<[string, Keyboard] | null> {
  const l = await getLook(env, id);
  if (!l) return null;
  const c = await getChar(env, l.character_id);
  const kind = LOOK_KINDS.find((k) => k.key === l.kind)?.ru ?? l.kind;
  const text = [
    `<b>${esc(c?.name_ru ?? '?')} · ${esc(l.name_ru)}</b>${l.visible ? '' : ' <i>(скрыт)</i>'}`,
    `Тип: ${kind}`,
    `Страница: murkas.net/fursuits/${l.id}`,
    '',
    '✅ заполнено, ▫️ пусто (на сайте не показывается). Нажми поле, чтобы поменять.',
    '<i>Фото без своей картинки берутся из галереи: фото этого персонажа с категорией «фулл» / «партиал».</i>',
  ].join('\n');
  const kb = fieldButtons('l', id, l as unknown as Record<string, unknown>);
  kb.push([
    { text: `🔁 Тип: ${kind}`, callback_data: `ch:k:${id}` },
    { text: l.visible ? '🙈 Скрыть' : '👁 Показать', callback_data: `ch:v:l:${id}` },
  ]);
  kb.push([{ text: '🗑 Удалить образ', callback_data: `ch:d:${id}` }]);
  kb.push([{ text: `◀ ${c?.name_ru ?? 'Назад'}`, callback_data: `ch:c:${l.character_id}` }, { text: '◀◀ Все', callback_data: 'ch:L' }]);
  return [text, kb];
}

/** Текущее значение поля - чтобы можно было скопировать, поправить и прислать обратно */
function currentValue(r: Record<string, unknown>, f: Field): string {
  const v = (c: string) => (r[c] == null ? '' : String(r[c]));
  if (f.type === 'file') return v(f.key) ? 'Сейчас: стоит картинка' : 'Сейчас: нет';
  let text = '';
  if (f.type === 'pair') text = [v(`${f.key}_ru`), v(`${f.key}_en`)].filter(Boolean).join(' | ');
  else if (f.type === 'long') text = v(`${f.key}_en`) ? `${v(`${f.key}_ru`)}\n---\n${v(`${f.key}_en`)}` : v(`${f.key}_ru`);
  else text = v(f.key);
  if (!text) return 'Сейчас: пусто';
  const cut = text.length > 3000 ? `${text.slice(0, 3000)}…` : text;
  return `Сейчас (нажми, чтобы скопировать):\n<pre>${esc(cut)}</pre>`;
}

// ---------- сохранение ----------

/** Разбор присланного текста под поле. Ошибка - строкой. */
function parseValue(f: Field, text: string): Record<string, string | null> | string {
  const clean = text.trim();
  if (f.type === 'pair') {
    const [ru, en] = clean.split('|').map((s) => s.trim());
    if (!ru) return 'Пусто';
    if (ru.length > 300 || (en && en.length > 300)) return 'Слишком длинно (до 300 символов)';
    return { [`${f.key}_ru`]: ru, [`${f.key}_en`]: en && en !== ru ? en : null };
  }
  if (f.type === 'long') {
    const [ru, en] = splitLong(clean);
    if (!ru) return 'Пусто';
    return { [`${f.key}_ru`]: ru, [`${f.key}_en`]: en };
  }
  if (f.type === 'link') {
    const [name, url] = clean.split('|').map((s) => s.trim());
    if (!name) return 'Пусто';
    if (url && !/^https:\/\//.test(url)) return 'Ссылка должна начинаться с https://';
    return { [f.key]: url ? `${name} | ${url}` : name };
  }
  // списки: проверяем, что каждая строка разбирается
  const lines = clean.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return 'Пусто';
  const ok =
    f.type === 'palette' ? parsePalette(clean).length === lines.length :
    f.type === 'pills' ? parsePills(clean).length === lines.length :
    f.type === 'notes' ? parseNotes(clean).length === lines.length :
    f.type === 'timeline' ? parseTimeline(clean).length === lines.length :
    parseList(clean).length === lines.length;
  if (!ok) return 'Какая-то строка не по формату';
  return { [f.key]: lines.join('\n') };
}

async function save(env: Env, t: 'c' | 'l', id: string, f: Field, values: Record<string, string | null>) {
  const allowed = new Set(columnsOf(f));
  const keys = Object.keys(values).filter((k) => allowed.has(k));
  if (!keys.length) return;
  await env.DB.prepare(`UPDATE ${table(t)} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...keys.map((k) => values[k]), id)
    .run();
}

async function showCard(env: Env, chat: number, t: 'c' | 'l', id: string, prefix = '', msg?: Message) {
  const card = t === 'c' ? await charCard(env, id) : await lookCard(env, id);
  if (!card) return send(env, chat, 'Не нашло, /characters');
  const [text, kb] = card;
  return msg ? edit(env, msg, prefix + text, kb) : send(env, chat, prefix + text, kb);
}

// ---------- входы из bot.ts ----------

export async function charactersCommand(env: Env, chat: number) {
  const [text, kb] = await listScreen(env);
  return send(env, chat, text, kb);
}

/** Пришёл текст, а мы ждём значение поля или имя нового персонажа */
export async function charText(env: Env, chat: number, st: CharState, text: string) {
  if (st.flow === 'charNew') {
    const [ru, en] = text.split('|').map((s) => s.trim());
    const id = slugify(en || ru);
    if (!ru || !id) return send(env, chat, 'Нужно имя латиницей для адреса страницы. Напиши: <i>Имя | Name</i>', CANCEL);
    if (await getChar(env, id)) return send(env, chat, `Персонаж с адресом <code>${id}</code> уже есть. Попробуй другое имя.`, CANCEL);
    const pos = (await env.DB.prepare(`SELECT coalesce(max(position), -1) + 1 AS p FROM characters`).first<number>('p')) ?? 0;
    await env.DB.prepare(`INSERT INTO characters (id, position, name_ru, name_en) VALUES (?, ?, ?, ?)`).bind(id, pos, ru, en && en !== ru ? en : null).run();
    await clearState(env, chat);
    return showCard(env, chat, 'c', id, 'Создало ✅\n\n');
  }
  const f = fieldsOf(st.t)[st.f];
  if (!f) return clearState(env, chat);
  if (f.type === 'file') return send(env, chat, 'Жду картинку: пришли фото или файл. /cancel - отменить');
  const parsed = parseValue(f, text);
  if (typeof parsed === 'string') return send(env, chat, `${parsed}. Попробуй ещё раз.\n\n${hintFor(f)}`, CANCEL);
  await save(env, st.t, st.id, f, parsed);
  await clearState(env, chat);
  return showCard(env, chat, st.t, st.id, `${esc(f.label)}: сохранило ✅\n\n`);
}

/** Пришла картинка для поля-файла */
export async function charFile(env: Env, msg: Message, st: CharState) {
  const chat = msg.chat.id;
  if (st.flow !== 'char') return send(env, chat, 'Сейчас жду текст. /cancel - отменить');
  const f = fieldsOf(st.t)[st.f];
  if (!f || f.type !== 'file') return send(env, chat, 'Тут нужен текст, а не картинка. /cancel - отменить');
  const file = msg.document ?? msg.photo?.[msg.photo.length - 1];
  if (!file) return;
  if ((file.file_size ?? 0) > 20 * 1024 * 1024) return send(env, chat, 'Больше 20 МБ - Telegram не даёт ботам такие скачивать. Пришли поменьше.');
  const bytes = await downloadFile(env, file.file_id);
  const type = bytes && sniff(bytes);
  if (!bytes || !type) return send(env, chat, 'Не получилось прочитать картинку. Нужен JPG, PNG, WebP или GIF.');
  const name = `${shortId(10)}.${type.ext}`;
  await env.MEDIA.put(`media/${name}`, bytes, { httpMetadata: { contentType: type.mime } });
  await save(env, st.t, st.id, f, { [f.key]: name });
  await clearState(env, chat);
  return showCard(env, chat, st.t, st.id, `${esc(f.label)}: поставило ✅\n\n`);
}

/** Кнопки с префиксом ch: */
export async function charCallback(env: Env, cb: CallbackQuery) {
  const msg = cb.message!;
  const chat = msg.chat.id;
  const [, op, a, b, c] = (cb.data ?? '').split(':');

  switch (op) {
    case 'L': {
      await answer(env, cb);
      const [text, kb] = await listScreen(env);
      return edit(env, msg, text, kb);
    }
    case 'c':
      await answer(env, cb);
      return showCard(env, chat, 'c', a, '', msg);
    case 'l':
      await answer(env, cb);
      return showCard(env, chat, 'l', a, '', msg);

    case 'f': {
      // ch:f:<c|l>:<id>:<номер поля>
      const t = a as 'c' | 'l';
      const f = fieldsOf(t)[Number(c)];
      const r = await row(env, t, b);
      if (!f || !r) return answer(env, cb, 'Не нашло');
      await answer(env, cb);
      await setState(env, chat, { flow: 'char', t, id: b, f: Number(c) });
      const kb: Keyboard = filled(r, f) ? [[{ text: '🗑 Очистить', callback_data: `ch:e:${t}:${b}:${c}` }], ...CANCEL] : CANCEL;
      return send(env, chat, `<b>${esc(f.label)}</b>\n${hintFor(f)}\n\n${currentValue(r, f)}`, kb);
    }
    case 'e': {
      // очистить поле
      const t = a as 'c' | 'l';
      const f = fieldsOf(t)[Number(c)];
      if (!f) return answer(env, cb);
      if (t === 'c' && f.key === 'name') return answer(env, cb, 'Имя нельзя очистить');
      if (t === 'l' && f.key === 'name') return answer(env, cb, 'Название нельзя очистить');
      await save(env, t, b, f, Object.fromEntries(columnsOf(f).map((k) => [k, null])));
      await clearState(env, chat);
      await answer(env, cb, 'Очистило');
      return showCard(env, chat, t, b, `${esc(f.label)}: очистило ✅\n\n`, msg);
    }
    case 'v': {
      const t = a as 'c' | 'l';
      await env.DB.prepare(`UPDATE ${table(t)} SET visible = 1 - visible, updated_at = datetime('now') WHERE id = ?`).bind(b).run();
      await answer(env, cb, 'Готово');
      return showCard(env, chat, t, b, '', msg);
    }
    case 'th': {
      await env.DB.prepare(`UPDATE characters SET theme = CASE theme WHEN 'watermelon' THEN 'redpanda' ELSE 'watermelon' END, updated_at = datetime('now') WHERE id = ?`).bind(a).run();
      await answer(env, cb, 'Цвет карточки поменяло');
      return showCard(env, chat, 'c', a, '', msg);
    }
    case 'k': {
      // сменить тип образа по кругу
      const l = await getLook(env, a);
      if (!l) return answer(env, cb);
      const i = LOOK_KINDS.findIndex((k) => k.key === l.kind);
      const next = LOOK_KINDS[(i + 1) % LOOK_KINDS.length];
      await env.DB.prepare(`UPDATE looks SET kind = ?, updated_at = datetime('now') WHERE id = ?`).bind(next.key, a).run();
      await answer(env, cb, next.ru);
      return showCard(env, chat, 'l', a, '', msg);
    }
    case 'n': {
      // новый образ: выбрать тип
      await answer(env, cb);
      return edit(env, msg, 'Какой образ добавить?', [
        LOOK_KINDS.map((k) => ({ text: k.ru, callback_data: `ch:nk:${a}:${k.key}` })),
        [{ text: '◀ Назад', callback_data: `ch:c:${a}` }],
      ]);
    }
    case 'nk': {
      const char = await getChar(env, a);
      const kind = LOOK_KINDS.find((k) => k.key === (b as LookKind));
      if (!char || !kind) return answer(env, cb);
      let id = `${char.id}-${kind.key}`;
      for (let i = 2; await getLook(env, id); i++) id = `${char.id}-${kind.key}-${i}`;
      const pos = (await env.DB.prepare(`SELECT coalesce(max(position), -1) + 1 AS p FROM looks WHERE character_id = ?`).bind(a).first<number>('p')) ?? 0;
      await env.DB.prepare(`INSERT INTO looks (id, character_id, position, kind, name_ru, name_en) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(id, a, pos, kind.key, kind.ru, kind.en).run();
      await answer(env, cb, 'Создало');
      return showCard(env, chat, 'l', id, 'Новый образ ✅ Заполни поля - пустые на сайте не видны.\n\n', msg);
    }
    case 'd': {
      const l = await getLook(env, a);
      if (!l) return answer(env, cb, 'Уже удалён');
      await answer(env, cb);
      return edit(env, msg, `Удалить образ <b>${esc(l.name_ru)}</b>? Его тексты пропадут, фото в галерее останутся.`, [
        [{ text: '🗑 Да, удалить', callback_data: `ch:dd:${a}` }, { text: 'Нет', callback_data: `ch:l:${a}` }],
      ]);
    }
    case 'dd': {
      const l = await getLook(env, a);
      if (!l) return answer(env, cb, 'Уже удалён');
      await env.DB.prepare(`DELETE FROM looks WHERE id = ?`).bind(a).run();
      await answer(env, cb, 'Удалило');
      return showCard(env, chat, 'c', l.character_id, `Образ «${esc(l.name_ru)}» удалён.\n\n`, msg);
    }
    case 'nc': {
      await answer(env, cb);
      await setState(env, chat, { flow: 'charNew' });
      return send(env, chat, '<b>Новый персонаж</b>\nНапиши имя: <i>Имя | Name</i>\nАнглийское имя станет адресом страницы.', CANCEL);
    }
    default:
      return answer(env, cb);
  }
}
