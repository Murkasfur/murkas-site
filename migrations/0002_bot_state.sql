-- Состояние модерационного бота: на каком шаге диалога ты сейчас
-- (например, добавляешь ивент и бот ждёт дату). Одна строка на чат.
CREATE TABLE bot_state (
  chat_id     INTEGER PRIMARY KEY,
  state       TEXT NOT NULL,              -- JSON: { flow, step, draft, ... }
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
