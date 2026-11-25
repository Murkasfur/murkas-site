-- Загрузки от посетителей. Пачка = одна отправка формы (до 50 файлов),
-- общие поля (ивент, фотограф, художник...) лежат в meta и копируются в каждый файл.
CREATE TABLE upload_batches (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('photo', 'art')),
  status        TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'pending', 'done')),
  expected      INTEGER NOT NULL,           -- сколько файлов обещали прислать
  meta          TEXT NOT NULL,              -- JSON с полями формы
  ip_hash       TEXT,
  tg_chat_id    INTEGER,                    -- сообщение с заявкой у модератора
  tg_message_id INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT
);

ALTER TABLE media ADD COLUMN batch_id TEXT REFERENCES upload_batches (id) ON DELETE SET NULL;
ALTER TABLE media ADD COLUMN position INTEGER;   -- порядок внутри пачки
CREATE INDEX media_batch ON media (batch_id, position);
CREATE INDEX media_ip ON media (uploader_ip, uploaded_at);
