// Всё интерактивное в портфолио: тема, Ctrl K, Inspect, копирование почты,
// слайдер «Figma ↔ код», навыки, карусели, просмотр фото, поиск по работам.
import { showSnackbar } from './snackbar';

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));
const root = document.documentElement;
const reduce = () => root.dataset.motion === 'reduce';
const typing = (e: Event) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

type I18n = { copied: string; openMail: string; email: string; inspectOn: string; themes: Record<string, string> };
const i18n: I18n = JSON.parse($('[data-pf-i18n]')?.dataset.pfI18n ?? '{}');

/* ---------------- Тема ---------------- */
const THEMES = ['watermelon', 'redpanda', 'light'] as const;
type Theme = (typeof THEMES)[number];
function setTheme(t: Theme) {
  root.dataset.pfTheme = t;
  root.dataset.theme = t === 'redpanda' ? 'redpanda' : 'watermelon';
  root.dataset.mode = t === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem('pf-theme', t);
  } catch {}
  syncTheme();
}
function syncTheme() {
  const cur = (root.dataset.pfTheme as Theme) || 'watermelon';
  $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeSet === cur)));
  $$('[data-theme-name]').forEach((s) => (s.textContent = i18n.themes?.[cur] ?? cur));
}
$$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet as Theme)));
$$('[data-theme-next]').forEach((b) =>
  b.addEventListener('click', () => {
    const cur = THEMES.indexOf((root.dataset.pfTheme as Theme) || 'watermelon');
    setTheme(THEMES[(cur + 1) % THEMES.length]);
  }),
);
syncTheme();

/* ---------------- Почта: копирование ---------------- */
document.addEventListener('click', async (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-copy-email]');
  if (!el) return;
  e.preventDefault();
  try {
    await navigator.clipboard.writeText(i18n.email);
    showSnackbar(i18n.copied, { action: { label: i18n.openMail, run: () => (location.href = `mailto:${i18n.email}`) } });
  } catch {
    location.href = `mailto:${i18n.email}`;
  }
  if (el.closest('[data-cmd]')) closeCmd();
});

/* ---------------- Шапка: тень и подсветка раздела ---------------- */
const navEl = $('[data-nav]');
const onScroll = () => navEl?.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
const spyLinks = $$<HTMLAnchorElement>('[data-spy]');
if (spyLinks.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        spyLinks.forEach((a) => a.toggleAttribute('aria-current', a.dataset.spy === en.target.id));
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  spyLinks.forEach((a) => {
    const s = document.getElementById(a.dataset.spy!);
    if (s) io.observe(s);
  });
}
$$('[data-to-top]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
  }),
);

/* ---------------- Ctrl K ---------------- */
const cmd = $<HTMLDialogElement>('[data-cmd]');
const cmdInput = $<HTMLInputElement>('[data-cmd-input]');
const cmdItems = $$<HTMLElement>('[data-cmd-item]');
let cmdIdx = 0;
function cmdVisible() {
  return cmdItems.filter((i) => !i.hidden);
}
function cmdMark() {
  const vis = cmdVisible();
  cmdIdx = Math.max(0, Math.min(cmdIdx, vis.length - 1));
  cmdItems.forEach((i) => i.classList.remove('is-active'));
  vis[cmdIdx]?.classList.add('is-active');
  vis[cmdIdx]?.scrollIntoView({ block: 'nearest' });
}
function cmdFilter() {
  const q = (cmdInput?.value ?? '').trim().toLowerCase();
  for (const i of cmdItems) i.hidden = !!q && !`${i.textContent} ${i.dataset.key}`.toLowerCase().includes(q);
  // Заголовок группы прячем, если в ней ничего не осталось
  $$('.pf-cmd__group', cmd!).forEach((g) => {
    let n = g.nextElementSibling as HTMLElement | null;
    let any = false;
    while (n && !n.classList.contains('pf-cmd__group')) {
      if (n.hasAttribute('data-cmd-item') && !n.hidden) any = true;
      n = n.nextElementSibling as HTMLElement | null;
    }
    g.hidden = !any;
  });
  const empty = $('[data-cmd-empty]');
  if (empty) empty.hidden = cmdVisible().length > 0;
  cmdIdx = 0;
  cmdMark();
}
function openCmd() {
  if (!cmd || cmd.open) return;
  cmd.showModal();
  if (cmdInput) cmdInput.value = '';
  cmdFilter();
  cmdInput?.focus();
}
function closeCmd() {
  cmd?.open && cmd.close();
}
$$('[data-cmd-open]').forEach((b) => b.addEventListener('click', openCmd));
cmdInput?.addEventListener('input', cmdFilter);
cmd?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    cmdIdx += e.key === 'ArrowDown' ? 1 : -1;
    const n = cmdVisible().length;
    cmdIdx = (cmdIdx + n) % Math.max(n, 1);
    cmdMark();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    cmdVisible()[cmdIdx]?.click();
  }
});
cmd?.addEventListener('click', (e) => {
  if (e.target === cmd) closeCmd(); // клик по затемнению
  const item = (e.target as Element).closest('a[data-cmd-item]');
  if (item) closeCmd();
});
$$('[data-theme-next]', cmd ?? document).forEach((b) => b.addEventListener('click', () => b.classList.add('is-active')));

/* ---------------- Inspect ---------------- */
const box = $('[data-inspect-box]');
const tag = $('[data-inspect-tag]');
const inspectBtns = $$('[data-inspect-toggle]');
let inspecting = false;
let tokenMap: [string, string][] = [];
const TOKENS = [
  'surface', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest',
  'primary', 'primary-container', 'secondary', 'secondary-container', 'tertiary', 'tertiary-container', 'primary-fixed', 'inverse-surface',
  'on-surface', 'on-surface-variant', 'on-primary', 'outline-variant',
];
const pretty = (s: string) => s.replace(/(^|-)([a-z])/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase());
function buildTokens() {
  const probe = document.createElement('span');
  document.body.append(probe);
  tokenMap = TOKENS.map((tk) => {
    probe.style.color = `var(--md-${tk})`;
    return [getComputedStyle(probe).color, pretty(tk)] as [string, string];
  });
  probe.remove();
}
function describe(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const parts = [`${Math.round(r.width)} × ${Math.round(r.height)}`];
  const pads = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => Math.round(parseFloat(v)));
  if (pads.some(Boolean)) parts.push(`padding ${new Set(pads).size === 1 ? pads[0] : pads.join(' ')}`);
  if (cs.gap && cs.gap !== 'normal' && parseFloat(cs.gap)) parts.push(`gap ${Math.round(parseFloat(cs.gap))}`);
  if (parseFloat(cs.borderRadius)) parts.push(`radius ${Math.round(parseFloat(cs.borderRadius))}`);
  const bg = cs.backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)') parts.push(tokenMap.find(([c]) => c === bg)?.[1] ?? bg);
  const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
  if (hasText) {
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').replace(' Variable', '');
    const lh = cs.lineHeight === 'normal' ? '' : `/${Math.round(parseFloat(cs.lineHeight))}`;
    parts.push(`${fam} ${Math.round(parseFloat(cs.fontSize))}${lh} · ${cs.fontWeight}`);
    const fg = tokenMap.find(([c]) => c === cs.color)?.[1];
    if (fg) parts.push(fg);
  }
  return parts.join(' · ');
}
function showBox(el: HTMLElement) {
  if (!box || !tag) return;
  const r = el.getBoundingClientRect();
  Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  tag.textContent = describe(el);
  box.classList.toggle('is-low', r.top < 40);
  box.hidden = false;
}
function onInspectMove(e: PointerEvent) {
  const el = e.target as HTMLElement;
  if (!el || el === box || el.closest('[data-inspect-box]') || el === document.body || el === root) return;
  showBox(el);
}
function setInspect(on: boolean) {
  inspecting = on;
  root.classList.toggle('is-inspecting', on);
  inspectBtns.forEach((b) => b.setAttribute('aria-pressed', String(on)));
  if (on) {
    buildTokens();
    addEventListener('pointerover', onInspectMove);
    showSnackbar(i18n.inspectOn, { ms: 3500 });
  } else {
    removeEventListener('pointerover', onInspectMove);
    if (box) box.hidden = true;
  }
}
inspectBtns.forEach((b) => b.addEventListener('click', () => setInspect(!inspecting)));
addEventListener('scroll', () => inspecting && box && (box.hidden = true), { passive: true });

/* ---------------- Горячие клавиши ---------------- */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    cmd?.open ? closeCmd() : openCmd();
    return;
  }
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'i' || e.key === 'I' || e.key === 'ш' || e.key === 'Ш') setInspect(!inspecting);
  else if (e.key === 'Escape' && inspecting) setInspect(false);
  else if (e.key === '/') {
    const q = $<HTMLInputElement>('[data-q]');
    if (q) {
      e.preventDefault();
      q.focus();
    }
  }
});

/* ---------------- Figma ↔ код ---------------- */
$$('[data-compare]').forEach((c) => {
  const range = $<HTMLInputElement>('[data-compare-range]', c);
  range?.addEventListener('input', () => c.style.setProperty('--x', `${range.value}%`));
});

/* ---------------- Окна (учёба) ---------------- */
const learning = $<HTMLDialogElement>('[data-learning]');
$$('[data-learning-open]').forEach((b) => b.addEventListener('click', () => learning?.showModal()));
learning?.addEventListener('click', (e) => {
  if (e.target === learning || (e.target as Element).closest('[data-close]')) learning.close();
});
$$<HTMLButtonElement>('[data-l-filter]').forEach((b) =>
  b.addEventListener('click', () => {
    $$('[data-l-filter]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    const k = b.dataset.lFilter;
    $$<HTMLElement>('[data-kind]', learning!).forEach((li) => (li.hidden = k !== 'all' && li.dataset.kind !== k));
  }),
);

/* ---------------- Навыки ---------------- */
const chips = $$<HTMLButtonElement>('[data-skill]');
const strip = $$<HTMLElement>('.pf-strip__item');
const note = $('[data-skill-note]');
function closeSkills(except?: HTMLButtonElement) {
  chips.forEach((c) => {
    if (c === except) return;
    c.setAttribute('aria-expanded', 'false');
    const pop = document.getElementById(c.getAttribute('aria-controls')!);
    if (pop) pop.hidden = true;
  });
}
function markProjects(chip?: HTMLButtonElement) {
  const used = chip?.dataset.used?.split(' ').filter(Boolean) ?? [];
  const on = !!chip && used.length > 0;
  strip.forEach((s) => s.classList.toggle('is-dim', on && !used.includes(s.dataset.slug!)));
  if (note) {
    note.hidden = !on;
    const txt = $('[data-skill-note-text]', note);
    if (txt && chip) txt.textContent = `${chip.dataset.skill}: ${strip.filter((s) => used.includes(s.dataset.slug!)).length} / ${strip.length}`;
  }
}
chips.forEach((c) =>
  c.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = c.getAttribute('aria-expanded') !== 'true';
    closeSkills(c);
    c.setAttribute('aria-expanded', String(open));
    const pop = document.getElementById(c.getAttribute('aria-controls')!);
    if (pop) {
      pop.hidden = !open;
      // Не даём окошку уехать за правый край
      pop.classList.remove('is-right');
      if (open && pop.getBoundingClientRect().right > innerWidth - 12) pop.classList.add('is-right');
    }
    markProjects(open ? c : undefined);
  }),
);
document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('.pf-pop')) closeSkills();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSkills());
$('[data-skill-reset]')?.addEventListener('click', () => {
  closeSkills();
  markProjects();
});

/* ---------------- Просмотр фото ---------------- */
type GPhoto = { src: string | null; title: string; caption: string; made: string; figma: string | null };
type Gallery = { project: string; href: string | null; figma: string | null; photos: GPhoto[] };
const viewer = $<HTMLDialogElement>('[data-viewer]');
let vg: Gallery | null = null;
let vi = 0;
function vRender() {
  if (!viewer || !vg) return;
  const p = vg.photos[vi];
  $('[data-v-count]', viewer)!.textContent = `${vg.project} · ${vi + 1} / ${vg.photos.length}`;
  const fig = $('[data-v-photo]', viewer)!;
  fig.replaceChildren();
  if (p.src) {
    const img = new Image();
    img.src = p.src;
    img.alt = p.title || vg.project;
    fig.append(img);
  } else {
    fig.innerHTML = '<span class="pf-shot pf-shot--empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg></span>';
  }
  const made = $('[data-v-made-wrap]', viewer)!;
  made.hidden = !p.made;
  $('[data-v-made]', viewer)!.textContent = p.made;
  $('[data-v-title]', viewer)!.textContent = p.title || vg.project;
  $('[data-v-caption]', viewer)!.textContent = p.caption;
  const page = $<HTMLAnchorElement>('[data-v-page]', viewer)!;
  page.hidden = !vg.href;
  if (vg.href) page.href = vg.href;
  const fl = $<HTMLAnchorElement>('[data-v-figma]', viewer)!;
  const figma = p.figma ?? vg.figma;
  fl.hidden = !figma;
  if (figma) fl.href = figma;
  $$<HTMLButtonElement>('[data-v-thumb]', viewer).forEach((b, i) => b.classList.toggle('on', i === vi));
  $(`[data-v-thumb="${vi}"]`, viewer)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const many = vg.photos.length > 1;
  $$('[data-v-prev],[data-v-next]', viewer).forEach((b) => b.classList.toggle('is-off', !many));
}
function openViewer(g: Gallery, i: number) {
  if (!viewer) return;
  vg = g;
  vi = i;
  const th = $('[data-v-thumbs]', viewer)!;
  th.replaceChildren(
    ...g.photos.map((p, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.vThumb = String(j);
      b.setAttribute('aria-label', p.title || `${j + 1}`);
      if (p.src) {
        const img = new Image();
        img.src = p.src;
        img.alt = '';
        img.loading = 'lazy';
        b.append(img);
      }
      b.addEventListener('click', () => {
        vi = j;
        vRender();
      });
      return b;
    }),
  );
  th.hidden = g.photos.length < 2;
  vRender();
  viewer.showModal();
}
const vStep = (d: number) => {
  if (!vg) return;
  vi = (vi + d + vg.photos.length) % vg.photos.length;
  vRender();
};
$('[data-v-prev]', viewer ?? document)?.addEventListener('click', () => vStep(-1));
$('[data-v-next]', viewer ?? document)?.addEventListener('click', () => vStep(1));
$('[data-v-close]', viewer ?? document)?.addEventListener('click', () => viewer?.close());
viewer?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') vStep(-1);
  if (e.key === 'ArrowRight') vStep(1);
});
viewer?.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.close();
});
document.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-open-photo]');
  if (!b) return;
  const host = b.closest<HTMLElement>('[data-gallery]');
  if (!host) return;
  openViewer(JSON.parse(host.dataset.gallery!), Number(b.dataset.openPhoto) || 0);
});

/* ---------------- Карусель на главной ---------------- */
const car = $('[data-carousel]');
if (car) {
  const slides = $$('[data-slide]', car);
  let cur = 0;
  const go = (i: number) => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, j) => (s.hidden = j !== cur));
    strip.forEach((s, j) => s.setAttribute('aria-selected', String(j === cur)));
    $$('[data-dot]', car).forEach((d, j) => d.classList.toggle('on', j === cur));
    const now = $('[data-c-now]', car);
    if (now) now.textContent = String(cur + 1).padStart(2, '0');
  };
  $('[data-c-prev]', car)?.addEventListener('click', () => go(cur - 1));
  $('[data-c-next]', car)?.addEventListener('click', () => go(cur + 1));
  strip.forEach((s) => s.addEventListener('click', () => go(Number(s.dataset.go))));
  car.addEventListener('keydown', (e) => {
    if (typing(e) || (e.target as Element).closest('.pf-pop')) return;
    if (e.key === 'ArrowLeft') go(cur - 1);
    if (e.key === 'ArrowRight') go(cur + 1);
  });
  // Миниатюры внутри слайда меняют большое фото
  slides.forEach((s) => {
    const main = $<HTMLButtonElement>('[data-main]', s);
    $$<HTMLButtonElement>('[data-thumb]', s).forEach((t) =>
      t.addEventListener('click', () => {
        $$('[data-thumb]', s).forEach((x) => x.classList.toggle('on', x === t));
        const shot = t.querySelector('.pf-shot')!.cloneNode(true) as HTMLElement;
        main?.querySelector('.pf-shot')?.replaceWith(shot);
        if (main) main.dataset.openPhoto = t.dataset.thumb!;
      }),
    );
  });
}

/* ---------------- Галерея на странице проекта ---------------- */
const gal = $('[data-gal]');
if (gal) {
  const track = $('[data-gal-track]', gal)!;
  const slides = $$('[data-gal-slide]', gal);
  const now = $('[data-gal-now]', gal);
  let cur = 0;
  const go = (i: number) => {
    cur = Math.max(0, Math.min(i, slides.length - 1));
    track.scrollTo({ left: slides[cur].offsetLeft - track.offsetLeft, behavior: reduce() ? 'auto' : 'smooth' });
  };
  track.addEventListener(
    'scroll',
    () => {
      const w = slides[0]?.offsetWidth || 1;
      cur = Math.round(track.scrollLeft / (w + 16));
      if (now) now.textContent = String(cur + 1);
      $$('[data-gal-thumb]', gal).forEach((t, j) => t.classList.toggle('on', j === cur));
    },
    { passive: true },
  );
  $('[data-gal-prev]', gal)?.addEventListener('click', () => go(cur - 1));
  $('[data-gal-next]', gal)?.addEventListener('click', () => go(cur + 1));
  $('[data-gal-full]', gal)?.addEventListener('click', () => {
    const host = gal.closest<HTMLElement>('[data-gallery]');
    if (host) openViewer(JSON.parse(host.dataset.gallery!), cur);
  });
}

/* ---------------- «Другие проекты» ---------------- */
const more = $('[data-more]');
if (more) {
  const track = $('[data-more-track]', more)!;
  const dots = $('[data-more-dots]', more)!;
  const step = () => (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 300;
  const pages = () => Math.max(1, Math.ceil((track.scrollWidth - track.clientWidth) / (step() + 16)) + 1);
  const draw = () => {
    const n = pages();
    if (dots.childElementCount !== n) dots.replaceChildren(...Array.from({ length: n }, () => document.createElement('span')));
    const i = Math.round(track.scrollLeft / (step() + 16));
    Array.from(dots.children).forEach((d, j) => d.classList.toggle('on', j === Math.min(i, n - 1)));
    dots.hidden = n < 2;
  };
  const by = (d: number) => track.scrollBy({ left: d * (step() + 16), behavior: reduce() ? 'auto' : 'smooth' });
  $('[data-more-prev]', more)?.addEventListener('click', () => by(-1));
  $('[data-more-next]', more)?.addEventListener('click', () => by(1));
  track.addEventListener('scroll', draw, { passive: true });
  addEventListener('resize', draw);
  draw();
}

/* ---------------- Все работы: поиск и фильтры ---------------- */
const all = $('[data-all]');
if (all) {
  const q = $<HTMLInputElement>('[data-q]', all)!;
  const sortSel = $<HTMLSelectElement>('[data-sort-select]', all)!;
  const grid = $('[data-grid]', all)!;
  const cards = $$('[data-card]', grid);
  const roleBtns = $$<HTMLButtonElement>('[data-role]', all);
  const stackBtns = $$<HTMLButtonElement>('[data-stack]', all);
  const showing = $('[data-showing]', all)!;
  const reset = $('[data-reset]', all)!;
  const empty = $('[data-empty]', all)!;
  let role = '';
  const stack = new Set<string>();

  const params = new URLSearchParams(location.search);
  if (params.get('q')) q.value = params.get('q')!;
  const pre = params.get('tag');
  if (pre) {
    // тег со страницы проекта: если есть подходящий чип - включаем его, иначе фильтруем по самому тегу
    const chip = stackBtns.find((b) => pre.toLowerCase().includes(b.dataset.stack!.toLowerCase()));
    stack.add(chip ? chip.dataset.stack! : pre);
  }

  function apply() {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    for (const c of cards) {
      const tags = c.dataset.tags!.split('|');
      const ok =
        (!role || c.dataset.roles!.split(' ').includes(role)) &&
        [...stack].every((s) => tags.some((tg) => tg.toLowerCase().includes(s.toLowerCase()))) &&
        words.every((w) => c.dataset.search!.includes(w));
      c.hidden = !ok;
      if (ok) n++;
      // подсвечиваем выбранные теги в карточке
      $$('[data-tag]', c).forEach((tg) => tg.classList.toggle('is-hit', [...stack].some((s) => tg.dataset.tag!.toLowerCase().includes(s.toLowerCase()))));
    }
    const s = sortSel.value;
    cards
      .slice()
      .sort((a, b) =>
        s === 'az' ? a.dataset.title!.localeCompare(b.dataset.title!) : s === 'old' ? a.dataset.sort!.localeCompare(b.dataset.sort!) : b.dataset.sort!.localeCompare(a.dataset.sort!),
      )
      .forEach((c) => grid.append(c));
    showing.textContent = showing.dataset.tpl!.replace('-1', String(n));
    reset.hidden = !(role || stack.size || words.length || s !== 'new');
    empty.hidden = n > 0;
    roleBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.role === role)));
    stackBtns.forEach((b) => b.setAttribute('aria-pressed', String(stack.has(b.dataset.stack!))));
  }
  q.addEventListener('input', apply);
  q.addEventListener('keydown', (e) => e.key === 'Escape' && ((q.value = ''), apply(), q.blur()));
  sortSel.addEventListener('change', apply);
  roleBtns.forEach((b) => b.addEventListener('click', () => ((role = b.dataset.role!), apply())));
  stackBtns.forEach((b) =>
    b.addEventListener('click', () => {
      const v = b.dataset.stack!;
      stack.has(v) ? stack.delete(v) : stack.add(v);
      apply();
    }),
  );
  // Клик по тегу в карточке = фильтр по этому тегу
  grid.addEventListener('click', (e) => {
    const tg = (e.target as Element).closest<HTMLElement>('[data-tag]');
    if (!tg) return;
    const v = tg.dataset.tag!;
    stack.has(v) ? stack.delete(v) : stack.add(v);
    apply();
  });
  reset.addEventListener('click', () => {
    role = '';
    stack.clear();
    q.value = '';
    sortSel.value = 'new';
    apply();
  });
  apply();
}
