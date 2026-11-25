-- Тип ивента (кон / мит / локальное), место (отель, парк...) и в чём был.
-- suit хранится отдельно от статуса: после ивента статус становится «Был»,
-- а для статистики «В чём был» нужно помнить фулл / партиал / без сьюта.
ALTER TABLE events ADD COLUMN kind     TEXT CHECK (kind IN ('con', 'meet', 'local'));
ALTER TABLE events ADD COLUMN venue_ru TEXT;
ALTER TABLE events ADD COLUMN venue_en TEXT;
ALTER TABLE events ADD COLUMN suit     TEXT CHECK (suit IN ('full', 'partial', 'nosuit'));
UPDATE events SET suit = status WHERE status IN ('full', 'partial', 'nosuit');
