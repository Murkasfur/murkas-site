// Важные даты на таймлайне ивентов (ДР, праздники): /dates или кнопка «⭐ Важные даты» в /events.
// Повторяются каждый год, на сайте - чип в своём месяце. Число можно не указывать - тогда только месяц.
import type { Env } from './env';
import { send, edit, answer, esc, type CallbackQuery, type Keyboard } from './tg';
import { parsePair } from './events';
import { DATE_ICONS, DATE_ICON_EMOJI, isDateIcon, parseDayMonth, dayMonthRu, type SpecialDateRow } from '../../src/lib/special-dates';
import { shortId } from '../../src/lib/media-core';

export type DateState =
  | { flow: 'sd'; id: string; f: 'name' | 'date' }
  | { flow: 'sdNew'; step: 'name' | 'date'; name_ru?: string; name_en?: string | null };

const setState = (env: Env, chat: number, s: DateState) =>
  env.DB.prepare(
    `INSERT INTO bot_state (chat_id, state) VALUES (?, ?)
     ON CONFLICT (chat_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
  ).bind(chat, JSON.stringify(s)).run();
const clearState = (env: Env, chat: number) => env.DB.prepare(`DELETE FROM bot_state WHERE chat_id = ?`).bind(chat).run();

const CANCEL: Keyboard = [[{ text: 'Отмена', callback_data: 'x' }]];
const ASK_NAME = 'Как называется? Можно сразу по-английски через черту:\n<i>День рождения | Birthday</i>';
const ASK_DATE = 'Когда? Например <i>14.03</i> или <i>14 марта</i>.\nЕсли число пока не знаешь - просто месяц: <i>март</i>';
const emoji = (icon: string) => (isDateIcon(icon) ? DATE_ICON_EMOJI[icon] : '🎉');
const get = (env: Env, id: string) => env.DB.prepare(`SELECT * FROM special_dates WHERE id = ?`).bind(id).first<SpecialDateRow>();

async function listScreen(env: Env): Promise<[string, Keyboard]> {
  const { results } = await env.DB.prepare(`SELECT * FROM special_dates ORDER BY month, COALESCE(day, 0), name_ru`).all<SpecialDateRow>();
  const kb: Keyboard = results.map((r) => [{ text: `${emoji(r.icon)} ${r.name_ru} - ${dayMonthRu(r)}`.slice(0, 60), callback_data: `sd:o:${r.id}` }]);
  kb.push([{ text: '➕ Добавить дату', callback_data: 'sd:n' }]);
  kb.push([{ text: '← Ивенты', callback_data: 'el' }]);
  return [
    `<b>Важные даты</b>\nДни рождения и праздники. Повторяются каждый год, на сайте - небольшой чип в своём месяце среди ивентов (не карточка).\n\n${results.length ? 'Нажми, чтобы изменить:' : 'Пока пусто.'}`,
    kb,
  ];
}

function card(r: SpecialDateRow): [string, Keyboard] {
  const text = [
    `${emoji(r.icon)} <b>${esc(r.name_ru)}</b>${r.name_en ? ` / ${esc(r.name_en)}` : ''}`,
    `Когда: ${dayMonthRu(r)}`,
    r.day == null ? '\nПока число не указано, на сайте показывается только месяц.' : null,
  ].filter((x): x is string => typeof x === 'string').join('\n');
  return [
    text,
    [
      [{ text: '✏️ Название', callback_data: `sd:f:${r.id}:name` }, { text: '📅 Дата', callback_data: `sd:f:${r.id}:date` }],
      [{ text: `${emoji(r.icon)} Иконка`, callback_data: `sd:i:${r.id}` }, { text: '🗑 Удалить', callback_data: `sd:d:${r.id}` }],
      [{ text: '← Все даты', callback_data: 'sd:l' }],
    ],
  ];
}

function iconKb(id: string): Keyboard {
  const btns = DATE_ICONS.map((ic) => ({ text: DATE_ICON_EMOJI[ic], callback_data: `sd:ic:${id}:${ic}` }));
  return [btns, [{ text: '← Назад', callback_data: `sd:o:${id}` }]];
}

export async function datesCommand(env: Env, chat: number) {
  const [t, kb] = await listScreen(env);
  return send(env, chat, t, kb);
}

export async function datesText(env: Env, chat: number, st: DateState, text: string) {
  const wantName = st.flow === 'sd' ? st.f === 'name' : st.step === 'name';
  if (wantName) {
    const p = parsePair(text);
    if (!p) return send(env, chat, `Пусто или слишком длинно (до 120 символов). ${ASK_NAME}`, CANCEL);
    if (st.flow === 'sd') {
      await env.DB.prepare(`UPDATE special_dates SET name_ru = ?, name_en = ? WHERE id = ?`).bind(p[0], p[1], st.id).run();
    } else {
      await setState(env, chat, { flow: 'sdNew', step: 'date', name_ru: p[0], name_en: p[1] });
      return send(env, chat, `<b>Новая дата</b> 2/3\n\n${ASK_DATE}`, CANCEL);
    }
  } else {
    const d = parseDayMonth(text);
    if (!d) return send(env, chat, `Не поняло дату. ${ASK_DATE}`, CANCEL);
    if (st.flow === 'sd') {
      await env.DB.prepare(`UPDATE special_dates SET month = ?, day = ? WHERE id = ?`).bind(d.month, d.day, st.id).run();
    } else {
      const id = shortId(8);
      await env.DB.prepare(`INSERT INTO special_dates (id, name_ru, name_en, month, day) VALUES (?, ?, ?, ?, ?)`)
        .bind(id, st.name_ru!, st.name_en ?? null, d.month, d.day).run();
      await clearState(env, chat);
      return send(env, chat, '<b>Новая дата</b> 3/3\n\nКакую иконку поставить?', iconKb(id));
    }
  }
  await clearState(env, chat);
  const r = await get(env, st.id);
  if (!r) return send(env, chat, 'Дата пропала 🤔 /dates');
  const [t, kb] = card(r);
  return send(env, chat, `Сохранило ✅ На сайте обновится в течение минуты.\n\n${t}`, kb);
}

export async function datesCallback(env: Env, cb: CallbackQuery) {
  const msg = cb.message!;
  const chat = msg.chat.id;
  const [, op, id, arg] = (cb.data ?? '').split(':');

  if (op === 'l') {
    await answer(env, cb);
    const [t, kb] = await listScreen(env);
    return edit(env, msg, t, kb);
  }
  if (op === 'n') {
    await answer(env, cb);
    await setState(env, chat, { flow: 'sdNew', step: 'name' });
    return send(env, chat, `<b>Новая дата</b> 1/3\n\n${ASK_NAME}`, CANCEL);
  }

  const r = await get(env, id);
  if (!r) {
    await answer(env, cb, 'Такой даты уже нет');
    const [t, kb] = await listScreen(env);
    return edit(env, msg, t, kb);
  }
  switch (op) {
    case 'o': {
      await answer(env, cb);
      const [t, kb] = card(r);
      return edit(env, msg, t, kb);
    }
    case 'f': {
      await answer(env, cb);
      const f = arg === 'date' ? 'date' : 'name';
      await setState(env, chat, { flow: 'sd', id, f });
      const now = f === 'name' ? `Сейчас: ${esc(r.name_ru)}${r.name_en ? ` | ${esc(r.name_en)}` : ''}` : `Сейчас: ${dayMonthRu(r)}`;
      return send(env, chat, `${now}\n\n${f === 'name' ? ASK_NAME : ASK_DATE}`, CANCEL);
    }
    case 'i':
      await answer(env, cb);
      return edit(env, msg, `Иконка для «${esc(r.name_ru)}»:`, iconKb(id));
    case 'ic': {
      if (!isDateIcon(arg)) return answer(env, cb);
      await env.DB.prepare(`UPDATE special_dates SET icon = ? WHERE id = ?`).bind(arg, id).run();
      await answer(env, cb, 'Готово');
      const [t, kb] = card({ ...r, icon: arg });
      return edit(env, msg, `Сохранило ✅\n\n${t}`, kb);
    }
    case 'd':
      await answer(env, cb);
      return edit(env, msg, `Удалить «${esc(r.name_ru)}» (${dayMonthRu(r)})?`, [
        [{ text: '🗑 Да, удалить', callback_data: `sd:dd:${id}` }, { text: 'Нет', callback_data: `sd:o:${id}` }],
      ]);
    case 'dd': {
      await env.DB.prepare(`DELETE FROM special_dates WHERE id = ?`).bind(id).run();
      await answer(env, cb, 'Удалило');
      const [t, kb] = await listScreen(env);
      return edit(env, msg, t, kb);
    }
  }
  return answer(env, cb);
}
