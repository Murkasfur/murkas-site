// Генерирует db/seed.sql из временных данных src/data/mock.ts,
// чтобы в локальной (и при желании в боевой) базе сразу было что показать.
// Запуск: node scripts/make-seed.ts
import { writeFileSync } from 'node:fs';
import { events, photos, arts, type L } from '../src/data/mock.ts';

const q = (v: unknown) => (v === undefined || v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const ru = (v?: L) => (v === undefined ? undefined : typeof v === 'string' ? v : v.ru);
const en = (v?: L) => (v === undefined ? undefined : typeof v === 'string' ? undefined : v.en);
const slug = (name: string) => name.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');

const lines: string[] = ['-- Сгенерировано scripts/make-seed.ts. Не правь руками.', 'DELETE FROM media;', 'DELETE FROM events;', 'DELETE FROM people;'];

const people = new Map<string, { name: string; url?: string }>();
for (const p of photos) if (p.photographer) people.set(slug(p.photographer.name), p.photographer);
for (const a of arts) people.set(slug(a.artist.name), a.artist);
for (const [id, p] of people) lines.push(`INSERT INTO people (id, name, url) VALUES (${q(id)}, ${q(p.name)}, ${q(p.url)});`);

for (const e of events) {
  lines.push(
    `INSERT INTO events (id, title_ru, title_en, city_ru, city_en, start_date, end_date, approx_ru, approx_en, sort_key, status, kind, venue_ru, venue_en, suit) VALUES (${[
      e.id, ru(e.title), en(e.title), ru(e.city), en(e.city), e.start, e.end, ru(e.approx), en(e.approx), e.sortKey, e.status,
      e.kind, ru(e.venue), en(e.venue), e.suit,
    ].map(q).join(', ')});`,
  );
}

for (const p of photos) {
  lines.push(
    `INSERT INTO media (id, kind, status, title_ru, title_en, caption_ru, caption_en, character, category, event_id, person_id, taken_date, city_ru, city_en, pinned, width, height, published_at) VALUES (${[
      p.id, 'photo', 'published', ru(p.title), en(p.title), ru(p.caption), en(p.caption), p.character, p.category, p.eventId,
      p.photographer ? slug(p.photographer.name) : undefined, p.date, ru(p.city), en(p.city), p.pinned ? 1 : 0, 1000, Math.round(1000 * p.ratio), p.date,
    ].map(q).join(', ')});`,
  );
}

for (const a of arts) {
  lines.push(
    `INSERT INTO media (id, kind, status, title_ru, title_en, caption_ru, caption_en, character, category, person_id, created_date, original_url, pinned, width, height, published_at) VALUES (${[
      a.id, 'art', 'published', ru(a.title), en(a.title), ru(a.caption), en(a.caption), a.character, a.type, slug(a.artist.name),
      a.created, a.original, a.pinned ? 1 : 0, 1000, Math.round(1000 * a.ratio), a.uploaded ?? a.created,
    ].map(q).join(', ')});`,
  );
}

writeFileSync(new URL('../db/seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log(`db/seed.sql: ${events.length} ивентов, ${photos.length} фото, ${arts.length} артов, ${people.size} людей`);
