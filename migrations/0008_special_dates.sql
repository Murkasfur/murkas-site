-- Важные даты на таймлайне ивентов: дни рождения, праздники.
-- Это не ивенты: повторяются каждый год, на сайте - узкий чип в своём месяце.
-- day = NULL - число ещё не известно, показываем только месяц.
CREATE TABLE IF NOT EXISTS special_dates (
  id TEXT PRIMARY KEY,
  name_ru TEXT NOT NULL,
  name_en TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INTEGER CHECK (day BETWEEN 1 AND 31),
  icon TEXT NOT NULL DEFAULT 'celebration',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO special_dates (id, name_ru, name_en, month, day, icon) VALUES
  ('new-year', 'Новый год', 'New Year', 1, 1, 'celebration'),
  ('valentine', 'День святого Валентина', 'Valentine''s Day', 2, 14, 'favorite'),
  ('birthday', 'День рождения', 'Birthday', 3, NULL, 'cake'),
  ('halloween', 'Хэллоуин', 'Halloween', 10, 31, 'dark_mode'),
  ('christmas', 'Рождество', 'Christmas', 12, 25, 'park');
