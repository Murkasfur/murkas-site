// Модерация загрузок: заявки от посетителей сайта, кнопки, отклонённые.
//
// Файлы в R2:  pending/ (ждут проверки) -> media/ (на сайте) или rejected/ (отклонены, хранятся до ручной чистки)
// Пачка приходит альбомом (до 10 превью) + сообщение с кнопками. «По одному» - отдельное
// сообщение-просмотрщик со стрелками, в нём решается каждый файл.
import type { Env } from './env';
import { api, apiForm, send, edit, answer, esc, type Keyboard, type CallbackQuery, type Message } from './tg';
import { LIMITS, CHARACTERS, PHOTO_CATEGORIES, ART_TYPES, REJECT_REASONS, storageUsed } from '../../src/lib/media-core';

type Row = {
  id: string; kind: 'photo' | 'art'; status: string; caption_ru: string | null; character: string | null; category: string | null;
  event_id: string | null; person_name: string | null; person_url: string | null; created_date: string | null; original_url: string | null;
  pinned: number; bytes: number; mime: string; r2_key: string | null; blur_requested: number; reject_reason: string | null;
  batch_id: string | null; position: number; width: number | null; height: number | null;
};
type Batch = { id: string; kind: 'photo' | 'art'; status: string; tg_chat_id: number | null; tg_message_id: number | null };

const CHAR_RU: Record<string, string> = { arbyss: 'Arbyss', murkas: 'Муркас', both: 'Оба' };
const CAT_RU: Record<string, string> = { group: 'Общее фото', full: 'Фулл', partial: 'Партиал', walks: 'Прогулки', backstage: 'Бэкстейдж', parties: 'Вечеринки' };
const ART_RU: Record<string, string> = { full: 'Полноцвет', sketch: 'Скетч', ref: 'Рефшит', stickers: 'Стикеры', comic: 'Комикс', ych: 'YCH' };
const REASON_RU: Record<string, string> = { off_topic: 'Не по теме', quality: 'Плохое качество', duplicate: 'Дубль', not_theirs: 'Чужое / без разрешения', other: 'Другое' };
const STATUS_RU: Record<string, string> = { pending: '⏳ ждёт', published: '✅ на сайте', rejected: '❌ отклонено', deleted: '🗑 удалено', uploading: '… грузится' };
const catName = (r: { kind: string; category: string | null }) => (r.category ? ((r.kind === 'art' ? ART_RU : CAT_RU)[r.category] ?? r.category) : null);
const gb = (b: number) => `${(b / 1024 ** 3).toFixed(b < 1024 ** 3 ? 2 : 1)} ГБ`;
const mb = (b: number) => (b < 1024 ** 2 ? `${Math.max(1, Math.round(b / 1024))} КБ` : `${(b / 1024 ** 2).toFixed(1)} МБ`);
const ref = (batchId: string) => batchId.slice(0, 6).toUpperCase();
const admins = (env: Env) => env.ADMIN_IDS.split(',').map((s) => +s.trim()).filter(Boolean);

// ---------- база ----------

const getRow = (env: Env, id: string) => env.DB.prepare(`SELECT * FROM media WHERE id = ?`).bind(id).first<Row>();
const getBatch = (env: Env, id: string) => env.DB.prepare(`SELECT * FROM upload_batches WHERE id = ?`).bind(id).first<Batch>();
const batchRows = async (env: Env, id: string) =>
  (await env.DB.prepare(`SELECT * FROM media WHERE batch_id = ? AND status != 'uploading' ORDER BY position`).bind(id).all<Row>()).results;

// ---------- файлы ----------

/** Перенос в другую «папку» R2 (копия + удаление; тело идёт потоком, без копирования в памяти) */
async function move(env: Env, row: Row, folder: 'pending' | 'media' | 'rejected') {
  if (!row.r2_key) return null;
  const to = `${folder}/${row.r2_key.split('/').pop()}`;
  if (to === row.r2_key) return to;
  const obj = await env.MEDIA.get(row.r2_key);
  if (!obj) return null;
  await env.MEDIA.put(to, obj.body, { httpMetadata: obj.httpMetadata });
  await env.MEDIA.delete(row.r2_key);
  return to;
}

async function fileBlob(env: Env, row: Row) {
  if (!row.r2_key) return null;
  const obj = await env.MEDIA.get(row.r2_key);
  return obj ? new Blob([await obj.arrayBuffer()], { type: row.mime }) : null;
}
/** Telegram показывает как фото только до 10 МБ и не слишком вытянутые; остальное - файлом */
const asPhoto = (r: Row) => r.bytes <= 10 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(r.mime) && (r.width ?? 0) + (r.height ?? 0) <= 10000;

// ---------- действия над файлом ----------

export async function publish(env: Env, row: Row) {
  const key = await move(env, row, 'media');
  await env.DB.prepare(`UPDATE media SET status = 'published', r2_key = coalesce(?, r2_key), published_at = datetime('now'), reject_reason = NULL WHERE id = ?`).bind(key, row.id).run();
}
async function reject(env: Env, row: Row, reason: string) {
  const key = await move(env, row, 'rejected');
  await env.DB.prepare(`UPDATE media SET status = 'rejected', r2_key = coalesce(?, r2_key), reject_reason = ?, rejected_at = datetime('now'), published_at = NULL WHERE id = ?`).bind(key, reason, row.id).run();
}
async function toPending(env: Env, row: Row) {
  const key = await move(env, row, 'pending');
  await env.DB.prepare(`UPDATE media SET status = 'pending', r2_key = coalesce(?, r2_key), reject_reason = NULL, published_at = NULL WHERE id = ?`).bind(key, row.id).run();
}
async function destroy(env: Env, row: Row) {
  if (row.r2_key) await env.MEDIA.delete(row.r2_key);
  await env.DB.prepare(`UPDATE media SET status = 'deleted', r2_key = NULL, deleted_at = datetime('now') WHERE id = ?`).bind(row.id).run();
}

// ---------- тексты и кнопки ----------

async function batchText(env: Env, b: Batch, rows: Row[]) {
  const first = rows[0];
  const lines = [`<b>${b.kind === 'photo' ? '📸 Фото' : '🎨 Арт'} · ${rows.length} шт</b> · заявка #${ref(b.id)}`];
  if (first) {
    if (b.kind === 'photo') {
      const ev = first.event_id ? await env.DB.prepare(`SELECT title_ru, start_date FROM events WHERE id = ?`).bind(first.event_id).first<{ title_ru: string; start_date: string | null }>() : null;
      lines.push(`🎪 ${ev ? `${esc(ev.title_ru)}${ev.start_date ? ` (${ev.start_date})` : ''}` : 'без ивента'}`);
      lines.push(`👤 ${first.person_name ? esc(first.person_name) : '<i>фотограф неизвестен</i>'}${first.person_url ? ` - ${esc(first.person_url)}` : ''}`);
    } else {
      lines.push(`🖌 ${esc(first.person_name ?? '?')}${first.person_url ? ` - ${esc(first.person_url)}` : ''}`);
      lines.push(`📅 ${first.created_date ?? '<i>дата неизвестна</i>'}`);
      if (first.character) lines.push(`👥 ${CHAR_RU[first.character] ?? first.character}`);
      if (first.category) lines.push(`🏷 предложили: ${catName(first)}`);
      if (first.original_url) lines.push(`🔗 ${esc(first.original_url)}`);
    }
    const withCap = rows.filter((r) => r.caption_ru);
    const caps = [...new Set(withCap.map((r) => r.caption_ru))];
    if (caps.length === 1 && withCap.length === rows.length) lines.push(`💬 ${esc(caps[0]!)}`);
    else if (withCap.length) lines.push(`💬 подписи у ${withCap.length} из ${rows.length} (видно в «По одному»)`);
  }
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const parts = [['pending', '⏳'], ['published', '✅'], ['rejected', '❌'], ['deleted', '🗑']]
    .map(([s, i]) => (count(s) ? `${i} ${count(s)}` : ''))
    .filter(Boolean);
  const blur = rows.filter((r) => r.blur_requested && r.status === 'pending').length;
  lines.push('', parts.join(' · ') + (blur ? ` · 🫥 ${blur} ждут размытия` : ''));
  const used = await storageUsed(env.DB);
  if (used > LIMITS.storageBytes * LIMITS.storageWarn) {
    lines.push(`\n⚠️ R2 занят на ${Math.round((used / LIMITS.storageBytes) * 100)}% (${gb(used)} из ${gb(LIMITS.storageBytes)}). Почисти /rejected`);
  }
  return lines.join('\n');
}

function itemButtons(r: Row): Keyboard {
  if (r.status === 'pending')
    return [[{ text: '✅ Принять', callback_data: `ia:${r.id}` }, { text: '🫥 Размыть', callback_data: `ib:${r.id}` }],
      [{ text: '❌ Отклонить', callback_data: `ir:${r.id}` }, { text: '🗑 Удалить', callback_data: `id:${r.id}` }]];
  if (r.status === 'published')
    return [[{ text: '👥 Персонаж / категория', callback_data: `icp:${r.id}` }, ...(r.kind === 'photo' ? [{ text: '🏠 На главную', callback_data: `hm:${r.id}` }] : [])],
      [{ text: r.pinned ? '📍 Открепить' : '📌 Закрепить', callback_data: `ip:${r.id}` }, { text: '👋 В «Привет»', callback_data: `hh:${r.id}` }],
      [{ text: '↩️ Снять', callback_data: `iu:${r.id}` }, { text: '🗑 Удалить', callback_data: `id:${r.id}` }]];
  if (r.status === 'rejected')
    return [[{ text: '↩️ На модерацию', callback_data: `iu:${r.id}` }, { text: '🗑 Удалить навсегда', callback_data: `id:${r.id}` }]];
  return [];
}

function batchKb(b: Batch, rows: Row[]): Keyboard {
  if (rows.length === 1) return itemButtons(rows[0]);
  const pending = rows.filter((r) => r.status === 'pending').length;
  const kb: Keyboard = [];
  if (pending)
    kb.push([{ text: `✅ Принять все (${pending})`, callback_data: `ba:${b.id}` }, { text: '❌ Отклонить все', callback_data: `br:${b.id}` }]);
  kb.push([{ text: '🔍 По одному', callback_data: `bv:${b.id}:0` }]);
  if (rows.some((r) => r.status === 'published')) kb.push([{ text: '👥 Персонаж / категория для принятых', callback_data: `bcp:${b.id}` }]);
  return kb;
}

function pickerKb(kind: string, prefix: string, target: string, back: string): Keyboard {
  const cats = (kind === 'art' ? ART_TYPES : PHOTO_CATEGORIES) as readonly string[];
  const names = kind === 'art' ? ART_RU : CAT_RU;
  const kb: Keyboard = [CHARACTERS.map((c) => ({ text: `👥 ${CHAR_RU[c]}`, callback_data: `${prefix}c:${target}:${c}` }))];
  for (let i = 0; i < cats.length; i += 3)
    kb.push(cats.slice(i, i + 3).map((c) => ({ text: names[c], callback_data: `${prefix}k:${target}:${c}` })));
  kb.push([{ text: '← Назад', callback_data: back }]);
  return kb;
}

const reasonsKb = (prefix: string, target: string, back: string): Keyboard => [
  ...REJECT_REASONS.map((r) => [{ text: REASON_RU[r], callback_data: `${prefix}:${target}:${r}` }]),
  [{ text: '← Назад', callback_data: back }],
];

function viewerCaption(r: Row, i: number, n: number) {
  const lines = [`<b>${i + 1}/${n}</b> · ${STATUS_RU[r.status] ?? r.status} · ${mb(r.bytes)}${r.width ? ` · ${r.width}×${r.height}` : ''}`];
  if (r.person_name) lines.push(`👤 ${esc(r.person_name)}`);
  if (r.caption_ru) lines.push(`💬 ${esc(r.caption_ru)}`);
  const tags = [r.character && `👥 ${CHAR_RU[r.character]}`, catName(r) && `🏷 ${catName(r)}`, r.pinned && '📌 закреплено'].filter(Boolean);
  if (tags.length) lines.push(tags.join(' · '));
  if (r.blur_requested && r.status === 'pending') lines.push('🫥 ждёт размытия (сделает сервер обработки)');
  if (r.reject_reason) lines.push(`Причина: ${REASON_RU[r.reject_reason] ?? r.reject_reason}`);
  return lines.join('\n');
}

function viewerKb(b: Batch, r: Row, i: number, n: number): Keyboard {
  const nav: Keyboard = n > 1
    ? [[{ text: '◀️', callback_data: `vn:${b.id}:${(i - 1 + n) % n}` }, { text: `${i + 1}/${n}`, callback_data: 'noop' }, { text: '▶️', callback_data: `vn:${b.id}:${(i + 1) % n}` }]]
    : [];
  return [...nav, ...itemButtons(r), [{ text: '✖️ Закрыть', callback_data: 'vx' }]];
}

// ---------- отправка ----------

/** Новая заявка: альбом превью + сообщение с кнопками. Вызывается сайтом (RPC) и из /pending. */
export async function notifyBatch(env: Env, batchId: string) {
  const b = await getBatch(env, batchId);
  if (!b) return;
  const rows = await batchRows(env, batchId);
  if (!rows.length) return;
  const preview = rows.slice(0, 10);
  const blobs: Record<string, Blob> = {};
  for (const [i, r] of preview.entries()) {
    const blob = await fileBlob(env, r);
    if (blob) blobs[`f${i}`] = blob;
  }
  const photos = preview.every(asPhoto);
  for (const chat of admins(env)) {
    if (preview.length > 1) {
      await apiForm(env, 'sendMediaGroup', {
        chat_id: String(chat),
        media: preview.filter((_, i) => blobs[`f${i}`]).map((_, i) => ({ type: photos ? 'photo' : 'document', media: `attach://f${i}` })),
      }, blobs);
    } else if (blobs.f0) {
      await apiForm(env, photos ? 'sendPhoto' : 'sendDocument', { chat_id: String(chat) }, { [photos ? 'photo' : 'document']: blobs.f0 });
    }
    const msg = await send(env, chat, await batchText(env, b, rows), batchKb(b, rows));
    if (msg) await env.DB.prepare(`UPDATE upload_batches SET tg_chat_id = ?, tg_message_id = ? WHERE id = ?`).bind(chat, msg.message_id, b.id).run();
  }
}

/** Обновить сообщение заявки (счётчики и кнопки) после действий в просмотрщике */
async function refreshBatch(env: Env, batchId: string | null) {
  if (!batchId) return;
  const b = await getBatch(env, batchId);
  if (!b?.tg_chat_id || !b.tg_message_id) return;
  const rows = await batchRows(env, batchId);
  if (!rows.some((r) => r.status === 'pending')) await env.DB.prepare(`UPDATE upload_batches SET status = 'done' WHERE id = ?`).bind(batchId).run();
  await api(env, 'editMessageText', {
    chat_id: b.tg_chat_id, message_id: b.tg_message_id, text: await batchText(env, b, rows), parse_mode: 'HTML',
    link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: batchKb(b, rows) },
  });
}

async function showViewer(env: Env, chat: number, batchId: string, i: number, msg?: Message) {
  const b = await getBatch(env, batchId);
  const rows = b ? await batchRows(env, batchId) : [];
  if (!b || !rows.length) return send(env, chat, 'Заявка не найдена');
  i = Math.max(0, Math.min(i, rows.length - 1));
  const r = rows[i];
  const caption = viewerCaption(r, i, rows.length);
  const kb = viewerKb(b, r, i, rows.length);
  const blob = await fileBlob(env, r);
  const type = asPhoto(r) ? 'photo' : 'document';
  if (!blob) {
    // файл удалён - только текст
    if (msg && !(msg.photo || msg.document)) return edit(env, msg, caption, kb);
    if (msg) await api(env, 'deleteMessage', { chat_id: chat, message_id: msg.message_id });
    return send(env, chat, caption, kb);
  }
  if (msg && (msg.photo || msg.document)) {
    return apiForm(env, 'editMessageMedia', {
      chat_id: String(chat), message_id: String(msg.message_id),
      media: { type, media: 'attach://file', caption, parse_mode: 'HTML' }, reply_markup: { inline_keyboard: kb },
    }, { file: blob });
  }
  return apiForm(env, type === 'photo' ? 'sendPhoto' : 'sendDocument', {
    chat_id: String(chat), caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb },
  }, { [type]: blob });
}

// ---------- команды ----------

export async function pendingCommand(env: Env, chat: number) {
  // недогруженные (закрыли вкладку посреди загрузки) старше часа - убираем
  const stale = (await env.DB.prepare(`SELECT * FROM media WHERE status = 'uploading' AND uploaded_at < datetime('now', '-1 hour')`).all<Row>()).results;
  for (const r of stale) await destroy(env, r);
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.kind, count(m.id) AS n FROM upload_batches b JOIN media m ON m.batch_id = b.id AND m.status = 'pending'
     GROUP BY b.id ORDER BY b.created_at LIMIT 20`,
  ).all<{ id: string; kind: string; n: number }>();
  const extra = stale.length ? `\n<i>Убрало ${stale.length} недогруженных файлов.</i>` : '';
  if (!results.length) return send(env, chat, `Ничего не ждёт проверки ✨${extra}`);
  return send(env, chat, `<b>Ждут проверки</b>: ${results.length} заявок. Нажми, чтобы прислать заново:${extra}`,
    results.map((r) => [{ text: `${r.kind === 'photo' ? '📸' : '🎨'} #${ref(r.id)} · ${r.n} шт`, callback_data: `bo:${r.id}` }]));
}

export async function rejectedCommand(env: Env, chat: number, msg?: Message) {
  const stats = await env.DB.prepare(`SELECT count(*) AS n, coalesce(sum(bytes), 0) AS b FROM media WHERE status = 'rejected'`).first<{ n: number; b: number }>();
  const { results } = await env.DB.prepare(`SELECT * FROM media WHERE status = 'rejected' ORDER BY rejected_at DESC LIMIT 15`).all<Row>();
  const text = stats?.n
    ? `<b>Отклонённые</b>: ${stats.n} шт, ${mb(stats.b)}\nСами не удаляются. Последние:`
    : 'Отклонённых нет ✨';
  const kb: Keyboard = results.map((r) => [{
    text: `${r.kind === 'photo' ? '📸' : '🎨'} ${r.person_name ?? '?'} · ${REASON_RU[r.reject_reason ?? ''] ?? '-'}`.slice(0, 60),
    callback_data: `rv:${r.id}`,
  }]);
  if (stats?.n) kb.push([{ text: `🗑 Удалить все отклонённые (${stats.n})`, callback_data: 'rall' }]);
  return msg ? edit(env, msg, text, kb) : send(env, chat, text, kb);
}

export async function storageLine(env: Env) {
  const used = await storageUsed(env.DB);
  return `💾 R2: ${gb(used)} из ${gb(LIMITS.storageBytes)} (${Math.round((used / LIMITS.storageBytes) * 100)}%)`;
}

// ---------- кнопки ----------

/** true = кнопка из этого модуля */
export async function mediaCallback(env: Env, cb: CallbackQuery, kind: string, a: string, c: string): Promise<boolean> {
  const msg = cb.message!;
  const chat = msg.chat.id;
  const inViewer = !!(msg.photo || msg.document);

  // перерисовать то, откуда нажали: просмотрщик или сообщение заявки
  const rerender = async (row: Row) => {
    if (inViewer && row.batch_id) {
      const rows = await batchRows(env, row.batch_id);
      await showViewer(env, chat, row.batch_id, Math.max(0, rows.findIndex((r) => r.id === row.id)), msg);
    }
    await refreshBatch(env, row.batch_id);
  };
  const withRow = async (fn: (r: Row) => Promise<unknown>, note: string) => {
    const r = await getRow(env, a);
    if (!r) {
      await answer(env, cb, 'Файл не найден');
      return true;
    }
    await fn(r);
    await answer(env, cb, note);
    await rerender((await getRow(env, a))!);
    return true;
  };

  switch (kind) {
    case 'noop':
      await answer(env, cb);
      return true;

    // ----- пачка -----
    case 'ba': {
      await answer(env, cb, 'Публикую…');
      for (const r of await batchRows(env, a)) if (r.status === 'pending') await publish(env, r);
      await refreshBatch(env, a);
      return true;
    }
    case 'br':
      await answer(env, cb);
      await edit(env, msg, `${msg.text ? esc(msg.text) : ''}\n\n<b>Причина для всех:</b>`, reasonsKb('brr', a, `bb:${a}`));
      return true;
    case 'brr': {
      await answer(env, cb, 'Отклоняю…');
      for (const r of await batchRows(env, a)) if (r.status === 'pending') await reject(env, r, c);
      await refreshBatch(env, a);
      return true;
    }
    case 'bb':
      await answer(env, cb);
      await refreshBatch(env, a);
      return true;
    case 'bcp': {
      const b = await getBatch(env, a);
      await answer(env, cb);
      await edit(env, msg, `${msg.text ? esc(msg.text) : ''}\n\n<b>Для всех принятых:</b>`, pickerKb(b?.kind ?? 'photo', 'b', a, `bb:${a}`));
      return true;
    }
    case 'bc':
    case 'bk': {
      const col = kind === 'bc' ? 'character' : 'category';
      await env.DB.prepare(`UPDATE media SET ${col} = ? WHERE batch_id = ? AND status = 'published'`).bind(c, a).run();
      await answer(env, cb, kind === 'bc' ? CHAR_RU[c] : 'Категория поставлена');
      await refreshBatch(env, a);
      return true;
    }
    case 'bv':
      await answer(env, cb);
      await showViewer(env, chat, a, +c);
      return true;
    case 'bo':
      await answer(env, cb, 'Присылаю…');
      await notifyBatch(env, a);
      return true;

    // ----- просмотрщик -----
    case 'vn':
      await answer(env, cb);
      await showViewer(env, chat, a, +c, msg);
      return true;
    case 'vx':
      await answer(env, cb);
      await api(env, 'deleteMessage', { chat_id: chat, message_id: msg.message_id });
      return true;

    // ----- один файл -----
    case 'ia':
      return withRow((r) => publish(env, r), 'На сайте ✅');
    case 'ib':
      return withRow((r) => env.DB.prepare(`UPDATE media SET blur_requested = 1 WHERE id = ?`).bind(r.id).run(), 'Отложено до размытия 🫥');
    case 'iu':
      return withRow((r) => toPending(env, r), 'Вернуло на модерацию');
    case 'ip':
      return withRow((r) => env.DB.prepare(`UPDATE media SET pinned = ? WHERE id = ?`).bind(r.pinned ? 0 : 1, r.id).run(), 'Готово');
    case 'ir':
    case 'id':
    case 'icp': {
      const r = await getRow(env, a);
      if (!r) return answer(env, cb, 'Файл не найден').then(() => true);
      await answer(env, cb);
      const kb = kind === 'ir'
        ? reasonsKb('irr', a, `ivb:${a}`)
        : kind === 'id'
          ? [[{ text: '🗑 Да, удалить навсегда', callback_data: `idok:${a}` }, { text: 'Нет', callback_data: `ivb:${a}` }]]
          : pickerKb(r.kind, 'i', a, `ivb:${a}`);
      await api(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: msg.message_id, reply_markup: { inline_keyboard: kb } });
      return true;
    }
    case 'irr':
      return withRow((r) => reject(env, r, c), 'Отклонено ❌');
    case 'idok':
      return withRow((r) => destroy(env, r), 'Удалено 🗑');
    case 'ic':
    case 'ik': {
      const col = kind === 'ic' ? 'character' : 'category';
      return withRow((r) => env.DB.prepare(`UPDATE media SET ${col} = ? WHERE id = ?`).bind(c, r.id).run(), 'Готово');
    }
    case 'ivb':
      return withRow(async () => {}, '');

    // ----- отклонённые -----
    case 'rv': {
      const r = await getRow(env, a);
      await answer(env, cb);
      if (r?.batch_id) {
        const rows = await batchRows(env, r.batch_id);
        await showViewer(env, chat, r.batch_id, rows.findIndex((x) => x.id === r.id));
      }
      return true;
    }
    case 'rall': {
      const n = await env.DB.prepare(`SELECT count(*) AS n FROM media WHERE status = 'rejected'`).first<number>('n');
      await answer(env, cb);
      await edit(env, msg, `Удалить навсегда все отклонённые (${n})? Вернуть их будет нельзя.`, [
        [{ text: '🗑 Да, удалить', callback_data: 'rallok' }, { text: 'Нет', callback_data: 'rback' }],
      ]);
      return true;
    }
    case 'rallok': {
      await answer(env, cb, 'Удаляю…');
      const { results } = await env.DB.prepare(`SELECT * FROM media WHERE status = 'rejected' LIMIT 200`).all<Row>();
      for (const r of results) await destroy(env, r);
      const left = await env.DB.prepare(`SELECT count(*) AS n FROM media WHERE status = 'rejected'`).first<number>('n');
      await edit(env, msg, `🗑 Удалило ${results.length}.${left ? ` Осталось ${left} - нажми /rejected ещё раз.` : ''}`);
      return true;
    }
    case 'rback':
      await answer(env, cb);
      await rejectedCommand(env, chat, msg);
      return true;
  }
  return false;
}
