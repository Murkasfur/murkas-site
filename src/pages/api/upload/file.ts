// Шаг 2: PUT /api/upload/file?batch=<id>&i=<номер>  тело = сам файл
// Заголовки: x-sha256 (для поиска дублей), x-width, x-height, x-caption (encodeURIComponent)
import type { APIRoute } from 'astro';
import { LIMITS, sniff, shortId, type BatchMeta } from '../../../lib/media-core';
import { ENV, ipHash, fail, UploadError } from '../../../lib/upload';

export const prerender = false;

type Batch = { id: string; kind: 'photo' | 'art'; status: string; expected: number; meta: string; ip_hash: string; created_at: string };

export const PUT: APIRoute = async ({ request, url }) => {
  try {
    const batchId = url.searchParams.get('batch') ?? '';
    const pos = Number(url.searchParams.get('i'));
    const b = await ENV.DB.prepare(`SELECT * FROM upload_batches WHERE id = ?`).bind(batchId).first<Batch>();
    if (!b || b.status !== 'uploading') throw new UploadError(404, 'no_batch');
    if (Date.parse(b.created_at + 'Z') + LIMITS.batchTtlMs < Date.now()) throw new UploadError(410, 'expired');
    if (b.ip_hash !== (await ipHash(request))) throw new UploadError(403, 'no_batch');
    if (!Number.isInteger(pos) || pos < 0 || pos >= b.expected) throw new UploadError(400, 'bad_index');

    const max = b.kind === 'art' ? LIMITS.artBytes : LIMITS.photoBytes;
    if (Number(request.headers.get('content-length') ?? 0) > max) throw new UploadError(413, 'too_big');
    const buf = new Uint8Array(await request.arrayBuffer());
    if (!buf.length) throw new UploadError(400, 'empty');
    if (buf.length > max) throw new UploadError(413, 'too_big');
    const type = sniff(buf);
    if (!type) throw new UploadError(415, 'bad_type');

    // дубль: такой файл уже ждёт проверки, опубликован или отклонён (недогруженные прошлые попытки не считаются)
    const sha = (request.headers.get('x-sha256') ?? '').toLowerCase();
    if (/^[0-9a-f]{64}$/.test(sha)) {
      const dup = await ENV.DB.prepare(
        `SELECT id FROM media WHERE sha256 = ? AND (status IN ('pending', 'published', 'rejected') OR batch_id = ?) LIMIT 1`,
      ).bind(sha, b.id).first();
      if (dup) return Response.json({ ok: true, duplicate: true });
    }
    const posTaken = await ENV.DB.prepare(`SELECT id FROM media WHERE batch_id = ? AND position = ?`).bind(b.id, pos).first();
    if (posTaken) return Response.json({ ok: true, duplicate: true });

    const id = shortId(10);
    const key = `pending/${id}.${type.ext}`;
    await ENV.MEDIA.put(key, buf, { httpMetadata: { contentType: type.mime } });

    const meta = JSON.parse(b.meta) as BatchMeta;
    const num = (h: string) => {
      const n = Number(request.headers.get(h));
      return Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
    };
    let caption = meta.caption ?? null;
    try {
      const own = decodeURIComponent(request.headers.get('x-caption') ?? '').trim();
      if (own) caption = own.slice(0, 300);
    } catch {}

    // дата съёмки: из EXIF самого фото (x-taken), иначе - что указали в форме
    const exif = request.headers.get('x-taken') ?? '';
    const today = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const taken = b.kind === 'photo' ? ([exif, meta.takenDate ?? ''].find((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) ?? null) : null;

    await ENV.DB.prepare(
      `INSERT INTO media (id, kind, status, caption_ru, character, category, event_id, person_name, person_url,
         created_date, original_url, width, height, bytes, mime, sha256, r2_key, uploader_ip, batch_id, position, taken_date)
       VALUES (?, ?, 'uploading', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, b.kind, caption, meta.character ?? null, meta.category ?? null, meta.eventId ?? null, meta.personName ?? null,
        meta.personUrl ?? null, meta.createdDate ?? null, meta.originalUrl ?? null, num('x-width'), num('x-height'),
        buf.length, type.mime, /^[0-9a-f]{64}$/.test(sha) ? sha : null, key, b.ip_hash, b.id, pos, taken)
      .run();
    return Response.json({ ok: true, id });
  } catch (e) {
    return fail(e);
  }
};
