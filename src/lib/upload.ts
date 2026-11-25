// Серверная часть загрузок (только сайт).
import { env } from 'cloudflare:workers';
import { getSettings } from './settings';
import { LIMITS, CHARACTERS, PHOTO_CATEGORIES, ART_TYPES, isHttps, storageUsed, type Kind, type BatchMeta } from './media-core';

type Env = typeof env & { TURNSTILE_SECRET?: string; BOT?: { notifyBatch(id: string): Promise<void> } };
export const ENV = env as Env;

export class UploadError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

/** IP не храним как есть - только хэш (хватает для лимита) */
export async function ipHash(req: Request) {
  const ip = req.headers.get('cf-connecting-ip') ?? 'local';
  const data = new TextEncoder().encode(`murkas:${ip}:${ENV.TURNSTILE_SECRET ?? ''}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyTurnstile(token: string, req: Request) {
  if (!ENV.TURNSTILE_SECRET) throw new UploadError(503, 'not_configured');
  const form = new FormData();
  form.append('secret', ENV.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = req.headers.get('cf-connecting-ip');
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = (await res.json()) as { success: boolean };
  if (!data.success) throw new UploadError(403, 'captcha');
}

const str = (v: unknown, max: number) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || v.trim().length > max) throw new UploadError(400, 'bad_field');
  return v.trim();
};
const url = (v: unknown) => {
  const s = str(v, 500);
  if (s && !isHttps(s)) throw new UploadError(400, 'bad_url');
  return s;
};

/** Проверка полей формы. Тип и категорию модератор всё равно поставит сам - здесь только подсказка. */
export async function validateMeta(kind: Kind, raw: Record<string, unknown>): Promise<BatchMeta> {
  const m: BatchMeta = {
    personName: str(raw.personName, 80),
    personUrl: url(raw.personUrl),
    caption: str(raw.caption, 300),
  };
  if (kind === 'photo') {
    m.eventId = str(raw.eventId, 60);
    if (!m.eventId) throw new UploadError(400, 'no_event');
    const ev = await ENV.DB.prepare(`SELECT id FROM events WHERE id = ?`).bind(m.eventId).first();
    if (!ev) throw new UploadError(400, 'no_event');
  } else {
    if (!m.personName || !m.personUrl) throw new UploadError(400, 'no_artist');
    m.createdDate = str(raw.createdDate, 10);
    if (m.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(m.createdDate)) throw new UploadError(400, 'bad_field');
    m.character = str(raw.character, 10) as BatchMeta['character'];
    if (!m.character || !CHARACTERS.includes(m.character)) throw new UploadError(400, 'no_character');
    m.category = str(raw.category, 20);
    if (m.category && !(ART_TYPES as readonly string[]).includes(m.category)) m.category = null;
    m.originalUrl = url(raw.originalUrl);
  }
  if (kind === 'photo' && m.category && !(PHOTO_CATEGORIES as readonly string[]).includes(m.category)) m.category = null;
  return m;
}

/** Лимит в сутки с одного IP и место в R2 */
export async function checkQuota(ip: string, files: number) {
  const settings = await getSettings();
  const used = await ENV.DB.prepare(
    `SELECT count(*) AS n FROM media WHERE uploader_ip = ? AND uploaded_at > datetime('now', '-1 day')`,
  ).bind(ip).first<number>('n');
  if ((used ?? 0) + files > settings.uploadLimit) throw new UploadError(429, 'daily_limit');
  if ((await storageUsed(ENV.DB)) > LIMITS.storageBytes * LIMITS.storageStop) throw new UploadError(507, 'storage_full');
}

export async function readJson(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new UploadError(400, 'bad_json');
  }
}

export const fail = (e: unknown) => {
  if (e instanceof UploadError) return Response.json({ ok: false, error: e.code }, { status: e.status });
  console.error('upload failed', e);
  return Response.json({ ok: false, error: 'server' }, { status: 500 });
};
