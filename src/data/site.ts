// Общие настройки сайта. maintenance, статусы страниц и «Сейчас» здесь -
// только значения по умолчанию: живые лежат в Cloudflare KV и меняются
// ботом (/maintenance, /page, /now). См. src/lib/settings-core.ts

export const site = {
  /** true = весь сайт показывает заглушку «Сайт ненадолго закрыт» */
  maintenance: false,
  version: '0.1.0',
  email: 'furry@murkas.net',
  /** Статус в карточке «Сейчас» по умолчанию. Живой меняется ботом: /now */
  now: { ru: 'Отдыхаю', en: 'Chilling' },
};

export type PageKey = 'home' | 'characters' | 'fursuits' | 'events' | 'photos' | 'arts' | 'portfolio';
export type PageStatus = 'live' | 'wip';

/** Порядок = порядок в навбаре. `wip` = страница показывает заглушку «Страница ещё в работе». */
export const pages: { key: PageKey; path: string; status: PageStatus }[] = [
  { key: 'home', path: '/', status: 'live' },
  { key: 'characters', path: '/characters', status: 'wip' },
  { key: 'fursuits', path: '/fursuits', status: 'wip' },
  { key: 'events', path: '/events', status: 'live' },
  { key: 'photos', path: '/photos', status: 'live' },
  { key: 'arts', path: '/arts', status: 'live' },
  { key: 'portfolio', path: '/portfolio', status: 'wip' },
];

export const pageStatus = (key: PageKey) => pages.find((p) => p.key === key)?.status ?? 'live';

// TODO: вписать настоящие ссылки
export const socials = [
  { key: 'telegram', label: 'Telegram', href: 'https://t.me/', handle: '@murkas' },
  { key: 'discord', label: 'Discord', href: 'https://discord.com/', handle: 'murkas' },
  { key: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/', handle: '@murkas' },
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/', handle: '@murkas' },
  { key: 'x', label: 'X', href: 'https://x.com/', handle: '@murkas' },
] as const;
