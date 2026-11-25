-- Первая схема базы murkas.net
-- Тексты на двух языках хранятся парами *_ru / *_en. Если *_en пустой, сайт покажет *_ru.

-- Художники и фотографы (чтобы ссылка на человека была одна на все его работы)
CREATE TABLE people (
  id          TEXT PRIMARY KEY,           -- например 'artist_two'
  name        TEXT NOT NULL,              -- как показывать: '@artist_two'
  url         TEXT,                       -- куда ведёт ник (https://...)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ивенты
CREATE TABLE events (
  id          TEXT PRIMARY KEY,           -- 'fe-2027'
  title_ru    TEXT NOT NULL,
  title_en    TEXT,
  city_ru     TEXT NOT NULL,
  city_en     TEXT,
  start_date  TEXT,                       -- 'YYYY-MM-DD' или NULL, если дата ещё неизвестна (TBA)
  end_date    TEXT,
  approx_ru   TEXT,                       -- для TBA: 'март 2027'
  approx_en   TEXT,                       -- 'March 2027'
  sort_key    TEXT,                       -- для TBA: первый день примерного периода
  status      TEXT NOT NULL DEFAULT 'full'
              CHECK (status IN ('full', 'partial', 'nosuit', 'cant', 'went', 'missed')),
  url         TEXT,                       -- сайт ивента
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX events_date ON events (coalesce(start_date, sort_key));

-- Фото и арты: одна таблица, различаются полем kind
CREATE TABLE media (
  id            TEXT PRIMARY KEY,         -- короткий случайный id
  kind          TEXT NOT NULL CHECK (kind IN ('photo', 'art')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('uploading', 'pending', 'published', 'rejected', 'deleted')),

  title_ru      TEXT,
  title_en      TEXT,
  caption_ru    TEXT,
  caption_en    TEXT,
  character     TEXT CHECK (character IN ('arbyss', 'murkas', 'both')),
  -- фото: group/full/partial/walks/backstage/parties; арт: full/sketch/ref/stickers/comic/ych
  category      TEXT,

  event_id      TEXT REFERENCES events (id) ON DELETE SET NULL,
  person_id     TEXT REFERENCES people (id) ON DELETE SET NULL,   -- фотограф или художник
  person_name   TEXT,                     -- как указал загрузивший (до модерации)
  person_url    TEXT,

  taken_date    TEXT,                     -- фото: дата съёмки
  created_date  TEXT,                     -- арт: когда нарисован (NULL = неизвестно)
  city_ru       TEXT,
  city_en       TEXT,
  original_url  TEXT,                     -- арт: ссылка на пост художника

  pinned        INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  mime          TEXT,
  sha256        TEXT,                     -- для поиска дублей
  r2_key        TEXT,                     -- где лежит оригинал
  variants      TEXT,                     -- JSON с готовыми размерами после обработки
  processed     INTEGER NOT NULL DEFAULT 0,
  blur_requested INTEGER NOT NULL DEFAULT 0,

  uploader_ip   TEXT,                     -- хэш IP, не сам IP
  reject_reason TEXT,                     -- off_topic / quality / duplicate / not_theirs / other
  tg_message_id INTEGER,                  -- сообщение с заявкой в Telegram

  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now')),
  published_at  TEXT,
  rejected_at   TEXT,
  deleted_at    TEXT
);
CREATE INDEX media_feed ON media (kind, status, pinned DESC, coalesce(taken_date, created_date, uploaded_at) DESC);
CREATE INDEX media_sha ON media (sha256);
CREATE INDEX media_event ON media (event_id);
