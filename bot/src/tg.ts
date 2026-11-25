// Минимальный клиент Telegram Bot API - без библиотек, чтобы влезать в 10 мс CPU.
import type { Env } from './env';

export type Button = { text: string; callback_data?: string; url?: string };
export type Keyboard = Button[][];

export type Message = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size?: number; width: number; height: number }[];
  document?: { file_id: string; file_size?: number; mime_type?: string; file_name?: string };
  audio?: {
    file_id: string; file_size?: number; mime_type?: string; file_name?: string;
    title?: string; performer?: string; duration?: number;
    thumbnail?: { file_id: string; file_size?: number };
  };
  voice?: { file_id: string };
  reply_markup?: { inline_keyboard?: Keyboard };
};
export type CallbackQuery = {
  id: string;
  from: { id: number };
  message?: Message;
  data?: string;
};
export type Update = { update_id: number; message?: Message; callback_query?: CallbackQuery };

export async function api<T = unknown>(env: Env, method: string, body: Record<string, unknown>): Promise<T | undefined> {
  if (env.TG_DRY === '1') {
    console.log(`[tg] ${method} ${JSON.stringify(body)}`);
    return { message_id: Math.floor(Math.random() * 1e6) } as T;
  }
  const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  // «message is not modified» - не ошибка, просто нажали ту же кнопку
  if (!data.ok && !data.description?.includes('not modified')) console.error(`[tg] ${method} failed: ${data.description}`);
  return data.result;
}

/** Запрос с файлами (multipart): поля + Blob'ы */
export async function apiForm<T = unknown>(env: Env, method: string, fields: Record<string, unknown>, files: Record<string, Blob> = {}): Promise<T | undefined> {
  if (env.TG_DRY === '1') {
    const sizes = Object.entries(files).map(([k, b]) => `${k}=${b.size}B`).join(' ');
    console.log(`[tg] ${method} ${JSON.stringify(fields)} files: ${sizes}`);
    return { message_id: Math.floor(Math.random() * 1e6) } as T;
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  for (const [k, b] of Object.entries(files)) form.append(k, b, `${k}.${b.type.split('/')[1] ?? 'bin'}`);
  const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: 'POST', body: form });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok && !data.description?.includes('not modified')) console.error(`[tg] ${method} failed: ${data.description}`);
  return data.result;
}

const markup = (kb?: Keyboard) => (kb ? { reply_markup: { inline_keyboard: kb } } : {});

export const send = (env: Env, chatId: number, text: string, kb?: Keyboard) =>
  api<Message>(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...markup(kb) });

export const edit = (env: Env, msg: Message, text: string, kb?: Keyboard) =>
  api(env, 'editMessageText', {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...markup(kb),
  });

export const answer = (env: Env, cb: CallbackQuery, text?: string) =>
  api(env, 'answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text } : {}) });

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Скачать файл, присланный боту (до 20 МБ - ограничение Telegram для ботов) */
export async function downloadFile(env: Env, fileId: string): Promise<Uint8Array | null> {
  const f = await api<{ file_path?: string }>(env, 'getFile', { file_id: fileId });
  if (!f?.file_path) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${f.file_path}`);
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
}
