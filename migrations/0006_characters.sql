-- Персонажи и их образы (фурсьюты). Всё редактируется ботом: /characters
--
-- Пары *_ru / *_en: если *_en пустой, сайт покажет *_ru.
-- Поля-списки (traits, likes, palette, parts, rules_*, ...) - одна строка = один пункт,
-- внутри строки «русский | english». Формат каждого поля описан в src/lib/characters-core.ts
-- Картинки (*_file, angle_*) - имя файла в R2 media/, отдаются как /media/<файл>.

CREATE TABLE characters (
  id            TEXT PRIMARY KEY,           -- 'arbyss', он же адрес: /characters/arbyss
  position      INTEGER NOT NULL DEFAULT 0, -- порядок в списке
  visible       INTEGER NOT NULL DEFAULT 1,
  theme         TEXT NOT NULL DEFAULT 'watermelon' CHECK (theme IN ('watermelon', 'redpanda')),

  name_ru       TEXT NOT NULL,
  name_en       TEXT,
  label_ru      TEXT,                       -- 'Фурсона' / 'Персонаж'
  label_en      TEXT,
  tagline_ru    TEXT,                       -- строка под именем
  tagline_en    TEXT,
  species_ru    TEXT,
  species_en    TEXT,
  pronouns_ru   TEXT,
  pronouns_en   TEXT,
  summary_ru    TEXT,                       -- 2-3 предложения, видны сразу
  summary_en    TEXT,
  story_ru      TEXT,                       -- лор целиком, абзацы через пустую строку
  story_en      TEXT,

  traits        TEXT,                       -- списки: строка = «ru | en»
  likes         TEXT,
  dislikes      TEXT,
  palette       TEXT,                       -- строка = «Корка | Rind | #2E7D32»
  marks         TEXT,                       -- особые приметы
  art_ok        TEXT,                       -- для художников: можно / спроси / нельзя
  art_ask       TEXT,
  art_no        TEXT,
  facts         TEXT,

  hero_file     TEXT,                       -- главный арт
  hero_artist   TEXT,                       -- «@ник | https://...»
  ref_file      TEXT,                       -- реф для «Скачать реф»
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE looks (
  id            TEXT PRIMARY KEY,           -- 'arbyss-fullsuit', адрес: /fursuits/arbyss-fullsuit
  character_id  TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1,
  kind          TEXT NOT NULL DEFAULT 'fullsuit' CHECK (kind IN ('fullsuit', 'partial', 'kigurumi', 'other')),

  name_ru       TEXT NOT NULL,              -- 'Фуллсьют'
  name_en       TEXT,
  subtitle_ru   TEXT,                       -- строка под названием
  subtitle_en   TEXT,
  status_ru     TEXT,                       -- чип: 'Готов к кону'
  status_en     TEXT,
  maker         TEXT,                       -- «Кирилл Журавлёв | https://...»
  since_ru      TEXT,                       -- «Появился»: 'осень 2025'
  since_en      TEXT,
  type_ru       TEXT,                       -- «Тип»: 'фуллсьют · всё отстёгивается'
  type_en       TEXT,
  species_ru    TEXT,
  species_en    TEXT,

  parts         TEXT,                       -- списки: строка = «ru | en»
  parts_note_ru TEXT,
  parts_note_en TEXT,
  features      TEXT,                       -- «Что умеет»
  pills         TEXT,                       -- короткая памятка: «ok | Фото - можно | Photos - yes» (ok/ask/no/info)
  rules_ok      TEXT,                       -- памятка: можно / сначала спроси / нельзя
  rules_ask     TEXT,
  rules_no      TEXT,
  notes         TEXT,                       -- серые карточки: «Заголовок | Title | текст | text»
  addons        TEXT,                       -- дополнения
  timeline      TEXT,                       -- «Как он появился»: «2023 | Реф и заказ | Ref and order»

  cover_file    TEXT,                       -- главное фото
  angle_front   TEXT,
  angle_side    TEXT,
  angle_back    TEXT,
  angle_motion  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX looks_character ON looks (character_id, position);

-- Фото и ивенты можно привязать к образу. Пока не привязаны - сайт подбирает
-- фото по персонажу и категории (full / partial), а ивенты по «в чём был».
ALTER TABLE media  ADD COLUMN look_id TEXT REFERENCES looks (id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN look_id TEXT REFERENCES looks (id) ON DELETE SET NULL;
CREATE INDEX media_look ON media (look_id);

-- ---------- Стартовое содержимое (как в макете Figma) ----------

INSERT OR IGNORE INTO characters (id, position, theme, name_ru, name_en, label_ru, label_en, tagline_ru, tagline_en, species_ru, species_en, pronouns_ru, pronouns_en, palette)
VALUES
  ('arbyss', 0, 'watermelon', 'Arbyss', NULL, 'Фурсона', 'Fursona', 'Арбуз - манокит-арбуз из Торонто', 'Arbuz - a watermelon manokit from Toronto',
   'манокит', 'manokit', 'он / его', 'he / him',
   'Корка | Rind | #2E7D32
Полоски | Stripes | #A5D6A7
Мякоть | Flesh | #FF5C7A
Косточки | Seeds | #1B1B1B
Живот | Belly | #FFF3E0'),
  ('murkas', 1, 'redpanda', 'Муркас', 'Murkas', 'Персонаж', 'Character', 'Красная панда', 'Red panda',
   'красная панда', 'red panda', 'он / его', 'he / him',
   'Шерсть | Fur | #C0502C
Маска | Mask | #FFF1E6
Лапы | Paws | #3A1F16
Кольца хвоста | Tail rings | #8A3A1E
Нос | Nose | #1C1210');

INSERT OR IGNORE INTO looks (id, character_id, position, kind, name_ru, name_en, subtitle_ru, subtitle_en, status_ru, status_en, maker, type_ru, type_en, species_ru, species_en,
  parts, parts_note_ru, parts_note_en, pills, rules_ok, rules_ask, rules_no, notes)
VALUES
  ('arbyss-fullsuit', 'arbyss', 0, 'fullsuit', 'Фуллсьют', 'Fullsuit',
   'Основной костюм. Всё отстёгивается - можно носить целиком или по частям.', 'Main suit. Everything detaches - I can wear it whole or in parts.',
   'Готов к кону', 'Con ready', 'Кирилл Журавлёв', 'фуллсьют · всё отстёгивается', 'fullsuit · everything detaches', 'манокит-арбуз', 'watermelon manokit',
   'Голова | Head
Тело | Body
Фурчатки | Handpaws
Фуртапки | Feetpaws
Хвост | Tail',
   'Голова, фурчатки, фуртапки и хвост отстёгиваются - всё можно носить по отдельности.', 'Head, handpaws, feetpaws and tail detach - each can be worn on its own.',
   'ok | Фото в костюме - можно | Photos of the suit - yes
ask | Фото со мной - спроси | Photos with me - ask
no | Без костюма - не фоткать | No photos out of suit
no | «Нет» - значит нет | No means no',
   'Фоткать и снимать меня в костюме - в любой момент | Take photos and videos of me in suit - any time
Махать, давать пять, звать по имени | Wave, high-five, call my name
Отмечать меня в соцсетях: @Murkasfur | Tag me on socials: @Murkasfur
Загрузить фото сюда - появится в «Фото» | Upload photos here - they show up in Photos',
   'Фото вместе со мной - иногда я занят другими людьми | Photos together - sometimes I''m busy with other people
Обнимашки | Hugs
Поднять меня на руки | Picking me up
Гладить и чесать мех | Petting and scritches
Брать за лапу и куда-то вести | Taking my paw and leading me somewhere',
   'Фоткать меня без костюма без разрешения | Photos of me out of suit without asking
Трогать грязными или липкими руками - после еды помой лапки | Touching with dirty or sticky hands - wash up after eating
Трогать и снимать голову, тянуть за хвост, уши и лапы | Touching or removing the head, pulling tail, ears or paws
Подкрадываться со спины и налетать с обнимашками | Sneaking up from behind or glomping
Давать еду и питьё через голову | Giving food or drinks through the head
Мешать уйти - значит, мне надо остыть или попить | Stopping me from leaving - I need to cool down or drink',
   'В голове видно плохо | Limited vision | Могу тебя не заметить, особенно сбоку и снизу. Подходи спереди и помаши - я не игнорирую, просто не вижу. | I might not notice you, especially from the side or below. Come from the front and wave - I''m not ignoring you, I just can''t see.
Если мне нужен перерыв | If I need a break | В костюме жарко. Если я ухожу - это не из-за тебя, просто отдыхаю. Если мне явно плохо - позови хендлера или орга. | It''s hot in the suit. If I walk away, it''s not about you, I''m just resting. If I look unwell, call a handler or staff.'),
  ('arbyss-kigurumi', 'arbyss', 1, 'kigurumi', 'Кигуруми', 'Kigurumi',
   'Мягкий образ для прогулок и обнимашек. Обычно с головой, но могу и без.', 'A soft look for walks and hugs. Usually with the head, sometimes without.',
   'Готов к прогулке', 'Ready for a walk', NULL, 'кигуруми · обычно с головой', 'kigurumi · usually with the head', 'манокит-арбуз', 'watermelon manokit',
   'Кигуруми | Kigurumi
Голова | Head
Хвост-арбуз | Watermelon tail',
   'Голова снимается - обычно ношу с ней, но могу и без.', 'The head comes off - I usually wear it, but not always.',
   'ok | Фото в костюме - можно | Photos of the suit - yes
ask | Фото со мной - спроси | Photos with me - ask
no | Без костюма - не фоткать | No photos out of suit
no | «Нет» - значит нет | No means no',
   'Фоткать и снимать меня в кигуруми - в любой момент | Take photos and videos of me in kigurumi - any time
Обнимашки - можно без спроса | Hugs - no need to ask
Гладить хвост, он мягкий | Pet the tail, it''s soft
Подойти поболтать | Come say hi and chat',
   'Фото вместе со мной - иногда я занят другими людьми | Photos together - sometimes I''m busy with other people
Поднять меня на руки | Picking me up
Брать за руку и куда-то вести | Taking my hand and leading me somewhere
Трогать капюшон с ушками | Touching the hood with ears',
   'Фоткать меня без костюма без разрешения | Photos of me out of suit without asking
Трогать грязными или липкими руками - после еды помой лапки | Touching with dirty or sticky hands - wash up after eating
Трогать и снимать голову, тянуть за хвост и уши | Touching or removing the head, pulling tail or ears
Подкрадываться со спины и пугать | Sneaking up from behind
Лезть в карманы | Going into my pockets
Мешать уйти - значит, мне надо отдохнуть | Stopping me from leaving - I need a rest',
   'В голове видно плохо | Limited vision | Могу тебя не заметить, особенно сбоку и снизу. Подходи спереди и помаши - я не игнорирую, просто не вижу. | I might not notice you, especially from the side or below. Come from the front and wave - I''m not ignoring you, I just can''t see.
Если мне нужен перерыв | If I need a break | Если я ухожу - просто отдыхаю или грею лапы. Это не из-за тебя. | If I walk away, I''m just resting or warming my paws. It''s not about you.'),
  ('murkas-partial', 'murkas', 0, 'partial', 'Партиал', 'Partial',
   'Голова, лапы, рукава и хвост. Надевается поверх обычной одежды.', 'Head, paws, sleeves and tail. Worn over regular clothes.',
   NULL, NULL, NULL, 'партиал · голова, лапы, рукава, хвост', 'partial · head, paws, sleeves, tail', 'красная панда', 'red panda',
   'Голова | Head
Фурчатки | Handpaws
Рукава | Sleeves
Хвост | Tail',
   'Всё надевается по отдельности, поверх обычной одежды.', 'Each part goes on separately, over regular clothes.',
   'ok | Фото в костюме - можно | Photos of the suit - yes
ask | Фото со мной - спроси | Photos with me - ask
no | Без костюма - не фоткать | No photos out of suit
no | «Нет» - значит нет | No means no',
   'Фоткать и снимать меня в костюме - в любой момент | Take photos and videos of me in suit - any time
Махать, давать пять, звать по имени | Wave, high-five, call my name
Отмечать меня в соцсетях: @Murkasfur | Tag me on socials: @Murkasfur
Загрузить фото сюда - появится в «Фото» | Upload photos here - they show up in Photos',
   'Фото вместе со мной - иногда я занят другими людьми | Photos together - sometimes I''m busy with other people
Обнимашки | Hugs
Поднять меня на руки | Picking me up
Гладить и чесать мех | Petting and scritches
Брать за лапу и куда-то вести | Taking my paw and leading me somewhere',
   'Фоткать меня без костюма без разрешения | Photos of me out of suit without asking
Трогать грязными или липкими руками - после еды помой лапки | Touching with dirty or sticky hands - wash up after eating
Трогать и снимать голову, тянуть за хвост, уши и лапы | Touching or removing the head, pulling tail, ears or paws
Подкрадываться со спины и налетать с обнимашками | Sneaking up from behind or glomping
Давать еду и питьё через голову | Giving food or drinks through the head
Мешать уйти - значит, мне надо остыть или попить | Stopping me from leaving - I need to cool down or drink',
   'В голове видно плохо | Limited vision | Могу тебя не заметить, особенно сбоку и снизу. Подходи спереди и помаши - я не игнорирую, просто не вижу. | I might not notice you, especially from the side or below. Come from the front and wave - I''m not ignoring you, I just can''t see.
Если мне нужен перерыв | If I need a break | В костюме жарко. Если я ухожу - это не из-за тебя, просто отдыхаю. Если мне явно плохо - позови хендлера или орга. | It''s hot in the suit. If I walk away, it''s not about you, I''m just resting. If I look unwell, call a handler or staff.');
