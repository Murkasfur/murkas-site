// Галерея (фото и арты): фильтры, сортировка, «Показать ещё» и раскладка masonry.
// Пока данные лежат в HTML; когда появится API, этот же код будет раскладывать ответ.

import { enhanceSelect } from './select-menu';

// Сколько карточек показывать сразу и сколько добавлять за раз
const PAGE = 48;

export function initGallery(root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-item]'));
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const more = root.querySelector<HTMLElement>('[data-more]');
  const end = root.querySelector<HTMLElement>('[data-more-end]');
  const state = { q: '', character: 'all', cat: 'all', person: 'all', year: 'all', sort: 'new', limit: PAGE };
  if (!grid) return;

  grid.classList.add('is-js');

  const columnCount = () => {
    const w = grid.clientWidth;
    return w >= 900 ? 4 : w >= 640 ? 3 : w >= 300 ? 2 : 1;
  };

  const matches = (el: HTMLElement) => {
    const d = el.dataset;
    return (
      (!state.q || (d.search || '').includes(state.q)) &&
      (state.character === 'all' || d.character === state.character || d.character === 'both') &&
      (state.cat === 'all' || ` ${d.cat ?? ''} `.includes(` ${state.cat} `)) &&
      (state.person === 'all' || d.person === state.person) &&
      (state.year === 'all' || d.year === state.year)
    );
  };

  // append: дописать новые карточки в уже стоящие колонки, не пересобирая сетку
  const render = (append = false) => {
    // Закреплённые всегда первыми, дальше по дате
    const list = items.filter(matches).sort((a, b) => {
      const pin = Number(b.dataset.pinned === '1') - Number(a.dataset.pinned === '1');
      if (pin) return pin;
      // new/old - по дате добавления на сайт, dnew/dold - по дате съёмки/создания
      const key = state.sort.startsWith('d') ? 'date' : 'added';
      const da = a.dataset[key] || '';
      const db = b.dataset[key] || '';
      // Без даты - всегда в конце
      if (!da !== !db) return da ? -1 : 1;
      const desc = state.sort === 'new' || state.sort === 'dnew';
      return desc ? db.localeCompare(da) : da.localeCompare(db);
    });
    const visible = list.slice(0, state.limit);
    // Окно просмотра листает в том же порядке и с теми же фильтрами
    document.dispatchEvent(new CustomEvent('gallery:list', { detail: list.map((el) => el.dataset.id || '') }));

    // Раскладка по рядам: следующий элемент - в самую короткую колонку
    let cols = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .masonry__col'));
    let heights: number[];
    let toPlace = visible;
    if (append && cols.length === columnCount()) {
      // Уже показанные остаются на месте, добавляем только новые
      toPlace = visible.filter((el) => !el.isConnected);
      heights = cols.map((c) => c.getBoundingClientRect().height);
    } else {
      // Пока сетка пересобирается, держим её высоту - иначе страница
      // на мгновение становится короткой и браузер прыгает наверх
      const y = window.scrollY;
      grid.style.minHeight = `${grid.offsetHeight}px`;
      cols = Array.from({ length: columnCount() }, () => {
        const c = document.createElement('div');
        c.className = 'masonry__col';
        return c;
      });
      grid.replaceChildren(...cols);
      heights = cols.map(() => 0);
      requestAnimationFrame(() => {
        grid.style.minHeight = '';
        if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'instant' });
      });
    }
    for (const el of toPlace) {
      const i = heights.indexOf(Math.min(...heights));
      cols[i].appendChild(el);
      heights[i] += el.getBoundingClientRect().height + 16;
    }
    // Остальные прячем в «запас», чтобы не терять их из DOM
    for (const el of items) if (!visible.includes(el)) el.remove();

    if (empty) empty.hidden = list.length > 0;
    const all = list.length <= state.limit;
    if (more) more.hidden = all;
    // «Больше нет» - только когда что-то найдено и всё уже показано
    if (end) end.hidden = !all || list.length === 0;
  };

  const rerender = (resetLimit = true) => {
    if (resetLimit) state.limit = PAGE;
    render();
  };

  root.querySelector<HTMLInputElement>('[data-q]')?.addEventListener('input', (e) => {
    state.q = (e.target as HTMLInputElement).value.trim().toLowerCase();
    rerender();
  });

  const pressGroup = (selector: string, key: 'character' | 'cat') => {
    const buttons = root.querySelectorAll<HTMLElement>(selector);
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        state[key] = b.dataset.value || 'all';
        rerender();
      }),
    );
  };
  // только кнопки: у самих карточек тоже есть data-character
  pressGroup('button[data-character]', 'character');
  pressGroup('[data-cat-btn]', 'cat');

  const selects: [string, 'person' | 'year' | 'sort'][] = [
    ['[data-person]', 'person'],
    ['[data-year]', 'year'],
    ['[data-sort]', 'sort'],
  ];
  for (const [sel, key] of selects) {
    root.querySelector<HTMLSelectElement>(sel)?.addEventListener('change', (e) => {
      state[key] = (e.target as HTMLSelectElement).value;
      rerender();
    });
  }

  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    Object.assign(state, { q: '', character: 'all', cat: 'all', person: 'all', year: 'all' });
    root.querySelectorAll<HTMLInputElement>('[data-q]').forEach((i) => (i.value = ''));
    root.querySelectorAll<HTMLSelectElement>('[data-person], [data-year]').forEach((s) => {
      s.value = 'all';
      s.dispatchEvent(new Event('select:sync'));
    });
    root.querySelectorAll<HTMLElement>('button[data-character], [data-cat-btn]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.value === 'all')),
    );
    rerender();
  });

  let io: IntersectionObserver | null = null;
  const loadMore = () => {
    if (!more || more.hidden) return;
    state.limit += PAGE;
    render(true);
    // Если кнопка всё ещё рядом (экран высокий) - проверим ещё раз
    if (io) {
      io.unobserve(more);
      requestAnimationFrame(() => io?.observe(more));
    }
  };
  more?.addEventListener('click', loadMore);
  // Подгружаем заранее, когда до кнопки осталось меньше пары экранов
  if (more && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
      rootMargin: '0px 0px 1200px 0px',
    });
    io.observe(more);
  }

  // Перераскладка при смене ширины (меняется число колонок)
  let lastCols = columnCount();
  new ResizeObserver(() => {
    const c = columnCount();
    if (c !== lastCols) {
      lastCols = c;
      render();
    }
  }).observe(grid);

  root.querySelectorAll<HTMLSelectElement>('.select select').forEach(enhanceSelect);

  // Телефон: фотограф/год/сброс живут в шторке «Фильтры»
  const sheet = root.querySelector<HTMLElement>('[data-filters-sheet]');
  const scrim = root.querySelector<HTMLElement>('[data-filters-scrim]');
  const badge = root.querySelector<HTMLElement>('[data-filters-count]');
  const setSheet = (open: boolean) => {
    sheet?.classList.toggle('is-open', open);
    if (scrim) scrim.hidden = !open;
    document.documentElement.classList.toggle('sheet-open', open);
  };
  root.querySelector('[data-filters-open]')?.addEventListener('click', () => setSheet(true));
  root.querySelector('[data-filters-done]')?.addEventListener('click', () => setSheet(false));
  scrim?.addEventListener('click', () => setSheet(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && sheet?.classList.contains('is-open') && setSheet(false));
  const syncBadge = () => {
    if (!badge) return;
    const n = (state.person !== 'all' ? 1 : 0) + (state.year !== 'all' ? 1 : 0);
    badge.textContent = String(n);
    badge.hidden = n === 0;
  };
  root.addEventListener('change', syncBadge);
  root.querySelector('[data-reset]')?.addEventListener('click', () => setTimeout(syncBadge));

  // ?q=... в адресе (ссылка «12 фото →» со страницы ивентов) - сразу ищем
  const q0 = new URLSearchParams(location.search).get('q');
  if (q0) {
    state.q = q0.trim().toLowerCase();
    root.querySelectorAll<HTMLInputElement>('[data-q]').forEach((i) => (i.value = q0));
  }

  render();
}
