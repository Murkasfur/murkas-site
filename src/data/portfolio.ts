// Всё содержимое портфолио (portfolio.murkas.net) в одном месте.
//
// Как добавить проект: скопируй любой объект из `projects` ниже, поменяй slug
// (он же адрес страницы: /<slug>), тексты и фото - и сделай push.
// Фото кладутся в public/portfolio/<slug>/ и указываются как '/portfolio/<slug>/1.webp'.
// Подойдёт и любая ссылка, в том числе на R2 (/media/...).
//
// Текст можно писать одной строкой (будет одинаковым на обоих языках)
// или объектом { en: '...', ru: '...' }.
//
// Сайт читает эти данные через getPortfolio() (src/lib/portfolio.ts), а не напрямую:
// позже туда можно добавить проекты из KV/D1, которые присылает Telegram-бот,
// и страницы ничего не заметят.

export type L = string | { en: string; ru: string };

export type Role = 'design' | 'frontend' | 'backend' | 'full' | 'dev' | 'hardware';

export type Photo = {
  /** путь или ссылка на картинку; пусто = заглушка */
  src?: string;
  title?: L;
  caption?: L;
  /** когда сделано, например 'Nov 2026' */
  made?: L;
  /** ссылка «Open in Figma» для этого кадра */
  figma?: string;
};

export type Metric = { value: string; label: L };

export type Project = {
  slug: string;
  title: string;
  /** короткое описание для карточек */
  short: L;
  /** описание под заголовком на странице проекта и в карусели */
  description: L;
  /** «Nov 2026 - now», «2025» */
  when: L;
  /** для сортировки: 'YYYY-MM' */
  sort: string;
  year: string;
  roles: Role[];
  /** «Solo: design & development» */
  roleText: L;
  stackShort: string;
  tags: string[];
  metrics?: Metric[];
  live?: string;
  figma?: string;
  github?: string;
  /** на главной в карусели «Selected work» */
  featured?: boolean;
  /** сколько первых фото считаются главными (карусель на странице проекта) */
  mainPhotos?: number;
  photos: Photo[];
  /** блоки страницы проекта; пустые не показываются */
  problem?: L;
  did?: { title: L; text: L }[];
  process?: { intro?: L; steps: { caption: L; photo?: string }[] };
  result?: { title: L; text: L }[];
};

export type Level = 'junior' | 'middle' | 'senior';

export type Skill = {
  name: string;
  group: 'design' | 'dev';
  /** уровень показывается только там, где он указан */
  level?: Level;
  years?: string;
  about?: L;
  /** slug проектов, где навык использовался */
  used?: string[];
};

export type LearningKind = 'education' | 'course' | 'certificate';
export type Learning = {
  title: L;
  where: L;
  when: string;
  kind: LearningKind;
  /** короткая пометка в списке, например «certificate» */
  note?: L;
  about?: L;
  tags?: string[];
  links?: { label: L; href: string }[];
};

/* ------------------------------------------------------------------ */

export const profile = {
  name: 'Roma Stirmanov',
  email: 'ilyastirmanov@gmail.com',
  /** null = кнопка скрыта. Положи PDF в public/ и укажи '/roma-stirmanov-cv.pdf' */
  cv: null as string | null,
  telegram: { href: 'https://t.me/Murkasfur', handle: '@Murkasfur' },
  github: { href: 'https://github.com/Murkasfur', handle: 'Murkasfur' },
  /** null = ссылка скрыта, пока нет адреса */
  linkedin: null as null | { href: string; handle: string },
  upwork: null as null | { href: string; handle: L },
  fursona: 'https://murkas.net',
  rate: { from: 25, to: 35, currency: 'USD' },
  status: {
    en: 'Open to part-time & freelance · Design · Frontend · Full projects',
    ru: 'Открыт к part-time и фрилансу · Дизайн · Фронтенд · Проекты целиком',
  } as L,
  stats: [
    { value: '3 yrs', label: { en: 'designing in Figma', ru: 'дизайню в Figma' } },
    { value: '10k+', label: { en: 'lines of code shipped', ru: 'строк кода в проде' } },
    { value: '4', label: { en: 'projects end to end', ru: 'проекта целиком' } },
  ] as Metric[],
  facts: [
    { label: { en: 'Based in', ru: 'Где' }, value: { en: 'Toronto, Canada · open to remote', ru: 'Торонто, Канада · можно удалённо' } },
    { label: { en: 'Languages', ru: 'Языки' }, value: { en: 'Russian · English', ru: 'Русский · английский' } },
    { label: { en: 'Focus', ru: 'Фокус' }, value: { en: 'Design systems, web apps, bots', ru: 'Дизайн-системы, веб-приложения, боты' } },
    { label: { en: 'Outside work', ru: 'Вне работы' }, value: { en: 'Guitar, motorcycles, fursuits & stickers', ru: 'Гитара, мотоциклы, фурсьюты и стикеры' } },
  ] as { label: L; value: L }[],
};

/** Чипы «Стек» на странице всех работ. Совпадение по части тега: «Cloudflare» найдёт «Cloudflare Workers» */
export const stackFilters = ['Figma', 'TypeScript', 'Astro', 'Cloudflare', 'Python', 'Telegram', 'ESP32', 'C++'];

export const skills: Skill[] = [
  {
    name: 'Figma',
    group: 'design',
    level: 'middle',
    years: '3 yrs',
    about: {
      en: 'Design systems with variables and modes, auto layout, components with variants, prototypes and dev handoff.',
      ru: 'Дизайн-системы на переменных и режимах, auto layout, компоненты с вариантами, прототипы и передача в разработку.',
    },
    used: ['murkas-net', 'unimice-id'],
  },
  {
    name: 'Material 3',
    group: 'design',
    about: { en: 'My own M3 kit: tokens, light and dark themes, components.', ru: 'Свой M3-кит: токены, светлая и тёмная темы, компоненты.' },
    used: ['murkas-net'],
  },
  {
    name: 'Design systems',
    group: 'design',
    about: { en: 'Tokens first, then components and states - so code matches design 1:1.', ru: 'Сначала токены, потом компоненты и состояния - чтобы код совпадал с макетом 1:1.' },
    used: ['murkas-net', 'unimice-id'],
  },
  { name: 'Prototyping', group: 'design', about: { en: 'Clickable flows to test ideas before code.', ru: 'Кликабельные прототипы, чтобы проверить идею до кода.' }, used: ['unimice-id'] },
  { name: 'User flows', group: 'design', about: { en: 'Maps of every path a user can take, including errors.', ru: 'Схемы всех путей пользователя, включая ошибки.' }, used: ['murkas-net', 'unimice-id'] },
  { name: 'UI/UX', group: 'design', used: ['murkas-net', 'unimice-id'] },
  { name: 'TypeScript', group: 'dev', about: { en: 'Site, API and the Telegram bot are all TypeScript.', ru: 'Сайт, API и Telegram-бот - всё на TypeScript.' }, used: ['murkas-net'] },
  { name: 'JavaScript', group: 'dev', used: ['murkas-net'] },
  { name: 'Astro', group: 'dev', about: { en: 'SSR pages on Cloudflare Workers, i18n, islands of client code.', ru: 'SSR-страницы на Cloudflare Workers, i18n, точечный клиентский код.' }, used: ['murkas-net'] },
  { name: 'Python', group: 'dev', about: { en: 'Bots and automation.', ru: 'Боты и автоматизация.' }, used: ['telegram-ai-bot'] },
  { name: 'Bash', group: 'dev', about: { en: 'Scripts and a menu app for a group project at college.', ru: 'Скрипты и меню-приложение для группового проекта в колледже.' } },
  { name: 'SQL', group: 'dev', about: { en: 'D1 (SQLite) schema and queries.', ru: 'Схема и запросы в D1 (SQLite).' }, used: ['murkas-net'] },
  { name: 'Cloudflare Workers', group: 'dev', about: { en: 'Workers, D1, R2, KV, image resizing, service bindings.', ru: 'Workers, D1, R2, KV, ресайз картинок, service bindings.' }, used: ['murkas-net'] },
  { name: 'Git & GitHub', group: 'dev', used: ['murkas-net', 'telegram-ai-bot', 'protogen-helmet'] },
  { name: 'C++', group: 'dev', about: { en: 'ESP32 firmware with PlatformIO.', ru: 'Прошивка ESP32 на PlatformIO.' }, used: ['protogen-helmet'] },
];

export const learning: Learning[] = [
  {
    title: 'Computer Programming (T186)',
    where: 'George Brown Polytechnic · Toronto',
    when: '2026 - now',
    kind: 'education',
    about: {
      en: 'Two-year diploma: programming fundamentals, web development, databases and Linux. Group projects every term - currently a Bash menu app with a team of three.',
      ru: 'Двухлетний диплом: основы программирования, веб, базы данных и Linux. Групповые проекты каждый семестр - сейчас Bash-приложение с меню в команде из трёх человек.',
    },
    tags: ['Java', 'Web', 'Databases', 'Linux'],
  },
  {
    title: 'English Pathway Level 3',
    where: 'ILAC International College',
    when: '2026',
    kind: 'certificate',
    note: { en: 'certificate', ru: 'сертификат' },
  },
  {
    title: { en: 'Specialized IT class', ru: 'Профильный IT-класс' },
    where: { en: 'School in Moscow', ru: 'Школа в Москве' },
    when: 'Earlier',
    kind: 'education',
    about: { en: 'A school class with a deep informatics program.', ru: 'Школьный класс с углублённой информатикой.' },
  },
  // Курсы добавляй сюда, например:
  // { title: 'UX Design', where: 'Coursera', when: '2024', kind: 'course', links: [{ label: 'Certificate', href: 'https://...' }] },
];

export const process = [
  { title: { en: 'Research & design', ru: 'Исследование и дизайн' }, text: { en: 'I start with who will use it, then sketch flows and screens in Figma.', ru: 'Начинаю с того, кто будет этим пользоваться, потом рисую сценарии и экраны в Figma.' } },
  { title: { en: 'Design system', ru: 'Дизайн-система' }, text: { en: 'Tokens, components and states first - so the code later matches 1:1.', ru: 'Сначала токены, компоненты и состояния - чтобы потом код совпал 1:1.' } },
  { title: { en: 'Build & ship', ru: 'Сборка и запуск' }, text: { en: 'I build the frontend myself - and the backend too, when it’s a whole product.', ru: 'Фронтенд собираю сам - и бэкенд тоже, если это продукт целиком.' } },
] as { title: L; text: L }[];

export const services = [
  {
    key: 'design',
    title: { en: 'Design', ru: 'Дизайн' },
    text: { en: 'UI/UX in Figma: flows, screens, prototypes and a design system your devs can use.', ru: 'UI/UX в Figma: сценарии, экраны, прототипы и дизайн-система, с которой удобно разработчикам.' },
    tags: ['Research', 'Flows', 'UI', 'Design system'],
  },
  {
    key: 'frontend',
    title: { en: 'Frontend', ru: 'Фронтенд' },
    text: { en: 'I turn your designs into a fast, responsive interface - pixel-accurate and accessible.', ru: 'Превращаю макеты в быстрый адаптивный интерфейс - точно по пикселям и доступный.' },
    tags: ['HTML/CSS', 'TypeScript', 'Astro', 'Responsive'],
  },
  {
    key: 'full',
    best: true,
    title: { en: 'Full project', ru: 'Проект целиком' },
    text: { en: 'Design, frontend and backend from one person: no handoff losses, one owner for the whole product.', ru: 'Дизайн, фронтенд и бэкенд от одного человека: ничего не теряется при передаче, один ответственный за весь продукт.' },
    tags: ['Design', 'Frontend', 'Backend', 'Deploy'],
  },
] as { key: string; best?: boolean; title: L; text: L; tags: string[] }[];

/* ---------------- Цены и условия (блок «What I do & prices») ---------------- */
// from - крупная цена, range - вилка и обычный срок под ней
export type PriceRow = { key: string; title: L; note: L; from: string; range: L };
export const pricing = {
  hourly: '$25–35',
  rows: [
    { key: 'landing-design', title: { en: 'Landing page design', ru: 'Дизайн лендинга' }, note: { en: 'One page, desktop + mobile, in Figma', ru: 'Одна страница, десктоп + телефон, в Figma' }, from: '$200', range: { en: '$200–450 · 1–2 weeks', ru: '$200–450 · 1–2 недели' } },
    { key: 'landing', title: { en: 'Landing page, turnkey', ru: 'Лендинг под ключ' }, note: { en: 'User flow, design, code and launch', ru: 'Юзерфлоу, дизайн, вёрстка и запуск' }, from: '$500', range: { en: '$500–900 · 3–4 weeks', ru: '$500–900 · 3–4 недели' } },
    { key: 'website', title: { en: 'Website, 3–7 pages', ru: 'Сайт на 3–7 страниц' }, note: { en: 'User flows, design, frontend, backend when needed', ru: 'Юзерфлоу, дизайн, фронтенд, бэкенд если нужен' }, from: '$1,000', range: { en: '$1,000–2,200 · 5–8 weeks', ru: '$1 000–2 200 · 5–8 недель' } },
    { key: 'screens', title: { en: 'App or web service screens', ru: 'Экраны приложения или сервиса' }, note: { en: 'Per screen, in Figma, user flows included', ru: 'За экран, в Figma, юзерфлоу включены' }, from: '$35', range: { en: '$35–80 / screen · 5–8 a week', ru: '$35–80 за экран · 5–8 в неделю' } },
    { key: 'uikit', title: { en: 'UI kit / design system', ru: 'UI-кит / дизайн-система' }, note: { en: 'Colors, type, buttons, forms, variants', ru: 'Цвета, шрифты, кнопки, формы, варианты' }, from: '$350', range: { en: '$350–800 · 2–4 weeks', ru: '$350–800 · 2–4 недели' } },
    { key: 'frontend', title: { en: 'Frontend from your Figma', ru: 'Вёрстка по вашему макету' }, note: { en: 'Per page, responsive', ru: 'За страницу, адаптивно' }, from: '$100', range: { en: '$100–250 / page · ~1 week per 1–2', ru: '$100–250 за страницу · ~неделя на 1–2' } },
    { key: 'cms', title: { en: 'Webflow or WordPress', ru: 'Webflow или WordPress' }, note: { en: 'User flow and design included. New sites, or existing ones with a clear structure', ru: 'Юзерфлоу и дизайн включены. Новые сайты или готовые с понятной структурой' }, from: '$500', range: { en: '$500–1,200 · 3–5 weeks', ru: '$500–1 200 · 3–5 недель' } },
    { key: 'hourly', title: { en: 'Hourly work', ru: 'Почасовая работа' }, note: { en: 'Design or frontend, when the scope is open', ru: 'Дизайн или фронтенд, когда объём не определён' }, from: '$25–35', range: { en: 'per hour', ru: 'в час' } },
    { key: 'changes', title: { en: 'Changes and fixes', ru: 'Изменения и правки' }, note: { en: 'My work after the included revisions, or a site I’ve taken over', ru: 'Мои работы после включённых правок или сайт, который я принял' }, from: '$20', range: { en: 'per hour', ru: 'в час' } },
  ] as PriceRow[],
  /** «Не беру». title - жирное начало, note - пояснение после тире (необязательно) */
  notForMe: [
    { title: { en: 'Backend-only work', ru: 'Только бэкенд' }, note: { en: 'backend comes as part of a whole project', ru: 'бэкенд делаю в составе проекта целиком' } },
    { title: { en: 'Messy legacy sites', ru: 'Запутанные чужие сайты' }, note: { en: 'I take over other sites only with a clear structure and a design I can build on', ru: 'чужой сайт беру, только если там понятная структура и дизайн, с которым можно работать дальше' } },
    { title: { en: 'NSFW and gambling', ru: 'NSFW и азартные игры' } },
    { title: { en: 'Crypto token launches, presales and NFT mints', ru: 'Запуски токенов, пресейлы и NFT-минты' } },
    { title: { en: 'Logos and brand identity', ru: 'Логотипы и фирменный стиль' }, note: { en: 'I pick fonts and colors for the interface, but don’t create a brand from scratch', ru: 'шрифты и цвета для интерфейса подбираю, но бренд с нуля не создаю' } },
    { title: { en: 'Native iOS / Android apps', ru: 'Нативные приложения iOS / Android' } },
    { title: { en: 'Telegram bots', ru: 'Telegram-боты' } },
    { title: { en: 'SEO, ads, social media', ru: 'SEO, реклама, соцсети' } },
    { title: 'Tilda' },
  ] as { title: L; note?: L }[],
  howItWorks: [
    { en: '30–50% upfront, the rest by milestones', ru: '30–50% предоплата, остальное по этапам' },
    { en: 'While the design is in Figma, big changes within the agreed scope are free - that’s what this stage is for', ru: 'Пока дизайн в Figma, крупные изменения в рамках согласованного объёма бесплатны - этот этап для того и нужен' },
    { en: 'Once the prototype is approved, 3 rounds of small and medium edits are included. Big changes get a new estimate, extra rounds from $20/h', ru: 'После утверждения прототипа включены 3 круга мелких и средних правок. Крупные изменения - новая оценка, дополнительные круги от $20/ч' },
    { en: 'Other people’s sites - after a quick look at the code and design, so I can say honestly if I can build on it', ru: 'Чужие сайты - после быстрого просмотра кода и дизайна, чтобы честно сказать, смогу ли с ними работать' },
    { en: 'Source files and rights after full payment', ru: 'Исходники и права - после полной оплаты' },
    { en: 'I reply within 24 hours whenever I can', ru: 'Отвечаю в течение 24 часов, когда могу' },
    { en: 'Rush jobs are possible at 2–3× the usual rate', ru: 'Срочные заказы - по ставке ×2–3' },
    { en: 'Web3 only with established companies, paid in USD - never in tokens', ru: 'Web3 - только с состоявшимися компаниями и оплатой в USD, не токенами' },
  ] as L[],
};

/* ---------------- Подборщик «Not sure what you need?» ---------------- */
export const finder = {
  questions: [
    { key: 'design', q: { en: 'Do you have a design?', ru: 'Есть ли у вас дизайн?' }, options: [
      { v: 'figma', l: { en: 'Yes, in Figma', ru: 'Да, в Figma' } },
      { v: 'sketch', l: { en: 'Just a sketch', ru: 'Только набросок' } },
      { v: 'none', l: { en: 'No design yet', ru: 'Дизайна нет' } },
    ] },
    { key: 'need', q: { en: 'What do you need?', ru: 'Что нужно?' }, options: [
      { v: 'one', l: { en: 'One page', ru: 'Одна страница' } },
      { v: 'site', l: { en: 'Site, several pages', ru: 'Сайт на несколько страниц' } },
      { v: 'app', l: { en: 'App or web service', ru: 'Приложение или сервис' } },
    ] },
    { key: 'edit', q: { en: 'Who will update the texts?', ru: 'Кто будет обновлять тексты?' }, options: [
      { v: 'self', l: { en: 'I will', ru: 'Я сам' } },
      { v: 'dev', l: { en: 'A developer', ru: 'Разработчик' } },
    ] },
    { key: 'when', q: { en: 'How soon do you need it?', ru: 'Как быстро нужно?' }, options: [
      { v: 'flex', l: { en: 'Flexible', ru: 'Без спешки' } },
      { v: 'date', l: { en: 'By a date', ru: 'К определённой дате' } },
      { v: 'rush', l: { en: 'Rush · faster than usual · 2–3× rate', ru: 'Срочно · быстрее обычного · ставка ×2–3' } },
    ] },
  ],
  /** Первый вариант в каждом вопросе, который выбран при загрузке */
  defaults: { design: 'none', need: 'one', edit: 'self', when: 'flex' } as Record<string, string>,
  results: {
    frontend: {
      title: { en: 'Frontend from your Figma', ru: 'Вёрстка по вашему макету' },
      why: { en: 'You already have the design - I turn it into a fast, responsive site that matches it 1:1.', ru: 'Дизайн уже есть - я превращаю его в быстрый адаптивный сайт, один в один с макетом.' },
      from: '$100', range: { en: '$100–250 / page · ~1 week per 1–2 pages', ru: '$100–250 за страницу · ~неделя на 1–2 страницы' },
      includes: [{ en: 'Desktop, tablet and mobile', ru: 'Десктоп, планшет и телефон' }, { en: 'Animations and states from the design', ru: 'Анимации и состояния из макета' }, { en: 'Launch on your hosting or mine', ru: 'Запуск на вашем хостинге или моём' }],
    },
    screens: {
      title: { en: 'App or web service screens', ru: 'Экраны приложения или сервиса' },
      why: { en: 'For an app, it’s best to start with flows and screens in Figma - then any developer can build it.', ru: 'Приложение лучше начинать со сценариев и экранов в Figma - потом его соберёт любой разработчик.' },
      from: '$35', range: { en: '$35–80 / screen · 5–8 screens a week', ru: '$35–80 за экран · 5–8 экранов в неделю' },
      includes: [{ en: 'User flows and all states', ru: 'Юзерфлоу и все состояния' }, { en: 'Components your devs can reuse', ru: 'Компоненты для разработчиков' }, { en: 'Clickable prototype', ru: 'Кликабельный прототип' }],
    },
    'landing-cms': {
      title: { en: 'Landing page, turnkey on Webflow', ru: 'Лендинг под ключ на Webflow' },
      why: { en: 'I design it in Figma, build it in Webflow and launch it. You change texts and photos yourself in the Webflow Editor - no developer needed.', ru: 'Рисую в Figma, собираю в Webflow и запускаю. Тексты и фото вы меняете сами в Webflow Editor - без разработчика.' },
      from: '$500', range: { en: '$500–900 · usually 3–4 weeks', ru: '$500–900 · обычно 3–4 недели' },
      includes: [{ en: 'User flow and page structure', ru: 'Юзерфлоу и структура страницы' }, { en: 'Design for desktop and mobile', ru: 'Дизайн для десктопа и телефона' }, { en: 'Webflow build, animations, CMS if needed', ru: 'Сборка в Webflow, анимации, CMS если нужна' }, { en: '3 rounds of edits after the prototype', ru: '3 круга правок после прототипа' }],
    },
    landing: {
      title: { en: 'Landing page, turnkey', ru: 'Лендинг под ключ' },
      why: { en: 'Design and hand-written code: fast, light and easy for your developer to extend later.', ru: 'Дизайн и код вручную: быстро, легко и удобно для вашего разработчика потом.' },
      from: '$500', range: { en: '$500–900 · usually 3–4 weeks', ru: '$500–900 · обычно 3–4 недели' },
      includes: [{ en: 'User flow and page structure', ru: 'Юзерфлоу и структура страницы' }, { en: 'Design for desktop and mobile', ru: 'Дизайн для десктопа и телефона' }, { en: 'Clean code and launch', ru: 'Чистый код и запуск' }, { en: '3 rounds of edits after the prototype', ru: '3 круга правок после прототипа' }],
    },
    'site-cms': {
      title: { en: 'Website on Webflow or WordPress', ru: 'Сайт на Webflow или WordPress' },
      why: { en: 'Several pages you can edit yourself: blog, catalog or news through the CMS.', ru: 'Несколько страниц, которые вы правите сами: блог, каталог или новости через CMS.' },
      from: '$1,000', range: { en: '$1,000–2,200 · usually 5–8 weeks', ru: '$1 000–2 200 · обычно 5–8 недель' },
      includes: [{ en: 'User flows and site map', ru: 'Юзерфлоу и карта сайта' }, { en: 'Design system and all pages', ru: 'Дизайн-система и все страницы' }, { en: 'CMS set up for your content', ru: 'CMS под ваш контент' }, { en: 'A short guide on editing', ru: 'Короткая инструкция по редактированию' }],
    },
    website: {
      title: { en: 'Website, 3–7 pages', ru: 'Сайт на 3–7 страниц' },
      why: { en: 'The whole site from one person: design, frontend and backend when it needs one.', ru: 'Весь сайт от одного человека: дизайн, фронтенд и бэкенд, если он нужен.' },
      from: '$1,000', range: { en: '$1,000–2,200 · usually 5–8 weeks', ru: '$1 000–2 200 · обычно 5–8 недель' },
      includes: [{ en: 'User flows and site map', ru: 'Юзерфлоу и карта сайта' }, { en: 'Design system and all pages', ru: 'Дизайн-система и все страницы' }, { en: 'Frontend, backend if needed, launch', ru: 'Фронтенд, бэкенд если нужен, запуск' }, { en: '3 rounds of edits after the prototype', ru: '3 круга правок после прототипа' }],
    },
  } as Record<string, { title: L; why: L; from: string; range: L; includes: L[] }>,
  /** Подпись по сроку */
  when: {
    date: { en: 'Tell me the date - I’ll confirm if it fits', ru: 'Напишите дату - скажу, успеваю ли' },
    rush: { en: 'Rush: the price ×2–3, the timeline about half', ru: 'Срочно: цена ×2–3, срок примерно вдвое короче' },
  } as Record<string, L>,
};

export const projects: Project[] = [
  {
    slug: 'murkas-net',
    title: 'murkas.net',
    short: { en: 'Personal site with a Material 3 design system, moderated photo gallery and a Telegram bot.', ru: 'Личный сайт с дизайн-системой на Material 3, модерируемой галереей и Telegram-ботом.' },
    description: {
      en: 'A personal site for my fursona: a Material 3 design system, a moderated photo gallery and a Telegram bot that runs it all - from events to the "now" status.',
      ru: 'Личный сайт моей фурсоны: дизайн-система на Material 3, модерируемая галерея и Telegram-бот, который управляет всем - от ивентов до статуса «сейчас».',
    },
    when: { en: 'Nov 2026 - now', ru: 'ноябрь 2026 - сейчас' },
    sort: '2026-11',
    year: '2026',
    roles: ['design', 'frontend', 'backend', 'full'],
    roleText: { en: 'Solo: design & development', ru: 'Один: дизайн и разработка' },
    stackShort: 'Astro · Cloudflare · TS',
    tags: ['Figma', 'Material 3', 'Design system', 'Astro', 'TypeScript', 'SSR', 'Cloudflare Workers', 'D1 (SQLite)', 'R2', 'KV', 'Telegram Bot API', 'i18n RU/EN', 'Image resizing', 'Turnstile'],
    metrics: [
      { value: '10k+', label: { en: 'lines of code', ru: 'строк кода' } },
      { value: '7', label: { en: 'pages', ru: 'страниц' } },
      { value: '16', label: { en: 'bot commands', ru: 'команд бота' } },
      { value: '2', label: { en: 'languages', ru: 'языка' } },
    ],
    live: 'https://murkas.net',
    featured: true,
    mainPhotos: 3,
    photos: [
      { src: '/portfolio/murkas-net/home.webp', title: { en: 'Home', ru: 'Главная' }, caption: { en: 'Hero card, "my vibe now" player with my own tracks, live status with weather.', ru: 'Карточка-приветствие, плеер «мой вайб сейчас» со своими треками, живой статус с погодой.' }, made: 'Nov 2026' },
      { src: '/portfolio/murkas-net/events.webp', title: { en: 'Where to meet me', ru: 'Где встретить' }, caption: { en: 'Events calendar the bot keeps up to date.', ru: 'Календарь ивентов, который обновляет бот.' }, made: 'Nov 2026' },
      { src: '/portfolio/murkas-net/home-light.webp', title: { en: 'Light theme', ru: 'Светлая тема' }, caption: { en: 'Same tokens, light mode.', ru: 'Те же токены, светлый режим.' }, made: 'Nov 2026' },
      { src: '/portfolio/murkas-net/mobile.webp', title: { en: 'On a phone', ru: 'На телефоне' }, made: 'Nov 2026' },
    ],
    problem: {
      en: 'I wanted one place for my fursona: who I am, where to meet me, photos from cons. Photos come from other people, so I needed a way to accept uploads safely and approve them without opening an admin panel.',
      ru: 'Хотелось одно место для моей фурсоны: кто я, где меня встретить, фото с конвентов. Фото присылают другие люди, поэтому нужен был способ безопасно принимать загрузки и одобрять их без админки.',
    },
    did: [
      { title: { en: 'Design system', ru: 'Дизайн-система' }, text: { en: 'Built a Material 3 kit in Figma: tokens, components, light and dark themes.', ru: 'Собрал M3-кит в Figma: токены, компоненты, светлая и тёмная темы.' } },
      { title: { en: 'Frontend', ru: 'Фронтенд' }, text: { en: 'Astro SSR pages, bilingual RU/EN, custom player, gallery with filters.', ru: 'SSR-страницы на Astro, RU/EN, свой плеер, галерея с фильтрами.' } },
      { title: { en: 'Backend', ru: 'Бэкенд' }, text: { en: 'Cloudflare Workers, D1 database, R2 storage, image resizing on the edge.', ru: 'Cloudflare Workers, база D1, хранилище R2, ресайз картинок на edge.' } },
      { title: { en: 'Telegram bot', ru: 'Telegram-бот' }, text: { en: 'Moderation, events, live status and site settings - all from a chat.', ru: 'Модерация, ивенты, живой статус и настройки сайта - всё из чата.' } },
    ],
    process: {
      intro: { en: 'From flows to a component library to code that matches it 1:1.', ru: 'От сценариев к библиотеке компонентов и к коду, который совпадает с ней 1:1.' },
      steps: [
        { caption: { en: 'User flow', ru: 'Сценарии' } },
        { caption: { en: 'Design system', ru: 'Дизайн-система' } },
        { caption: { en: 'Bot moderation', ru: 'Модерация в боте' } },
      ],
    },
    result: [
      { title: { en: 'Live', ru: 'Работает' }, text: { en: 'murkas.net works in RU and EN', ru: 'murkas.net работает на RU и EN' } },
      { title: { en: 'No admin panel', ru: 'Без админки' }, text: { en: 'everything runs from Telegram', ru: 'всё управляется из Telegram' } },
      { title: { en: 'Edge-only', ru: 'Только edge' }, text: { en: 'no server to maintain', ru: 'никакого сервера на поддержке' } },
    ],
  },
  {
    slug: 'unimice-id',
    title: 'UNIMICE ID',
    short: { en: 'Single sign-on for the UniMice project: sign-in, sign-up and account flows.', ru: 'Единый вход для проекта UniMice: вход, регистрация и управление аккаунтом.' },
    description: {
      en: 'UI/UX for UNIMICE ID - one account for every UniMice service: sign-in, sign-up, recovery and account settings.',
      ru: 'UI/UX для UNIMICE ID - один аккаунт для всех сервисов UniMice: вход, регистрация, восстановление и настройки аккаунта.',
    },
    when: '2025',
    sort: '2025-01',
    year: '2025',
    roles: ['design'],
    roleText: { en: 'UI/UX designer', ru: 'UI/UX-дизайнер' },
    stackShort: 'Figma',
    tags: ['UI/UX', 'Figma', 'Design system', 'User flows', 'Prototyping'],
    featured: true,
    photos: [{}, {}, {}],
    problem: {
      en: 'UniMice has several services, and each had its own login. The team asked for one account and one clear set of flows for all of them.',
      ru: 'У UniMice несколько сервисов, и в каждом был свой вход. Команда попросила один аккаунт и понятные сценарии для всех.',
    },
    did: [
      { title: { en: 'User flows', ru: 'Сценарии' }, text: { en: 'Sign-in, sign-up, password recovery and linking services.', ru: 'Вход, регистрация, восстановление пароля и подключение сервисов.' } },
      { title: { en: 'UI', ru: 'Интерфейс' }, text: { en: 'Screens and states for web, including errors and empty states.', ru: 'Экраны и состояния для веба, включая ошибки и пустые состояния.' } },
      { title: { en: 'Design system', ru: 'Дизайн-система' }, text: { en: 'Components the developers can reuse across services.', ru: 'Компоненты, которые разработчики переиспользуют во всех сервисах.' } },
    ],
  },
  {
    slug: 'telegram-ai-bot',
    title: 'Telegram AI bot',
    short: { en: 'Replies to my Telegram Business chats in my own style.', ru: 'Отвечает в моих чатах Telegram Business в моём стиле.' },
    description: {
      en: 'An auto-reply bot for Telegram Business: it answers my chats in my own style while I’m busy.',
      ru: 'Бот-автоответчик для Telegram Business: отвечает в моих чатах в моём стиле, пока я занят.',
    },
    when: '2026',
    sort: '2026-10',
    year: '2026',
    roles: ['dev'],
    roleText: { en: 'Solo: development', ru: 'Один: разработка' },
    stackShort: 'Python · DeepSeek',
    tags: ['Python', 'DeepSeek', 'Telegram API'],
    live: 'https://t.me/murkasanswerbot',
    featured: true,
    photos: [{}, {}],
    problem: {
      en: 'People write to me when I can’t answer. I wanted replies that sound like me, not like a generic bot.',
      ru: 'Мне пишут, когда я не могу ответить. Хотелось, чтобы ответы звучали как я, а не как обычный бот.',
    },
  },
  {
    slug: 'protogen-helmet',
    title: 'Protogen helmet',
    short: { en: 'LED face for a friend’s fursuit, with switchable expressions.', ru: 'LED-лицо для фурсьюта друга с переключаемыми эмоциями.' },
    description: {
      en: 'An LED face for a friend’s protogen fursuit on ESP32: switchable expressions and custom firmware.',
      ru: 'LED-лицо для фурсьюта-протогена друга на ESP32: переключаемые эмоции и своя прошивка.',
    },
    when: '2026',
    sort: '2026-10',
    year: '2026',
    roles: ['hardware'],
    roleText: { en: 'Hardware & firmware', ru: 'Железо и прошивка' },
    stackShort: 'ESP32 · C++',
    tags: ['ESP32', 'C++', 'PlatformIO', 'ProtoESP'],
    featured: true,
    photos: [{}, {}],
  },
];
