-- Время у ивентов (необязательное, по Торонто). Есть время = короткий
-- ивент (мит, панель): на сайте «В пути» за час до и «Еду домой» час после.
-- Нет времени = конвент на весь день.
ALTER TABLE events ADD COLUMN start_time TEXT;   -- 'HH:MM'
ALTER TABLE events ADD COLUMN end_time   TEXT;   -- 'HH:MM'
