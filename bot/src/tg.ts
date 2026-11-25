// Минимальный клиент Telegram Bot API - без библиотек, чтобы влезать в 10 мс CPU.
import type { Env } from './env';

export type Button = { text: string; callback_data?: string; url?: string };
export type Keyboard = Button[][];

export type Message = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
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
    return undefined;
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

const markup = (kb?: Keyboard) => (kb ? { reply_markup: { inline_keyboard: kb } } : {});

export const send = (env: Env, chatId: number, text: string, kb?: Keyboard) =>
  api(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...markup(kb) });

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
