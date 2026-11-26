-- В каких образах был на ивенте. На один ивент можно взять несколько костюмов
-- (например, на кон: кигуруми Arbyss и голова Муркаса) - поэтому отдельная таблица.
-- Счётчик «ивентов в этом образе» на странице фурсьюта считает только эти отметки.
CREATE TABLE event_looks (
  event_id  TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  look_id   TEXT NOT NULL REFERENCES looks (id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, look_id)
);
CREATE INDEX event_looks_look ON event_looks (look_id);

-- Arbyss как партиал: тот же костюм без тела. Памятку берём у фуллсьюта.
INSERT OR IGNORE INTO looks (id, character_id, position, kind, name_ru, name_en, subtitle_ru, subtitle_en, type_ru, type_en, species_ru, species_en,
  maker, parts, parts_note_ru, parts_note_en, pills, rules_ok, rules_ask, rules_no, notes)
SELECT 'arbyss-partial', 'arbyss', 1, 'partial', 'Партиал', 'Partial',
  'Тот же фуллсьют без тела: голова, лапы и хвост поверх обычной одежды.', 'The same fullsuit without the body: head, paws and tail over regular clothes.',
  'партиал · голова, лапы, хвост', 'partial · head, paws, tail', species_ru, species_en,
  maker,
  'Голова | Head
Фурчатки | Handpaws
Фуртапки | Feetpaws
Хвост | Tail',
  'Это части фуллсьюта - каждую можно надеть отдельно.', 'These are parts of the fullsuit - each can be worn on its own.',
  pills, rules_ok, rules_ask, rules_no, notes
FROM looks WHERE id = 'arbyss-fullsuit';
UPDATE looks SET position = 2 WHERE id = 'arbyss-kigurumi';
