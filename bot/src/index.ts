// Вход Worker'а бота.
//   POST /tg     - сюда Telegram шлёт сообщения (проверяем секретный заголовок)
//   GET  /setup  - один раз после деплоя: подключить вебхук и меню команд
//                  (https://murkas-bot.<ты>.workers.dev/setup?key=<TG_WEBHOOK_SECRET>)
import type { Env } from './env';
import { api, type Update } from './tg';
import { handleUpdate } from './bot';

const COMMANDS = [
  { command: 'status', description: 'Что сейчас на сайте' },
  { command: 'events', description: 'Ивенты' },
  { command: 'addevent', description: 'Добавить ивент' },
  { command: 'now', description: 'Статус «Сейчас»' },
  { command: 'default', description: 'Статус по умолчанию' },
  { command: 'pages', description: 'Готовые и «в работе» страницы' },
  { command: 'maintenance', description: 'Закрыть / открыть сайт' },
  { command: 'cancel', description: 'Отменить' },
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/tg') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const update = (await req.json()) as Update;
      try {
        await handleUpdate(env, update);
      } catch (err) {
        // отвечаем 200 всё равно, иначе Telegram будет слать то же сообщение снова и снова
        console.error('update failed', err);
      }
      return new Response('ok');
    }

    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.TG_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const hook = await api(env, 'setWebhook', {
        url: `${url.origin}/tg`,
        secret_token: env.TG_WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      });
      const cmds = await api(env, 'setMyCommands', { commands: COMMANDS });
      return Response.json({ webhook: hook, commands: cmds });
    }

    return new Response('murkas-bot 🐾');
  },
} satisfies ExportedHandler<Env>;
