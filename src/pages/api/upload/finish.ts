// Шаг 3: POST /api/upload/finish { batchId } -> заявка уходит модератору в бота
import type { APIRoute } from 'astro';
import { ENV, ipHash, readJson, fail, UploadError } from '../../../lib/upload';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { batchId } = await readJson(request);
    const b = await ENV.DB.prepare(`SELECT id, status, ip_hash FROM upload_batches WHERE id = ?`).bind(String(batchId)).first<{ id: string; status: string; ip_hash: string }>();
    if (!b || b.ip_hash !== (await ipHash(request))) throw new UploadError(404, 'no_batch');
    if (b.status !== 'uploading') return Response.json({ ok: true, received: 0 });

    const r = await ENV.DB.batch([
      ENV.DB.prepare(`UPDATE media SET status = 'pending' WHERE batch_id = ? AND status = 'uploading'`).bind(b.id),
      ENV.DB.prepare(`SELECT count(*) AS n FROM media WHERE batch_id = ?`).bind(b.id),
    ]);
    const received = (r[1].results[0] as { n: number }).n;
    await ENV.DB.prepare(`UPDATE upload_batches SET status = ?, finished_at = datetime('now') WHERE id = ?`)
      .bind(received ? 'pending' : 'done', b.id)
      .run();

    if (received) {
      // Не дождались бота - не страшно: заявка в базе, её видно в /pending
      try {
        await ENV.BOT?.notifyBatch(b.id);
      } catch (e) {
        console.error('notifyBatch failed', e);
      }
    }
    return Response.json({ ok: true, received, ref: b.id.slice(0, 6).toUpperCase() });
  } catch (e) {
    return fail(e);
  }
};
