// Доступ к данным портфолио и мелкие помощники для страниц.
//
// Сейчас данные берутся из src/data/portfolio.ts. Чтобы потом добавлять
// проекты через Telegram-бота, достаточно в getPortfolio() дочитать их
// из KV/D1 и смешать со списком из файла - страницы менять не придётся.
import * as data from '../data/portfolio';
import type { L, Project, Role } from '../data/portfolio';

export type Lang = 'en' | 'ru';
export type Portfolio = {
  profile: typeof data.profile;
  skills: typeof data.skills;
  learning: typeof data.learning;
  process: typeof data.process;
  services: typeof data.services;
  stackFilters: string[];
  projects: Project[];
};

export async function getPortfolio(): Promise<Portfolio> {
  const projects = [...data.projects].sort((a, b) => b.sort.localeCompare(a.sort));
  return {
    profile: data.profile,
    skills: data.skills,
    learning: data.learning,
    process: data.process,
    services: data.services,
    stackFilters: data.stackFilters,
    projects,
  };
}

/** Текст на нужном языке */
export const tx = (v: L | undefined, lang: Lang): string => (v == null ? '' : typeof v === 'string' ? v : v[lang] ?? v.en);

export const roleLabel: Record<Role, { en: string; ru: string }> = {
  design: { en: 'Design', ru: 'Дизайн' },
  frontend: { en: 'Frontend', ru: 'Фронтенд' },
  backend: { en: 'Backend', ru: 'Бэкенд' },
  full: { en: 'Full project', ru: 'Проект целиком' },
  dev: { en: 'Development', ru: 'Разработка' },
  hardware: { en: 'Hardware', ru: 'Железо' },
};

/** Роли, которые показываются чипами у проекта (full - это фильтр, а не роль) */
export const visibleRoles = (p: Project) => p.roles.filter((r) => r !== 'full');

/**
 * Ссылки внутри портфолио.
 * На portfolio.murkas.net страницы живут в корне (/, /projects, /murkas-net),
 * а на murkas.net - под /portfolio. base приходит из middleware.
 */
export function pfPath(base: string, lang: Lang, path = '') {
  const p = `${base}${path}` || '/';
  return lang === 'ru' ? (p === '/' ? '/ru' : `/ru${p}`) : p;
}

export const ui = {
  en: {
    about: 'About', skills: 'Skills', work: 'Work', process: 'Process', contact: 'Contact',
    inspect: 'Inspect', getInTouch: 'Get in touch', cv: 'Download CV',
    aboutTitle: 'About me',
    aboutP1: 'I’m Roma - a UI/UX designer from Moscow, now in Toronto. For three years I designed interfaces in Figma: apps, sites, design systems. At some point I got tired of handing designs off and watching them change in code - so I went to learn to build them myself.',
    aboutP2: 'Now I study Computer Programming at George Brown and work on projects where one person owns everything: research, flows, the design system, frontend, backend and deploy.',
    heroA: 'I design interfaces', heroB: 'and ship them myself.',
    heroSub: 'UI/UX designer & frontend developer. Hire me for the design, the frontend, or the whole project - backend included when the product needs it.',
    learning: 'Learning', showAll: 'Show all', moreInList: (n: number) => `+ ${n} more in the full list`,
    learningSub: 'Education, courses and certificates - newest first',
    lAll: 'All', lEdu: 'Education', lCourse: 'Courses', lCert: 'Certificates',
    kind: { education: 'Education', course: 'Course', certificate: 'Certificate' },
    skillsSub: 'Tap a skill to see how I use it · level shown where it matters',
    design: 'Design', development: 'Development',
    levels: { junior: 'Junior', middle: 'Middle', senior: 'Senior' },
    usedIn: 'Used in',
    selected: 'Selected work', selectedSub: 'Projects I designed and built end to end',
    allProjects: 'All projects', fullSize: 'View full size', projectPage: 'Project page', liveSite: 'Live site',
    howTitle: 'How I work', howSub: 'One person from the first sketch to production',
    withMe: 'Work with me', withMeSub: 'Pick what you need - I can join at any stage',
    perHour: '/ hour', rateNote: 'design, code or both', bestFit: 'Best fit',
    noBackend: 'Backend comes as part of a full project - I don’t take backend-only work.',
    talkA: 'Got a project?', talkB: 'Let’s talk.',
    talkSub: 'I reply within a day. Design, frontend or a full project - part-time or freelance.',
    email: 'Email', freelance: 'Freelance profile',
    footerAbout: 'UI/UX designer and frontend developer in Toronto. Design, code or both.',
    navigate: 'Navigate', more: 'More', copy: 'Copy', resume: 'Resume', fluffier: 'also me, but fluffier',
    toTop: 'Back to top ↑', made: 'Designed in Figma, built with Astro',
    copied: 'Email copied', openMail: 'Open mail',
    home: 'Home', allWork: 'All work', projectsCount: (n: number) => `${n} projects`,
    search: 'Search projects, tags or tools…', sort: 'Sort', newest: 'Newest', oldest: 'Oldest', az: 'A–Z',
    role: 'Role', stack: 'Stack', all: 'All', showing: (a: number, b: number) => `Showing ${a} of ${b}`,
    reset: 'Reset filters', nothing: 'Nothing found. Try another word or reset the filters.',
    roleL: 'Role', when: 'When', stackL: 'Stack', main: 'main', morePhotos: 'More', photosN: (n: number) => `${n} photos`,
    openAll: 'Open all', galleryHint: (n: number) => `First ${n} are the main shots - keep scrolling to see every photo of the project`,
    problem: 'The problem', did: 'What I did', processL: 'Process', result: 'Result', moreProjects: 'More projects',
    openFigma: 'Open in Figma', madeL: 'Made', browse: '← → to browse · Esc to close',
    cmdHint: 'Type a command or search…', cmdProjects: 'Projects', cmdActions: 'Actions', cmdSections: 'Sections',
    copyEmail: 'Copy email', switchTheme: 'Switch theme', switchLang: 'Русская версия', openFursona: 'Open murkas.net',
    themes: { watermelon: 'Watermelon', redpanda: 'Red panda', light: 'Light' },
    inspectOn: 'Dev Mode on - click any layer. Esc or I to exit.',
    insp: { title: 'Properties', hint: 'Click a layer · hover another to measure · Esc', exit: 'Exit', empty: 'Click any layer on the page to see its size, spacing, colors, type and CSS.', layout: 'Layout', fill: 'Fill', stroke: 'Stroke', type: 'Typography', code: 'Code · CSS', copy: 'Copy', copied: 'CSS copied', on: 'on' },
    figmaL: 'Figma', liveCode: 'Live code', dragHint: 'Drag to compare',
    vibe: 'My vibe now', tap: 'Tap',
    close: 'Close', prev: 'Previous', next: 'Next',
  },
  ru: {
    about: 'Обо мне', skills: 'Навыки', work: 'Работы', process: 'Процесс', contact: 'Связаться',
    inspect: 'Inspect', getInTouch: 'Написать мне', cv: 'Скачать CV',
    aboutTitle: 'Обо мне',
    aboutP1: 'Я Рома - UI/UX-дизайнер из Москвы, сейчас в Торонто. Три года я рисовал интерфейсы в Figma: приложения, сайты, дизайн-системы. В какой-то момент надоело отдавать макеты и смотреть, как они меняются в коде, - и я пошёл учиться делать их сам.',
    aboutP2: 'Сейчас учусь на Computer Programming в George Brown и делаю проекты, где один человек отвечает за всё: исследование, сценарии, дизайн-систему, фронтенд, бэкенд и деплой.',
    heroA: 'Я рисую интерфейсы', heroB: 'и сам их запускаю.',
    heroSub: 'UI/UX-дизайнер и фронтенд-разработчик. Можно позвать на дизайн, на фронтенд или на весь проект - с бэкендом, если он нужен продукту.',
    learning: 'Учёба', showAll: 'Показать всё', moreInList: (n: number) => `+ ещё ${n} в полном списке`,
    learningSub: 'Образование, курсы и сертификаты - сначала новые',
    lAll: 'Всё', lEdu: 'Образование', lCourse: 'Курсы', lCert: 'Сертификаты',
    kind: { education: 'Образование', course: 'Курс', certificate: 'Сертификат' },
    skillsSub: 'Нажми на навык, чтобы увидеть, как я его использую · уровень там, где это важно',
    design: 'Дизайн', development: 'Разработка',
    levels: { junior: 'Junior', middle: 'Middle', senior: 'Senior' },
    usedIn: 'Где использовал',
    selected: 'Избранные работы', selectedSub: 'Проекты, которые я спроектировал и сделал целиком',
    allProjects: 'Все проекты', fullSize: 'Открыть целиком', projectPage: 'О проекте', liveSite: 'Открыть сайт',
    howTitle: 'Как я работаю', howSub: 'Один человек от первого наброска до продакшена',
    withMe: 'Работа со мной', withMeSub: 'Выбери, что нужно, - могу подключиться на любом этапе',
    perHour: '/ час', rateNote: 'дизайн, код или всё вместе', bestFit: 'Лучше всего',
    noBackend: 'Бэкенд делаю только в составе проекта целиком - отдельно бэкенд не беру.',
    talkA: 'Есть проект?', talkB: 'Давай обсудим.',
    talkSub: 'Отвечаю в течение дня. Дизайн, фронтенд или проект целиком - part-time или фриланс.',
    email: 'Почта', freelance: 'Профиль фрилансера',
    footerAbout: 'UI/UX-дизайнер и фронтенд-разработчик в Торонто. Дизайн, код или всё вместе.',
    navigate: 'Разделы', more: 'Ещё', copy: 'Копировать', resume: 'Резюме', fluffier: 'тоже я, но пушистее',
    toTop: 'Наверх ↑', made: 'Нарисовано в Figma, собрано на Astro',
    copied: 'Почта скопирована', openMail: 'Открыть почту',
    home: 'Главная', allWork: 'Все работы', projectsCount: (n: number) => `${n} ${n === 1 ? 'проект' : n < 5 ? 'проекта' : 'проектов'}`,
    search: 'Поиск по проектам, тегам и инструментам…', sort: 'Сортировка', newest: 'Сначала новые', oldest: 'Сначала старые', az: 'А–Я',
    role: 'Роль', stack: 'Стек', all: 'Все', showing: (a: number, b: number) => `Показано ${a} из ${b}`,
    reset: 'Сбросить фильтры', nothing: 'Ничего не нашлось. Попробуй другое слово или сбрось фильтры.',
    roleL: 'Роль', when: 'Когда', stackL: 'Стек', main: 'главные', morePhotos: 'Ещё', photosN: (n: number) => `${n} фото`,
    openAll: 'Открыть все', galleryHint: (n: number) => `Первые ${n} - главные кадры, листай дальше, чтобы увидеть все фото проекта`,
    problem: 'Задача', did: 'Что я сделал', processL: 'Процесс', result: 'Результат', moreProjects: 'Другие проекты',
    openFigma: 'Открыть в Figma', madeL: 'Сделано', browse: '← → листать · Esc закрыть',
    cmdHint: 'Команда или поиск…', cmdProjects: 'Проекты', cmdActions: 'Действия', cmdSections: 'Разделы',
    copyEmail: 'Скопировать почту', switchTheme: 'Сменить тему', switchLang: 'English version', openFursona: 'Открыть murkas.net',
    themes: { watermelon: 'Арбуз', redpanda: 'Красная панда', light: 'Светлая' },
    inspectOn: 'Dev Mode - кликни по любому слою. Esc или I - выйти.',
    insp: { title: 'Свойства', hint: 'Клик - выделить · наведи на другой - расстояние · Esc', exit: 'Выйти', empty: 'Кликни по любому слою на странице, чтобы увидеть размер, отступы, цвета, шрифт и CSS.', layout: 'Layout', fill: 'Fill', stroke: 'Stroke', type: 'Typography', code: 'Code · CSS', copy: 'Copy', copied: 'CSS скопирован', on: 'on' },
    figmaL: 'Figma', liveCode: 'Живой код', dragHint: 'Потяни, чтобы сравнить',
    vibe: 'Мой вайб сейчас', tap: 'Нажми',
    close: 'Закрыть', prev: 'Назад', next: 'Дальше',
  },
};
export type UI = (typeof ui)['en'];
