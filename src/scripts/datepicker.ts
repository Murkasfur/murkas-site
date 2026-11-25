// Свой календарь вместо системного <input type="date"> (дата создания арта).
// Значение - в скрытом <input name="..."> в формате YYYY-MM-DD.
// Будущие даты недоступны. Клик по «Ноябрь 2026» - выбор года (арты бывают старые).

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const svg = (d: string, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
const LEFT = 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z';
const RIGHT = 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z';
const DOWN = 'M7 10l5 5 5-5z';

export function initDatePicker(wrap: HTMLElement, lang: string) {
  const input = wrap.querySelector<HTMLInputElement>('input[type="hidden"]')!;
  const btn = wrap.querySelector<HTMLButtonElement>('[data-date-btn]')!;
  const label = wrap.querySelector<HTMLElement>('[data-date-label]')!;
  const pop = wrap.querySelector<HTMLElement>('[data-date-pop]')!;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-CA';
  const t = lang === 'ru' ? { clear: 'Очистить', today: 'Сегодня', ph: 'дд.мм.гггг' } : { clear: 'Clear', today: 'Today', ph: 'dd.mm.yyyy' };

  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  let view = { y: now.getFullYear(), m: now.getMonth() };
  // Границы задаются атрибутами data-min / data-max (например, дни ивента); сегодня - всегда предел
  const lo = () => wrap.dataset.min || '';
  const hi = () => (wrap.dataset.max && wrap.dataset.max < todayIso ? wrap.dataset.max : todayIso);
  const ok = (v: string) => v >= lo() && v <= hi();
  let mode: 'days' | 'years' = 'days';

  // Пн-Вс для русского, Вс-Сб для английского
  const firstDay = lang === 'ru' ? 1 : 0;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + ((firstDay + i) % 7)).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 2),
  );
  const monthName = (y: number, m: number) => {
    const s = new Date(y, m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const showLabel = () => {
    const v = input.value;
    label.textContent = v ? new Date(`${v}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '') : t.ph;
    label.classList.toggle('is-empty', !v);
  };

  const render = () => {
    const head = `<div class="dp__head">
      <button type="button" class="dp__title" data-dp="mode">${monthName(view.y, view.m)} ${svg(DOWN, 18)}</button>
      ${mode === 'days' ? `<span class="dp__nav">
        <button type="button" class="icon-btn" data-dp="prev" aria-label="←" ${lo() && iso(view.y, view.m, 1) <= lo() ? 'disabled' : ''}>${svg(LEFT)}</button>
        <button type="button" class="icon-btn" data-dp="next" aria-label="→" ${iso(view.y, view.m + 1, 1) > hi() ? 'disabled' : ''}>${svg(RIGHT)}</button>
      </span>` : ''}
    </div>`;
    let body = '';
    if (mode === 'years') {
      const years = Array.from({ length: 30 }, (_, i) => now.getFullYear() - i).filter((y) => (!lo() || y >= +lo().slice(0, 4)) && y <= +hi().slice(0, 4));
      body = `<div class="dp__years">${years.map((y) => `<button type="button" data-dp-year="${y}" class="${y === view.y ? 'is-sel' : ''}">${y}</button>`).join('')}</div>`;
    } else {
      const first = new Date(view.y, view.m, 1).getDay();
      const offset = (first - firstDay + 7) % 7;
      const days = new Date(view.y, view.m + 1, 0).getDate();
      const cells: string[] = Array.from({ length: offset }, () => '<span></span>');
      for (let d = 1; d <= days; d++) {
        const v = iso(view.y, view.m, d);
        const cls = [v === input.value && 'is-sel', v === todayIso && 'is-today'].filter(Boolean).join(' ');
        cells.push(`<button type="button" data-dp-day="${v}" class="${cls}" ${ok(v) ? '' : 'disabled'}>${d}</button>`);
      }
      body = `<div class="dp__week">${weekdays.map((w) => `<span>${w}</span>`).join('')}</div><div class="dp__grid">${cells.join('')}</div>`;
    }
    pop.innerHTML = `${head}${body}<div class="dp__foot">
      <button type="button" class="md-btn md-btn--text" data-dp="clear">${t.clear}</button>
      <button type="button" class="md-btn md-btn--text" data-dp="today" ${ok(todayIso) ? '' : 'hidden'}>${t.today}</button></div>`;
  };

  const open = () => {
    const start = input.value || (lo() ? lo() : '');
    if (start) view = { y: +start.slice(0, 4), m: +start.slice(5, 7) - 1 };
    mode = 'days';
    render();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    (pop.querySelector<HTMLElement>('.is-sel, .is-today') ?? pop.querySelector<HTMLElement>('[data-dp-day]'))?.focus();
  };
  const close = (focus = false) => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focus) btn.focus();
  };
  const set = (v: string) => {
    input.value = v;
    showLabel();
    wrap.closest('.field')?.classList.remove('is-invalid');
    close(true);
  };

  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  pop.addEventListener('click', (e) => {
    // содержимое перерисовывается, и «клик мимо» иначе решил бы, что нажали вне календаря
    e.stopPropagation();
    const el = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!el || el.disabled) return;
    if (el.dataset.dpDay) return set(el.dataset.dpDay);
    if (el.dataset.dpYear) {
      view.y = +el.dataset.dpYear;
      if (view.y === now.getFullYear()) view.m = Math.min(view.m, now.getMonth());
      mode = 'days';
      return render();
    }
    const a = el.dataset.dp;
    if (a === 'mode') mode = mode === 'days' ? 'years' : 'days';
    if (a === 'prev') view = view.m ? { y: view.y, m: view.m - 1 } : { y: view.y - 1, m: 11 };
    if (a === 'next') view = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
    if (a === 'clear') return set('');
    if (a === 'today') return ok(todayIso) ? set(todayIso) : undefined;
    render();
    if (a === 'mode' && mode === 'years') pop.querySelector<HTMLElement>('.is-sel')?.scrollIntoView({ block: 'center' });
  });
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // закрыть только календарь, не всё окно
      close(true);
    }
    const cur = (document.activeElement as HTMLElement)?.dataset?.dpDay;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (cur && step) {
      e.preventDefault();
      const d = new Date(`${cur}T12:00:00`);
      d.setDate(d.getDate() + step);
      const v = iso(d.getFullYear(), d.getMonth(), d.getDate());
      if (!ok(v)) return;
      if (d.getMonth() !== view.m || d.getFullYear() !== view.y) {
        view = { y: d.getFullYear(), m: d.getMonth() };
        render();
      }
      pop.querySelector<HTMLElement>(`[data-dp-day="${v}"]`)?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!pop.hidden && !wrap.contains(e.target as Node)) close();
  });
  input.form?.addEventListener('reset', () => setTimeout(showLabel));
  input.addEventListener('datepick:sync', showLabel);
  showLabel();
}
