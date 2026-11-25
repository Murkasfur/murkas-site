// Шаг 1 загрузки: POST /api/upload/batch
// { kind, files, token (Turnstile), meta } -> { batchId }
import type { APIRoute } from 'astro';
import { LIMITS, shortId, type Kind } from '../../../lib/media-core';
import { ENV, ipHash, verifyTurnstile, validateMeta, checkQuota, readJson, fail, UploadError } from '../../../lib/upload';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJson(request);
    const kind = body.kind as Kind;
    const files = Number(body.files);
    if (kind !== 'photo' && kind !== 'art') throw new UploadError(400, 'bad_kind');
    if (!Number.isInteger(files) || files < 1 || files > LIMITS.perBatch) throw new UploadError(400, 'too_many');

    const meta = await validateMeta(kind, (body.meta ?? {}) as Record<string, unknown>);
    await verifyTurnstile(String(body.token ?? ''), request);
    const ip = await ipHash(request);
    await checkQuota(ip, files);

    const id = shortId(12);
    await ENV.DB.prepare(`INSERT INTO upload_batches (id, kind, expected, meta, ip_hash) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, kind, files, JSON.stringify(meta), ip)
      .run();
    return Response.json({ ok: true, batchId: id });
  } catch (e) {
    return fail(e);
  }
};
