// Всё интерактивное в портфолио: тема, Ctrl K, Inspect, копирование почты,
// слайдер «Figma ↔ код», навыки, карусели, просмотр фото, поиск по работам.
import { showSnackbar } from './snackbar';
import { setInspect, inspecting, inspectEscape } from './inspect';
import { enhanceSelect } from './select-menu';

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));
const root = document.documentElement;
const reduce = () => root.dataset.motion === 'reduce';
const typing = (e: Event) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

/* ---------------- Окна ----------------
   Открываем через show(), а не showModal(): так кастомный курсор остаётся
   поверх окна (showModal кладёт окно в «верхний слой» браузера). */
const modals: HTMLDialogElement[] = [];
function openModal(d: HTMLDialogElement | null, focus?: HTMLElement | null) {
  if (!d || d.open) return;
  d.classList.add('is-modal');
  const y = scrollY;
  d.show();
  scrollTo(scrollX, y); // show() иногда прокручивает к окну в конце страницы
  modals.push(d);
  root.classList.add('pf-locked');
  setTimeout(() => (d.dataset.ready = '1'), 0);
  (focus ?? d.querySelector<HTMLElement>('button, a, input'))?.focus({ preventScroll: true });
}
function closeModal(d: HTMLDialogElement | null) {
  if (!d || !d.open) return;
  d.close();
  delete d.dataset.ready;
  modals.splice(modals.indexOf(d), 1);
  if (!modals.length) root.classList.remove('pf-locked');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modals.length) {
    e.preventDefault();
    closeModal(modals[modals.length - 1]);
  }
});
document.addEventListener('click', (e) => {
  const d = modals[modals.length - 1];
  if (!d?.dataset.ready || d.classList.contains('pf-viewer')) return;
  const t = e.target as Element;
  if (!t.isConnected || d.contains(t)) return;
  closeModal(d); // клик мимо окна
});

type I18n = { copied: string; openMail: string; email: string; inspectOn: string; themes: Record<string, string> };
const i18n: I18n = JSON.parse($('[data-pf-i18n]')?.dataset.pfI18n ?? '{}');

/* ---------------- Тема ---------------- */
const THEMES = ['watermelon', 'light'] as const;
type Theme = (typeof THEMES)[number];
function setTheme(t: Theme) {
  root.dataset.pfTheme = t;
  root.dataset.theme = 'watermelon';
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
  if (cmdInput) cmdInput.value = '';
  cmdFilter();
  openModal(cmd, cmdInput);
}
function closeCmd() {
  closeModal(cmd);
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
  const item = (e.target as Element).closest('a[data-cmd-item]');
  if (item) closeCmd();
});
$$('[data-theme-next]', cmd ?? document).forEach((b) => b.addEventListener('click', () => b.classList.add('is-active')));

/* ---------------- Inspect (src/scripts/inspect.ts) ---------------- */
const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
$$('[data-inspect-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    if (!fineHover.matches) return;
    setInspect(!inspecting());
  }),
);

/* ---------------- Горячие клавиши ---------------- */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    cmd?.open ? closeCmd() : openCmd();
    return;
  }
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e.key === 'i' || e.key === 'I' || e.key === 'ш' || e.key === 'Ш') && fineHover.matches) setInspect(!inspecting());
  else if (e.key === 'Escape' && !modals.length) inspectEscape();
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
  range?.addEventListener('input', () => {
    c.dataset.touched = '1';
    c.style.setProperty('--x', `${range.value}%`);
  });
});

/* ---------------- Окна (учёба) ---------------- */
const learning = $<HTMLDialogElement>('[data-learning]');
$$('[data-learning-open]').forEach((b) => b.addEventListener('click', () => openModal(learning)));
learning?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('[data-close]')) closeModal(learning);
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
  openModal(viewer, $('[data-v-close]', viewer));
}
const vStep = (d: number) => {
  if (!vg) return;
  vi = (vi + d + vg.photos.length) % vg.photos.length;
  vRender();
};
$('[data-v-prev]', viewer ?? document)?.addEventListener('click', () => vStep(-1));
$('[data-v-next]', viewer ?? document)?.addEventListener('click', () => vStep(1));
$('[data-v-close]', viewer ?? document)?.addEventListener('click', () => closeModal(viewer));
document.addEventListener('keydown', (e) => {
  if (!viewer?.open) return;
  if (e.key === 'ArrowLeft') vStep(-1);
  if (e.key === 'ArrowRight') vStep(1);
});
viewer?.addEventListener('click', (e) => {
  const t = e.target as Element;
  // клик по пустому месту вокруг фото закрывает просмотр
  if (t === viewer || t.classList.contains('pf-viewer__stage') || t.classList.contains('pf-viewer__photo')) closeModal(viewer);
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
    const back = i < cur;
    cur = (i + slides.length) % slides.length;
    car.classList.toggle('is-back', back);
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
  // сколько прокрутить, чтобы центр кадра совпал с центром ленты
  const offset = (s: HTMLElement) => {
    const tr = track.getBoundingClientRect();
    const r = s.getBoundingClientRect();
    return r.left + r.width / 2 - (tr.left + tr.width / 2);
  };
  const go = (i: number) => {
    cur = Math.max(0, Math.min(i, slides.length - 1));
    track.scrollBy({ left: offset(slides[cur]), behavior: reduce() ? 'auto' : 'smooth' });
  };
  const prev = $<HTMLButtonElement>('[data-gal-prev]', gal);
  const next = $<HTMLButtonElement>('[data-gal-next]', gal);
  const sync = () => {
    // текущий кадр - тот, чей центр ближе всего к центру ленты
    let best = 0;
    slides.forEach((s, j) => {
      if (Math.abs(offset(s)) < Math.abs(offset(slides[best]))) best = j;
    });
    cur = best;
    slides.forEach((s, j) => s.classList.toggle('is-cur', j === cur));
    if (now) now.textContent = String(cur + 1);
    $$('[data-gal-thumb]', gal).forEach((t, j) => t.classList.toggle('on', j === cur));
    if (prev) prev.disabled = cur === 0;
    if (next) next.disabled = cur === slides.length - 1;
  };
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
  $('[data-gal-prev]', gal)?.addEventListener('click', () => go(cur - 1));
  $('[data-gal-next]', gal)?.addEventListener('click', () => go(cur + 1));
  $$<HTMLElement>('[data-gal-thumb]', gal).forEach((t) =>
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      go(Number(t.dataset.galThumb));
    }),
  );
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
  // вместо системного списка - меню в стиле M3 (тот же скрипт, что на murkas.net)
  enhanceSelect(sortSel);
  const sortWrap = sortSel.closest<HTMLElement>('.select');
  const sortBtn = sortWrap?.querySelector<HTMLElement>('.select__btn');
  if (sortBtn && sortWrap?.dataset.prefix) sortBtn.dataset.prefix = sortWrap.dataset.prefix;
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
    sortSel.dispatchEvent(new Event('select:sync'));
    apply();
  });
  apply();
}

/* ---------------- Анимации появления ---------------- */
if (!reduce() && 'IntersectionObserver' in window) {
  // Что выезжает при прокрутке. Внутри одной группы - с небольшой задержкой друг за другом
  const groups = [
    '.pf-hero__text > *', '.pf-compare', '.pf-about__text > *', '.pf-learn',
    '.pf-section > .pf-h2', '.pf-section > .pf-sub', '.pf-skills__group', '.pf-work__head', '.pf-slides', '.pf-strip__item',
    '.pf-step', '.pf-hire__head', '.pf-service', '.pf-prices__head', '.pf-pricelist li', '.pf-terms', '.pf-finder', '.pf-contact', '.pf-footer__cols > *',
    '.pf-all > *:not(.pf-grid)', '.pf-card', '.pf-case__head > *', '.pf-gal', '.pf-block', '.pf-more__head', '.pf-results li', '.pf-proc li',
  ];
  const els = $$(groups.join(','));
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  els.forEach((el) => {
    const sib = el.parentElement ? Array.from(el.parentElement.children).filter((c) => els.includes(c as HTMLElement)) : [];
    el.style.setProperty('--d', `${Math.min(sib.indexOf(el), 8) * 60}ms`);
    el.classList.add('pf-rv');
    io.observe(el);
  });

  // Числа «3 yrs / 10k+ / 4» досчитываются от нуля
  const counters = $$('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      cio.unobserve(en.target);
      const el = en.target as HTMLElement;
      const m = el.dataset.count!.match(/^(\D*)(\d+)(.*)$/);
      if (!m) continue;
      const [, pre, num, post] = m;
      const end = Number(num);
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1100);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = `${pre}${Math.round(end * e)}${post}`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  });
  counters.forEach((c) => cio.observe(c));

  // Слайдер «Figma ↔ код» сам один раз показывает, что его можно тянуть
  $$('[data-compare]').forEach((c) => {
    const range = $<HTMLInputElement>('[data-compare-range]', c);
    const sio = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      sio.disconnect();
      const pts = [50, 24, 76, 50];
      const t0 = performance.now() + 700;
      const step = (now: number) => {
        if (c.dataset.touched) return;
        const k = Math.max(0, Math.min(1, (now - t0) / 2600));
        const seg = Math.min(pts.length - 2, Math.floor(k * (pts.length - 1)));
        const local = k * (pts.length - 1) - seg;
        const ease = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
        const v = pts[seg] + (pts[seg + 1] - pts[seg]) * ease;
        c.style.setProperty('--x', `${v}%`);
        if (range) range.value = String(Math.round(v));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    sio.observe(c);
  });
}

/* ---------------- Подборщик услуги ---------------- */
const finderEl = $('[data-finder]');
if (finderEl) {
  type R = { title: string; why: string; from: string; range: string; includes: string[] };
  const F: {
    results: Record<string, R>; when: Record<string, string>;
    labels: Record<string, { q: string; o: Record<string, string> }>;
    msg: Record<string, string>; tg: string; email: string;
  } = JSON.parse(finderEl.dataset.finder!);
  const answers = () => Object.fromEntries($$<HTMLInputElement>('input[data-q]:checked', finderEl).map((i) => [i.dataset.q!, i.value]));
  const pick = (a: Record<string, string>) =>
    a.design === 'figma' ? 'frontend' : a.need === 'app' ? 'screens' : a.need === 'one' ? (a.edit === 'self' ? 'landing-cms' : 'landing') : a.edit === 'self' ? 'site-cms' : 'website';
  const set = (sel: string, v: string) => {
    const el = $(sel, finderEl);
    if (el) el.textContent = v;
  };
  const render = () => {
    const a = answers();
    const r = F.results[pick(a)];
    const box = $('.pf-finder__result', finderEl)!;
    box.classList.remove('is-swap');
    void box.offsetWidth; // перезапуск анимации
    box.classList.add('is-swap');
    set('[data-f-title]', r.title);
    set('[data-f-why]', r.why);
    set('[data-f-from]', `${F.msg.from} ${r.from}`);
    set('[data-f-range]', r.range);
    const when = $('[data-f-when]', finderEl)!;
    when.textContent = F.when[a.when] ?? '';
    when.hidden = !F.when[a.when];
    when.classList.toggle('is-rush', a.when === 'rush');
    const inc = $('[data-f-inc]', finderEl)!;
    const tick = inc.querySelector('svg')?.outerHTML ?? '';
    inc.innerHTML = r.includes.map((i) => `<li>${tick}<span></span></li>`).join('');
    inc.querySelectorAll('span').forEach((s, i) => (s.textContent = r.includes[i]));
    // Сообщение с ответами - для Telegram и почты
    const lines = Object.entries(a).map(([k, v]) => `- ${F.labels[k].q} ${F.labels[k].o[v]}`);
    const text = `${F.msg.hello}\n${F.msg.pick}: ${r.title} (${F.msg.from} ${r.from}).\n${F.msg.answers}:\n${lines.join('\n')}`;
    $<HTMLAnchorElement>('[data-f-tg]', finderEl)!.href = `${F.tg}?text=${encodeURIComponent(text)}`;
    $<HTMLAnchorElement>('[data-f-mail]', finderEl)!.href = `mailto:${F.email}?subject=${encodeURIComponent(`${F.msg.subject}: ${r.title}`)}&body=${encodeURIComponent(text)}`;
  };
  finderEl.addEventListener('change', render);
  render();
}
