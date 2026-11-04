// Все тексты сайта на двух языках. Вёрстка общая, меняются только строки.
export const languages = { en: 'English', ru: 'Русский' } as const;
export type Lang = keyof typeof languages;

export const ui = {
  en: {
    'notFound.title': '404 — Murkas got lost',
    'notFound.text': "Murkas searched everywhere, but this page wasn't found :9",
    'notFound.home': 'Back to home',

    'admin.title': 'Theme playground',
    'admin.subtitle': 'Local admin page: switch the look of the whole site. Your choice is saved in this browser only.',
    'admin.character': 'Character',
    'admin.redpanda': 'Red panda',
    'admin.watermelon': 'Watermelon',
    'admin.mode': 'Mode',
    'admin.light': 'Light',
    'admin.dark': 'Dark',
    'admin.auto': 'Auto',
    'admin.language': 'Language',
    'admin.typography': 'Typography',
    'admin.buttons': 'Buttons',
    'admin.colors': 'Colors',
    'admin.colorsHint': 'Click a swatch to copy its HEX.',
    'admin.card': 'Card',
    'admin.cardTitle': 'Murkas the red panda',
    'admin.cardText': 'Designer, developer and a very fluffy tail. This is what a card looks like in the current theme.',
    'admin.pages': 'Pages',
    'admin.open404': 'Open 404 page',
    'admin.copied': 'Copied',
    'admin.sample': 'Murkas the red panda',
  },
  ru: {
    'notFound.title': '404 — Муркас потерялся',
    'notFound.text': 'Муркас обыскал всё, но такой страницы нет :9',
    'notFound.home': 'На главную',

    'admin.title': 'Песочница тем',
    'admin.subtitle': 'Локальная админка: переключай вид всего сайта. Выбор сохраняется только в этом браузере.',
    'admin.character': 'Персонаж',
    'admin.redpanda': 'Красная панда',
    'admin.watermelon': 'Арбуз',
    'admin.mode': 'Режим',
    'admin.light': 'Светлый',
    'admin.dark': 'Тёмный',
    'admin.auto': 'Авто',
    'admin.language': 'Язык',
    'admin.typography': 'Типографика',
    'admin.buttons': 'Кнопки',
    'admin.colors': 'Цвета',
    'admin.colorsHint': 'Нажми на цвет, чтобы скопировать HEX.',
    'admin.card': 'Карточка',
    'admin.cardTitle': 'Муркас, красная панда',
    'admin.cardText': 'Дизайнер, разработчик и очень пушистый хвост. Так выглядит карточка в текущей теме.',
    'admin.pages': 'Страницы',
    'admin.open404': 'Открыть страницу 404',
    'admin.copied': 'Скопировано',
    'admin.sample': 'Муркас, красная панда',
  },
} as const;

export type UiKey = keyof (typeof ui)['en'];

export function useTranslations(lang: Lang) {
  return (key: UiKey) => ui[lang][key] ?? ui.en[key];
}

/** Ссылка на ту же страницу на другом языке: /admin ↔ /ru/admin */
export function localizePath(path: string, lang: Lang) {
  const clean = path.replace(/^\/ru(?=\/|$)/, '') || '/';
  return lang === 'ru' ? (clean === '/' ? '/ru/' : `/ru${clean}`) : clean;
}
