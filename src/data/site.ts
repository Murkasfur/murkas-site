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

// Соцсети. У Discord нет публичной ссылки по нику, поэтому там copy:
// по нажатию ник копируется в буфер (добавить в друзья можно только по нику)
export type Social = { key: string; label: string; handle: string; href?: string; copy?: string };
export const socials: Social[] = [
  { key: 'telegram', label: 'Telegram', href: 'https://t.me/Murkasfur', handle: '@Murkasfur' },
  { key: 'discord', label: 'Discord', copy: 'koshyara', handle: 'koshyara' },
  { key: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@murkasredpanda', handle: '@murkasredpanda' },
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@Koshyaraa', handle: '@Koshyaraa' },
  { key: 'x', label: 'X', href: 'https://x.com/Murkasfur', handle: '@Murkasfur' },
];
