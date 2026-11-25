// Режим Inspect в стиле Figma Dev Mode:
// наведение - синяя обводка, клик - выделение с ручками, именем слоя и размером,
// наведение на другой слой при выделенном - красные расстояния (как с Alt),
// справа панель: Layout, Fill, Typography и готовый CSS с кнопкой Copy.
import { showSnackbar } from './snackbar';

type Strings = {
  title: string; hint: string; exit: string; empty: string; layout: string; fill: string; stroke: string;
  type: string; code: string; copy: string; copied: string; on: string;
};

const root = document.documentElement;
const ui = document.querySelector<HTMLElement>('[data-insp]');
const panel = document.querySelector<HTMLElement>('[data-insp-panel]');
const bar = document.querySelector<HTMLElement>('[data-insp-bar]');
const S: Strings = JSON.parse(ui?.dataset.insp ?? '{}');

const hoverBox = ui?.querySelector<HTMLElement>('[data-insp-hover]');
const selBox = ui?.querySelector<HTMLElement>('[data-insp-sel]');
const selName = ui?.querySelector<HTMLElement>('[data-insp-name]');
const selSize = ui?.querySelector<HTMLElement>('[data-insp-size]');
const pads = ui?.querySelector<HTMLElement>('[data-insp-pads]');
const meas = ui?.querySelector<HTMLElement>('[data-insp-meas]');

let on = false;
let hovered: HTMLElement | null = null;
let selected: HTMLElement | null = null;

/* ---------- Токены: какой переменной соответствует цвет ---------- */
const TOKENS = [
  'surface', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest',
  'primary', 'on-primary', 'primary-container', 'on-primary-container', 'primary-fixed', 'primary-fixed-dim', 'on-primary-fixed', 'on-primary-fixed-variant',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'on-surface', 'on-surface-variant', 'outline', 'outline-variant', 'inverse-surface', 'inverse-on-surface',
];
let tokens: { rgb: string; name: string; v: string }[] = [];
const pretty = (s: string) => s.replace(/(^|-)([a-z])/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase());
function buildTokens() {
  const probe = document.createElement('span');
  document.body.append(probe);
  tokens = TOKENS.map((tk) => {
    probe.style.color = `var(--md-${tk})`;
    return { rgb: getComputedStyle(probe).color, name: pretty(tk), v: `--md-${tk}` };
  });
  probe.remove();
}
const token = (rgb: string) => tokens.find((t) => t.rgb === rgb);
function hex(rgb: string) {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return rgb;
  const [r, g, b, a] = m.map(Number);
  const h = '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  return a != null && a < 1 ? `${h} · ${Math.round(a * 100)}%` : h;
}
const clear = (c: string) => !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
const px = (v: string) => Math.round(parseFloat(v) || 0);

/* ---------- Что за слой ---------- */
const ownText = (el: Element) =>
  Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent!.trim())
    .join(' ')
    .trim();
function layerName(el: HTMLElement) {
  const text = ownText(el);
  if (el.tagName === 'IMG') return { icon: '▣', name: 'Image' };
  if (el.tagName === 'svg' || el.closest('svg')) return { icon: '◇', name: 'Icon' };
  if (text && el.children.length === 0) return { icon: 'T', name: text.length > 26 ? `${text.slice(0, 26)}…` : text };
  const cls = Array.from(el.classList).find((c) => c.startsWith('pf-') || c.startsWith('md-'));
  if (cls) return { icon: '#', name: cls.replace(/^(pf|md)-/, '').replace(/__/g, ' / ').replace(/--/g, ' · ').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) };
  if (text) return { icon: 'T', name: text.length > 26 ? `${text.slice(0, 26)}…` : text };
  return { icon: '#', name: el.tagName.toLowerCase() };
}

/* ---------- Рисование ---------- */
function place(box: HTMLElement, r: DOMRect) {
  box.style.transform = `translate(${r.left}px, ${r.top}px)`;
  box.style.width = `${r.width}px`;
  box.style.height = `${r.height}px`;
}
function line(x1: number, y1: number, x2: number, y2: number, label: number) {
  if (!meas || label <= 0) return;
  const l = document.createElement('span');
  l.className = 'pf-insp__m';
  const horiz = y1 === y2;
  Object.assign(l.style, horiz
    ? { left: `${Math.min(x1, x2)}px`, top: `${y1}px`, width: `${Math.abs(x2 - x1)}px`, height: '1px' }
    : { left: `${x1}px`, top: `${Math.min(y1, y2)}px`, width: '1px', height: `${Math.abs(y2 - y1)}px` });
  l.classList.add(horiz ? 'is-h' : 'is-v');
  const b = document.createElement('b');
  b.textContent = String(Math.round(label));
  l.append(b);
  meas.append(l);
}
function measure(a: DOMRect, b: DOMRect) {
  if (!meas) return;
  meas.replaceChildren();
  const inside = (o: DOMRect, i: DOMRect) => i.left >= o.left && i.right <= o.right && i.top >= o.top && i.bottom <= o.bottom;
  if (inside(b, a) || inside(a, b)) {
    // один внутри другого - расстояния от внутреннего до краёв внешнего
    const [o, i] = inside(b, a) ? [b, a] : [a, b];
    const cx = i.left + i.width / 2;
    const cy = i.top + i.height / 2;
    line(o.left, cy, i.left, cy, i.left - o.left);
    line(i.right, cy, o.right, cy, o.right - i.right);
    line(cx, o.top, cx, i.top, i.top - o.top);
    line(cx, i.bottom, cx, o.bottom, o.bottom - i.bottom);
    return;
  }
  // рядом - зазор по горизонтали и/или вертикали
  const oy1 = Math.max(a.top, b.top), oy2 = Math.min(a.bottom, b.bottom);
  const ox1 = Math.max(a.left, b.left), ox2 = Math.min(a.right, b.right);
  const my = oy2 > oy1 ? (oy1 + oy2) / 2 : a.top + a.height / 2;
  const mx = ox2 > ox1 ? (ox1 + ox2) / 2 : a.left + a.width / 2;
  if (b.left >= a.right) line(a.right, my, b.left, my, b.left - a.right);
  else if (a.left >= b.right) line(b.right, my, a.left, my, a.left - b.right);
  if (b.top >= a.bottom) line(mx, a.bottom, mx, b.top, b.top - a.bottom);
  else if (a.top >= b.bottom) line(mx, b.bottom, mx, a.top, a.top - b.bottom);
}
function drawPads(el: HTMLElement, r: DOMRect) {
  if (!pads) return;
  const cs = getComputedStyle(el);
  const [t, ri, bo, l] = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
  const parts: [number, number, number, number][] = [
    [r.left, r.top, r.width, t],
    [r.left, r.bottom - bo, r.width, bo],
    [r.left, r.top + t, l, r.height - t - bo],
    [r.right - ri, r.top + t, ri, r.height - t - bo],
  ];
  pads.replaceChildren(
    ...parts.filter(([, , w, h]) => w > 0 && h > 0).map(([x, y, w, h]) => {
      const s = document.createElement('span');
      Object.assign(s.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      return s;
    }),
  );
}
function draw() {
  if (!on) return;
  if (hoverBox) {
    const show = hovered && hovered !== selected;
    hoverBox.hidden = !show;
    if (show) place(hoverBox, hovered!.getBoundingClientRect());
  }
  if (selBox) {
    selBox.hidden = !selected;
    if (pads) pads.hidden = !selected;
    if (selected) {
      const r = selected.getBoundingClientRect();
      place(selBox, r);
      const n = layerName(selected);
      selName!.textContent = `${n.icon}  ${n.name}`;
      selSize!.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      drawPads(selected, r);
      if (hovered && hovered !== selected) measure(r, hovered.getBoundingClientRect());
      else meas?.replaceChildren();
    } else meas?.replaceChildren();
  }
}

/* ---------- Панель ---------- */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function row(k: string, v: string) {
  return `<div class="pf-ip__row"><span>${esc(k)}</span><b>${v}</b></div>`;
}
function color(c: string) {
  const t = token(c);
  return `<span class="pf-ip__sw" style="background:${c}"></span><span class="pf-ip__col">${t ? esc(t.name) : hex(c)}${t ? `<small>${hex(c)}</small>` : ''}</span>`;
}
let lastCss = '';
function fillPanel() {
  if (!panel) return;
  const body = panel.querySelector<HTMLElement>('[data-insp-body]')!;
  if (!selected) {
    body.innerHTML = `<p class="pf-ip__empty">${esc(S.empty)}</p>`;
    return;
  }
  const el = selected;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const n = layerName(el);
  const css: string[] = [];
  let html = `<div class="pf-ip__layer"><span class="pf-ip__icon">${esc(n.icon)}</span><b>${esc(n.name)}</b><small>&lt;${el.tagName.toLowerCase()}&gt;</small></div>`;

  // Layout
  const flex = cs.display.includes('flex');
  const grid = cs.display.includes('grid');
  const p = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
  const padTxt = new Set(p).size === 1 ? String(p[0]) : p.join(' ');
  html += `<section><h4>${esc(S.layout)}</h4>`;
  html += `<div class="pf-ip__grid">${row('W', String(Math.round(r.width)))}${row('H', String(Math.round(r.height)))}</div>`;
  if (flex || grid) {
    const dir = grid ? 'Grid' : cs.flexDirection.startsWith('column') ? 'Auto layout ↓' : 'Auto layout →';
    html += row('Mode', dir);
  }
  if (p.some(Boolean)) html += row('Padding', padTxt);
  if ((flex || grid) && px(cs.rowGap || cs.gap)) html += row('Gap', String(px(cs.columnGap) && px(cs.columnGap) !== px(cs.rowGap) ? `${px(cs.rowGap)} ${px(cs.columnGap)}` : px(cs.rowGap || cs.gap)));
  if (px(cs.borderTopLeftRadius)) html += row('Radius', String(px(cs.borderTopLeftRadius)));
  html += '</section>';
  css.push(`width: ${Math.round(r.width)}px;`, `height: ${Math.round(r.height)}px;`);
  if (flex) css.push('display: flex;', `flex-direction: ${cs.flexDirection};`);
  if (grid) css.push('display: grid;');
  if (p.some(Boolean)) css.push(`padding: ${p.map((v) => `${v}px`).join(' ').replace(/^(\S+) \1 \1 \1$/, '$1')};`);
  if ((flex || grid) && px(cs.gap)) css.push(`gap: ${px(cs.gap)}px;`);
  if (px(cs.borderTopLeftRadius)) css.push(`border-radius: ${cs.borderTopLeftRadius};`);

  // Fill / Stroke
  if (!clear(cs.backgroundColor)) {
    html += `<section><h4>${esc(S.fill)}</h4><div class="pf-ip__color">${color(cs.backgroundColor)}</div></section>`;
    const t = token(cs.backgroundColor);
    css.push(`background: ${t ? `var(${t.v})` : hex(cs.backgroundColor).split(' ')[0]};`);
  }
  if (px(cs.borderTopWidth) && !clear(cs.borderTopColor) && cs.borderTopStyle !== 'none') {
    html += `<section><h4>${esc(S.stroke)}</h4><div class="pf-ip__color">${color(cs.borderTopColor)}<span class="pf-ip__w">${px(cs.borderTopWidth)}px · ${cs.borderTopStyle}</span></div></section>`;
    const t = token(cs.borderTopColor);
    css.push(`border: ${px(cs.borderTopWidth)}px ${cs.borderTopStyle} ${t ? `var(${t.v})` : hex(cs.borderTopColor).split(' ')[0]};`);
  }

  // Typography
  const hasText = !!ownText(el) || (el.children.length === 0 && !!el.textContent?.trim());
  if (hasText) {
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').replace(' Variable', '');
    const lh = cs.lineHeight === 'normal' ? 'Auto' : String(px(cs.lineHeight));
    html += `<section><h4>${esc(S.type)}</h4>`;
    html += `<div class="pf-ip__font"><b>${esc(fam)}</b><span>${cs.fontWeight} · ${px(cs.fontSize)}/${lh}${parseFloat(cs.letterSpacing) ? ` · ${parseFloat(cs.letterSpacing).toFixed(1)}` : ''}</span></div>`;
    html += `<div class="pf-ip__color">${color(cs.color)}</div></section>`;
    const t = token(cs.color);
    css.push(`font: ${cs.fontWeight} ${px(cs.fontSize)}px/${lh === 'Auto' ? 'normal' : `${lh}px`} '${fam}';`, `color: ${t ? `var(${t.v})` : hex(cs.color).split(' ')[0]};`);
  }

  // Code
  lastCss = css.join('\n');
  html += `<section><div class="pf-ip__codehead"><h4>${esc(S.code)}</h4><button type="button" class="pf-ip__copy" data-insp-copy>${esc(S.copy)}</button></div><pre class="pf-ip__code">${css.map((l) => {
    const [k, ...v] = l.split(':');
    return `<span class="k">${esc(k)}</span>:${esc(v.join(':'))}`;
  }).join('\n')}</pre></section>`;
  body.innerHTML = html;
}
panel?.addEventListener('click', async (e) => {
  if (!(e.target as Element).closest('[data-insp-copy]')) return;
  try {
    await navigator.clipboard.writeText(lastCss);
    showSnackbar(S.copied);
  } catch {}
});

/* ---------- События ---------- */
const skip = (el: Element | null) => !el || !!el.closest('[data-insp], [data-insp-panel], [data-insp-bar], [data-inspect-toggle], .snackbar, .site-cursor') || el === document.body || el === root;
function onMove(e: PointerEvent) {
  const el = e.target as HTMLElement;
  if (skip(el)) {
    if (hovered) {
      hovered = null;
      draw();
    }
    return;
  }
  // у svg-иконки берём саму иконку, а не path внутри
  const t = (el.closest('svg') as unknown as HTMLElement) ?? el;
  if (t !== hovered) {
    hovered = t;
    draw();
  }
}
function onClick(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (skip(el)) return;
  // Пока Inspect включён, клики выделяют слой, а не нажимают ссылки и кнопки
  e.preventDefault();
  e.stopPropagation();
  selected = (el.closest('svg') as unknown as HTMLElement) ?? el;
  fillPanel();
  draw();
}
const redraw = () => on && requestAnimationFrame(draw);

export function setInspect(next: boolean) {
  if (next === on) return;
  on = next;
  root.classList.toggle('is-inspecting', on);
  document.querySelectorAll('[data-inspect-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  if (ui) ui.hidden = !on;
  if (panel) panel.hidden = !on;
  if (bar) bar.hidden = !on;
  if (on) {
    buildTokens();
    selected = null;
    hovered = null;
    fillPanel();
    draw();
    addEventListener('pointerover', onMove, true);
    addEventListener('click', onClick, true);
    addEventListener('scroll', redraw, { passive: true });
    addEventListener('resize', redraw);
  } else {
    removeEventListener('pointerover', onMove, true);
    removeEventListener('click', onClick, true);
    removeEventListener('scroll', redraw);
    removeEventListener('resize', redraw);
    meas?.replaceChildren();
    pads?.replaceChildren();
  }
}
export const inspecting = () => on;
/** Esc: сначала снимает выделение, потом выключает режим */
export function inspectEscape() {
  if (!on) return false;
  if (selected) {
    selected = null;
    fillPanel();
    draw();
  } else setInspect(false);
  return true;
}
bar?.querySelector('[data-insp-exit]')?.addEventListener('click', () => setInspect(false));
// Тема поменялась - перечитываем токены
new MutationObserver(() => {
  if (!on) return;
  buildTokens();
  fillPanel();
}).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
