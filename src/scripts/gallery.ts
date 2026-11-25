// Галерея (фото и арты): фильтры, сортировка, «Показать ещё» и раскладка masonry.
// Пока данные лежат в HTML; когда появится API, этот же код будет раскладывать ответ.

const PAGE = 8;

export function initGallery(root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-item]'));
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const more = root.querySelector<HTMLElement>('[data-more]');
  const state = { q: '', character: 'all', cat: 'all', person: 'all', year: 'all', sort: 'new', limit: PAGE };
  if (!grid) return;

  grid.classList.add('is-js');

  const columnCount = () => {
    const w = grid.clientWidth;
    return w >= 900 ? 4 : w >= 640 ? 3 : w >= 400 ? 2 : 1;
  };

  const matches = (el: HTMLElement) => {
    const d = el.dataset;
    return (
      (!state.q || (d.search || '').includes(state.q)) &&
      (state.character === 'all' || d.character === state.character || d.character === 'both') &&
      (state.cat === 'all' || d.cat === state.cat) &&
      (state.person === 'all' || d.person === state.person) &&
      (state.year === 'all' || d.year === state.year)
    );
  };

  const render = () => {
    // Закреплённые всегда первыми, дальше по дате
    const list = items.filter(matches).sort((a, b) => {
      const pin = Number(b.dataset.pinned === '1') - Number(a.dataset.pinned === '1');
      if (pin) return pin;
      const da = a.dataset.date || '';
      const db = b.dataset.date || '';
      return state.sort === 'new' ? db.localeCompare(da) : da.localeCompare(db);
    });
    const visible = list.slice(0, state.limit);
    // Окно просмотра листает в том же порядке и с теми же фильтрами
    document.dispatchEvent(new CustomEvent('gallery:list', { detail: list.map((el) => el.dataset.id || '') }));

    // Раскладка по рядам: следующий элемент - в самую короткую колонку
    const cols = Array.from({ length: columnCount() }, () => {
      const c = document.createElement('div');
      c.className = 'masonry__col';
      return c;
    });
    grid.replaceChildren(...cols);
    const heights = cols.map(() => 0);
    for (const el of visible) {
      const i = heights.indexOf(Math.min(...heights));
      cols[i].appendChild(el);
      heights[i] += el.getBoundingClientRect().height + 16;
    }
    // Остальные прячем в «запас», чтобы не терять их из DOM
    for (const el of items) if (!visible.includes(el)) el.remove();

    if (empty) empty.hidden = list.length > 0;
    if (more) more.hidden = list.length <= state.limit;
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
  pressGroup('[data-character]', 'character');
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
    root.querySelectorAll<HTMLSelectElement>('[data-person], [data-year]').forEach((s) => (s.value = 'all'));
    root.querySelectorAll<HTMLElement>('[data-character], [data-cat-btn]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.value === 'all')),
    );
    rerender();
  });

  more?.addEventListener('click', () => {
    state.limit += PAGE;
    render();
  });

  // Перераскладка при смене ширины (меняется число колонок)
  let lastCols = columnCount();
  new ResizeObserver(() => {
    const c = columnCount();
    if (c !== lastCols) {
      lastCols = c;
      render();
    }
  }).observe(grid);

  // ?q=... в адресе (ссылка «12 фото →» со страницы ивентов) - сразу ищем
  const q0 = new URLSearchParams(location.search).get('q');
  if (q0) {
    state.q = q0.trim().toLowerCase();
    root.querySelectorAll<HTMLInputElement>('[data-q]').forEach((i) => (i.value = q0));
  }

  render();
}
