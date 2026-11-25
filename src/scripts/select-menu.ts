// Красивые выпадающие списки вместо системных <select> (фильтры галерей).
// Сам <select> остаётся (скрытым) - на нём висит вся логика фильтров, сюда только
// приходят выборы: меню ставит value и шлёт обычное событие change.
// Если value поменяли из кода (кнопка «Сбросить») - пошли 'select:sync', и подпись обновится.

const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
let openMenu: (() => void) | null = null;

export function enhanceSelect(select: HTMLSelectElement) {
  const wrap = select.closest<HTMLElement>('.select');
  if (!wrap || wrap.dataset.enhanced) return;
  wrap.dataset.enhanced = '1';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'select__btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  btn.append(label);
  const menu = document.createElement('ul');
  menu.className = 'select__menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  select.classList.add('visually-hidden');
  select.tabIndex = -1;
  select.after(btn, menu);

  const sync = () => {
    const opt = select.selectedOptions[0];
    label.textContent = opt?.textContent ?? '';
    // выбран не первый пункт («Все») - подсвечиваем, что фильтр включён
    btn.classList.toggle('is-set', select.selectedIndex > 0 && select.options[0]?.value === 'all');
    menu.replaceChildren(
      ...Array.from(select.options).map((o) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.tabIndex = -1;
        li.dataset.value = o.value;
        li.setAttribute('aria-selected', String(o.selected));
        li.innerHTML = `<span></span>${check}`;
        li.firstElementChild!.textContent = o.textContent;
        return li;
      }),
    );
  };

  const close = (focus = false) => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (openMenu === closeThis) openMenu = null;
    if (focus) btn.focus();
  };
  const closeThis = () => close();
  const open = () => {
    openMenu?.();
    sync();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    // у правого края экрана меню раскрываем влево
    const r = wrap.getBoundingClientRect();
    menu.classList.toggle('is-right', r.left + Math.max(menu.offsetWidth, 200) > window.innerWidth - 16);
    (menu.querySelector<HTMLElement>('[aria-selected="true"]') ?? menu.firstElementChild as HTMLElement)?.focus();
    openMenu = closeThis;
  };
  const choose = (li: HTMLElement) => {
    if (select.value !== li.dataset.value) {
      select.value = li.dataset.value ?? '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync();
    close(true);
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    menu.hidden ? open() : close();
  });
  menu.addEventListener('click', (e) => {
    e.preventDefault(); // не даём <label> переслать клик в скрытый <select>
    const li = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (li) choose(li);
  });
  wrap.addEventListener('keydown', (e) => {
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="option"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape' && !menu.hidden) {
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (menu.hidden) return open();
      items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault();
      choose(items[i]);
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !wrap.contains(e.target as Node)) close();
  });
  select.addEventListener('select:sync', sync);
  select.addEventListener('change', sync);
  sync();
}
