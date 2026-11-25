// Общие константы загрузок - их импортирует и сайт, и бот.

export const LIMITS = {
  /** Файлов в одной отправке формы */
  perBatch: 50,
  /** Файлов в сутки с одного IP по умолчанию (меняется в боте: /limit) */
  perDay: 300,
  /** Байт на файл */
  photoBytes: 10 * 1024 * 1024,
  artBytes: 20 * 1024 * 1024,
  /** Бесплатный объём R2 */
  storageBytes: 10 * 1024 ** 3,
  /** Выше этой доли новые загрузки не принимаются */
  storageStop: 0.9,
  /** Выше этой доли бот предупреждает */
  storageWarn: 0.8,
  /** Сколько живёт незавершённая пачка */
  batchTtlMs: 60 * 60 * 1000,
};

export const CHARACTERS = ['arbyss', 'murkas', 'both'] as const;
export const PHOTO_CATEGORIES = ['group', 'full', 'partial', 'walks', 'backstage', 'parties'] as const;
export const ART_TYPES = ['full', 'sketch', 'ref', 'stickers', 'comic', 'ych'] as const;
export const REJECT_REASONS = ['off_topic', 'quality', 'duplicate', 'not_theirs', 'other'] as const;

export type Kind = 'photo' | 'art';
export type BatchMeta = {
  eventId?: string | null;
  personName?: string | null;
  personUrl?: string | null;
  createdDate?: string | null;
  /** фото без ивента: когда снято */
  takenDate?: string | null;
  character?: (typeof CHARACTERS)[number] | null;
  category?: string | null;
  originalUrl?: string | null;
  caption?: string | null;
};

/** Тип файла по первым байтам (не по расширению и не по заголовку браузера) */
export function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { mime: 'image/gif', ext: 'gif' };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/** Аудио для «Мой вайб»: определяем формат по первым байтам, а не по имени файла */
export function sniffAudio(b: Uint8Array): { mime: string; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0)) return { mime: 'audio/mpeg', ext: 'mp3' };
  if (ascii(4, 8) === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a' };
  if (ascii(0, 4) === 'OggS') return { mime: 'audio/ogg', ext: 'ogg' };
  if (ascii(0, 4) === 'fLaC') return { mime: 'audio/flac', ext: 'flac' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { mime: 'audio/wav', ext: 'wav' };
  return null;
}
export const AUDIO_NAME = /^[a-z0-9]{6,20}\.(mp3|m4a|ogg|flac|wav)$/;

/** Короткий случайный id (base36), для R2-ключей и кнопок бота */
export const shortId = (len = 10) => {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => (x % 36).toString(36)).join('');
};

export const isHttps = (s: string) => {
  try {
    return new URL(s).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Сколько сейчас занято в R2 (по базе: всё, что не удалено) */
export async function storageUsed(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT coalesce(sum(bytes), 0) AS b FROM media WHERE status != 'deleted' AND r2_key IS NOT NULL`).first<number>('b');
  return r ?? 0;
}
