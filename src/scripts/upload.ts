// Окно загрузки фото и арта (UploadTile.astro).
// 1. Файлы готовятся прямо в браузере:
//    фото - пересжимаются (длинная сторона 2560, или почти без сжатия в режиме «Полное качество»),
//    при этом пропадают EXIF и геоданные; арт - остаётся как есть, у JPEG вырезаются метаданные.
// 2. Отправка: /api/upload/batch (проверка Turnstile и лимитов) -> /api/upload/file на каждый файл -> /api/upload/finish.
// 3. Результат или ошибка - во всплывающем сообщении снизу.
import { openDialog, closeDialog, bindDialog } from './dialog';
import { showSnackbar } from './snackbar';

type Item = { id: number; file: File; blob?: Blob; w?: number; h?: number; sha?: string; caption: string; thumb?: string; busy: boolean };
type Turnstile = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
};

const MAX_FILES = 50;
const MB = 1024 * 1024;

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');

/** Вырезать из JPEG метаданные (EXIF/GPS, XMP, IPTC), не трогая сами пиксели */
function stripJpeg(buf: ArrayBuffer): Blob {
  const b = new Uint8Array(buf);
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    if (marker === 0xda) break; // дальше идут сами пиксели
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker !== 0xe1 && marker !== 0xed) parts.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  parts.push(b.subarray(i));
  return new Blob(parts as BlobPart[], { type: 'image/jpeg' });
}

const canvasBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('encode'))), 'image/jpeg', q));

async function reencode(file: Blob, maxSide: number, quality: number) {
  const bmp = await createImageBitmap(file); // поворот по EXIF применяется сам
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; // прозрачность у фото -> белый фон (JPEG)
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  let blob = await canvasBlob(c, quality);
  if (blob.size > 10 * MB) blob = await canvasBlob(c, 0.85);
  return { blob, w: c.width, h: c.height };
}

export function initUpload() {
  const dialog = document.getElementById('upload-dialog') as HTMLDialogElement | null;
  if (!dialog) return;
  const form = dialog.querySelector('form')!;
  const S = JSON.parse(dialog.dataset.strings ?? '{}') as Record<string, string>;
  const tr = (k: string, vars: Record<string, string | number> = {}) => (S[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''));
  const kind = dialog.dataset.kind as 'photo' | 'art';
  const lang = dialog.dataset.lang ?? 'ru';
  const [kb, mbU] = lang === 'ru' ? ['КБ', 'МБ'] : ['KB', 'MB'];
  const fmtSize = (b: number) => (b >= MB ? `${(b / MB).toFixed(b >= 10 * MB ? 0 : 1)} ${mbU}` : `${Math.max(1, Math.round(b / 1024))} ${kb}`);
  const $ = <T extends Element = HTMLElement>(sel: string) => dialog.querySelector<T>(sel)!;

  const input = $<HTMLInputElement>('[data-input]');
  const dropzone = $('[data-dropzone]');
  const picked = $('[data-picked]');
  const thumbs = $('[data-thumbs]');
  const full = dialog.querySelector<HTMLInputElement>('input[name="full"]');
  const submitBtn = $<HTMLButtonElement>('[data-submit]');
  const overlay = document.querySelector<HTMLElement>('.drop-overlay');

  let items: Item[] = [];
  let nextId = 1;
  let queue = Promise.resolve();
  let generation = 0;
  let captionEach = false;
  let sending = false;

  bindDialog(dialog);

  // ---------- файлы ----------

  async function prepare(it: Item, gen: number) {
    if (gen !== generation || !items.includes(it)) return;
    it.busy = true;
    render();
    try {
      const head = new Uint8Array(await it.file.slice(0, 12).arrayBuffer());
      const isJpeg = head[0] === 0xff && head[1] === 0xd8;
      const isPlain = isJpeg || (head[0] === 0x89 && head[1] === 0x50) || (head[0] === 0x47 && head[1] === 0x49) ||
        String.fromCharCode(...head.slice(8, 12)) === 'WEBP';
      if (kind === 'photo') {
        const r = await reencode(it.file, full?.checked ? 8192 : 2560, full?.checked ? 0.95 : 0.85);
        Object.assign(it, r);
      } else if (isPlain) {
        it.blob = isJpeg ? stripJpeg(await it.file.arrayBuffer()) : it.file;
        const bmp = await createImageBitmap(it.blob);
        [it.w, it.h] = [bmp.width, bmp.height];
        bmp.close();
      } else {
        Object.assign(it, await reencode(it.file, 8192, 0.95)); // HEIC и прочее -> JPEG
      }
      const limit = kind === 'art' ? 20 * MB : 10 * MB;
      if (it.blob!.size > limit) throw new Error('big');
      it.sha = hex(await crypto.subtle.digest('SHA-256', await it.blob!.arrayBuffer()));
      if (it.thumb) URL.revokeObjectURL(it.thumb);
      it.thumb = URL.createObjectURL(it.blob!);
    } catch (e) {
      remove(it);
      showSnackbar(tr((e as Error).message === 'big' ? 'up.err.big' : 'up.err.open', { name: it.file.name }), { error: true });
      return;
    } finally {
      it.busy = false;
    }
    if (gen === generation) render();
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) return;
    const room = MAX_FILES - items.length;
    if (files.length > room) showSnackbar(tr('up.err.tooMany'), { error: true });
    const gen = generation;
    for (const file of files.slice(0, Math.max(0, room))) {
      const it: Item = { id: nextId++, file, caption: '', busy: true };
      items.push(it);
      queue = queue.then(() => prepare(it, gen));
    }
    render();
  }

  function remove(it: Item) {
    items = items.filter((x) => x !== it);
    if (it.thumb) URL.revokeObjectURL(it.thumb);
    render();
  }

  function clearAll() {
    generation++;
    items.forEach((it) => it.thumb && URL.revokeObjectURL(it.thumb));
    items = [];
    render();
  }

  function reprocessAll() {
    const gen = ++generation;
    for (const it of items) {
      it.blob = undefined;
      it.busy = true;
      queue = queue.then(() => prepare(it, gen));
    }
    render();
  }

  function render() {
    picked.hidden = !items.length;
    dropzone.hidden = !!items.length;
    $('[data-count]').textContent = tr('up.picked', { n: items.length });
    const busy = items.some((x) => x.busy);
    const before = items.reduce((s, x) => s + x.file.size, 0);
    const after = items.reduce((s, x) => s + (x.blob?.size ?? 0), 0);
    $('[data-size]').textContent = busy
      ? tr('up.processing')
      : kind === 'photo' && after < before * 0.9
        ? tr('up.sizeCompressed', { a: fmtSize(before), b: fmtSize(after) })
        : tr('up.sizePlain', { a: fmtSize(after) });

    thumbs.classList.toggle('is-each', captionEach);
    thumbs.replaceChildren(
      ...items.map((it) => {
        const li = document.createElement('li');
        li.className = `thumb${it.busy ? ' is-busy' : ''}`;
        const img = document.createElement('img');
        img.alt = '';
        if (it.thumb) img.src = it.thumb;
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'thumb__x';
        x.setAttribute('aria-label', `${tr('up.clear')} ${it.file.name}`);
        x.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        x.addEventListener('click', () => remove(it));
        const cap = document.createElement('div');
        cap.className = 'thumb__caption';
        const ci = document.createElement('input');
        ci.maxLength = 300;
        ci.placeholder = tr('up.captionEachPh');
        ci.value = it.caption;
        ci.addEventListener('input', () => (it.caption = ci.value));
        cap.append(ci);
        li.append(img, x, cap);
        return li;
      }),
      ...(items.length < MAX_FILES
        ? [Object.assign(document.createElement('li'), {
            innerHTML: `<button type="button" class="thumb__add"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/></svg><span>${tr('up.more')}</span></button>`,
          })]
        : []),
    );
    thumbs.querySelector('.thumb__add')?.addEventListener('click', () => input.click());
  }

  input.addEventListener('change', () => {
    if (input.files) addFiles(input.files);
    input.value = '';
  });
  $('[data-clear]').addEventListener('click', clearAll);
  full?.addEventListener('change', reprocessAll);

  // ---------- чипы ----------

  dialog.querySelectorAll<HTMLButtonElement>('[data-unknown]').forEach((chip) => {
    const field = form.elements.namedItem(chip.dataset.unknown!) as HTMLInputElement;
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(on));
      field.disabled = on;
      if (on) field.value = '';
      field.closest('.field')?.classList.remove('is-invalid');
    });
  });
  dialog.querySelectorAll<HTMLElement>('[data-choice]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const chip = (e.target as Element).closest<HTMLButtonElement>('.chip');
      if (!chip) return;
      const on = chip.getAttribute('aria-pressed') !== 'true';
      row.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(on));
      row.closest('.field')?.classList.remove('is-invalid');
    });
  });
  const choice = (name: string) => dialog.querySelector<HTMLElement>(`[data-choice="${name}"] [aria-pressed="true"]`)?.dataset.value ?? null;
  dialog.querySelector('[data-caption-mode]')?.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest<HTMLButtonElement>('.chip');
    if (!chip) return;
    captionEach = chip.dataset.value === 'each';
    dialog.querySelectorAll('[data-caption-mode] .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    $('[data-caption-one]').hidden = captionEach;
    render();
  });
  form.addEventListener('input', (e) => (e.target as Element).closest('.field')?.classList.remove('is-invalid'));

  // ---------- Turnstile ----------

  let token: string | null = null;
  let widget: string | null = null;
  const ts = () => (window as unknown as { turnstile?: Turnstile }).turnstile;

  function loadTurnstile() {
    if (widget || !dialog!.dataset.sitekey) return;
    const start = () => {
      widget = ts()!.render($('[data-turnstile]'), {
        sitekey: dialog!.dataset.sitekey,
        appearance: 'interaction-only',
        language: lang,
        theme: document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light',
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(null),
        'error-callback': () => setToken(null),
      });
    };
    if (ts()) return start();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = start;
    document.head.append(s);
  }
  function setToken(t: string | null) {
    token = t;
    $('[data-captcha-ok]').hidden = !t;
    $('[data-captcha-wait]').hidden = !!t;
  }
  function resetTurnstile() {
    setToken(null);
    const t = ts();
    if (widget && t) t.reset(widget);
  }

  // ---------- проверка формы ----------

  function validate() {
    let ok = true;
    const bad = (name: string, msg: string) => {
      const f = dialog!.querySelector(`[data-field="${name}"]`);
      if (f) {
        f.classList.add('is-invalid');
        f.querySelector('.field__error')!.textContent = msg;
      }
      ok = false;
    };
    dialog!.querySelectorAll('.field.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
    const val = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ?? '';
    const unknown = (n: string) => dialog!.querySelector(`[data-unknown="${n}"]`)?.getAttribute('aria-pressed') === 'true';
    const https = (s: string) => {
      try {
        return new URL(s).protocol === 'https:';
      } catch {
        return false;
      }
    };
    if (kind === 'photo') {
      if (!val('eventId')) bad('eventId', tr('up.required'));
      if (!val('personName') && !unknown('personName')) bad('personName', tr('up.required'));
      if (val('personUrl') && !https(val('personUrl'))) bad('personUrl', tr('up.badUrl'));
    } else {
      if (!val('personName')) bad('personName', tr('up.required'));
      if (!val('personUrl')) bad('personUrl', tr('up.required'));
      else if (!https(val('personUrl'))) bad('personUrl', tr('up.badUrl'));
      if (!val('createdDate') && !unknown('createdDate')) bad('createdDate', tr('up.required'));
      if (!choice('character')) bad('character', tr('up.required'));
      if (val('originalUrl') && !https(val('originalUrl'))) bad('originalUrl', tr('up.badUrl'));
    }
    if (!ok) dialog!.querySelector('.field.is-invalid')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return ok;
  }

  function meta() {
    const val = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() || null;
    return kind === 'photo'
      ? { eventId: val('eventId'), personName: val('personName'), personUrl: val('personUrl'), caption: captionEach ? null : val('caption') }
      : {
          personName: val('personName'), personUrl: val('personUrl'), createdDate: val('createdDate'),
          character: choice('character'), category: choice('category'), originalUrl: val('originalUrl'), caption: val('caption'),
        };
  }

  // ---------- отправка ----------

  class Fail extends Error {}
  async function call(url: string, init: RequestInit) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      throw new Fail('network');
    }
    const data = (await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }))) as Record<string, unknown>;
    if (!data.ok) throw new Fail(String(data.error ?? 'server'));
    return data;
  }
  const postJson = (url: string, body: unknown) =>
    call(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  function progress(i: number, n: number) {
    $('[data-progress]').hidden = false;
    $('[data-progress-text]').textContent = tr('up.sending', { i: Math.min(i + 1, n), n });
    $('[data-progress-bar]').style.width = `${Math.round((i / n) * 100)}%`;
  }

  async function submit() {
    if (sending) return;
    if (!items.length) return showSnackbar(tr('up.err.noFiles'), { error: true });
    if (!validate()) return showSnackbar(tr('up.err.fields'), { error: true });
    sending = true;
    submitBtn.disabled = true;
    try {
      await queue;
      const ready = items.filter((x) => x.blob && x.sha);
      if (!ready.length) throw new Fail('noFiles');
      if (!token) {
        // ждём Turnstile до 15 секунд (обычно он уже готов)
        for (let i = 0; i < 30 && !token; i++) await new Promise((r) => setTimeout(r, 500));
        if (!token) throw new Fail('captcha');
      }
      progress(0, ready.length);
      const { batchId } = (await postJson('/api/upload/batch', { kind, files: ready.length, token, meta: meta() })) as { batchId: string };
      resetTurnstile();
      let dupes = 0;
      for (const [i, it] of ready.entries()) {
        progress(i, ready.length);
        const r = await call(`/api/upload/file?batch=${batchId}&i=${i}`, {
          method: 'PUT',
          body: it.blob,
          headers: {
            'content-type': it.blob!.type || 'application/octet-stream',
            'x-sha256': it.sha!,
            'x-width': String(it.w ?? ''),
            'x-height': String(it.h ?? ''),
            'x-caption': captionEach ? encodeURIComponent(it.caption.trim()) : '',
          },
        });
        if (r.duplicate) dupes++;
      }
      progress(ready.length, ready.length);
      const fin = (await postJson('/api/upload/finish', { batchId })) as { received: number; ref?: string };
      if (!fin.received) showSnackbar(tr('up.allDupes'));
      else showSnackbar(tr(dupes ? 'up.okDupes' : 'up.ok', { n: fin.received, d: dupes, ref: fin.ref ?? '' }), { ms: 10000 });
      clearAll();
      form.reset();
      dialog!.querySelectorAll('[aria-pressed="true"]:not([data-value="one"])').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      dialog!.querySelectorAll<HTMLInputElement>('input:disabled').forEach((x) => (x.disabled = false));
      closeDialog(dialog!);
    } catch (e) {
      const code = e instanceof Fail ? e.message : 'server';
      const key = code === 'noFiles' ? 'up.err.noFiles' : S[`up.err.${code}`] ? `up.err.${code}` : 'up.err.generic';
      showSnackbar(tr(key, { code }), { error: true, action: code === 'network' || code === 'captcha' ? { label: tr('up.retry'), run: submit } : undefined });
      resetTurnstile();
      console.error('upload failed:', code, e);
    } finally {
      sending = false;
      submitBtn.disabled = false;
      $('[data-progress]').hidden = true;
    }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });

  // ---------- открытие и перетаскивание ----------

  const open = () => {
    openDialog(dialog);
    loadTurnstile();
  };
  document.querySelectorAll('[data-open-upload]').forEach((b) => b.addEventListener('click', open));

  let depth = 0;
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth += 1;
    if (!dialog.open) overlay?.classList.add('is-visible');
    dropzone.classList.add('is-over');
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) {
      overlay?.classList.remove('is-visible');
      dropzone.classList.remove('is-over');
    }
  });
  window.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay?.classList.remove('is-visible');
    dropzone.classList.remove('is-over');
    open();
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  });
}
