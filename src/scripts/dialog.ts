// Открытие окон без «верхнего слоя» браузера (dialog.show() вместо showModal()),
// чтобы кастомный курсор оставался поверх окон. Закрытие: крестик, Esc, клик мимо.

const openDialogs = new Set<HTMLDialogElement>();

export function openDialog(d: HTMLDialogElement, opts: { scrim?: boolean } = {}) {
  if (d.open) return;
  d.show();
  d.classList.toggle('has-scrim', opts.scrim !== false);
  openDialogs.add(d);
  // Клик по открывающей кнопке не должен сразу же закрыть окно
  setTimeout(() => d.dataset.ready = '1', 0);
  (d.querySelector<HTMLElement>('[autofocus], button, a') ?? d).focus({ preventScroll: true });
}

export function closeDialog(d: HTMLDialogElement) {
  if (!d.open) return;
  d.close();
  delete d.dataset.ready;
  openDialogs.delete(d);
}

export function bindDialog(d: HTMLDialogElement | null) {
  if (!d) return;
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeDialog(d)));
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const last = Array.from(openDialogs).pop();
  if (last) closeDialog(last);
});

document.addEventListener('click', (e) => {
  for (const d of Array.from(openDialogs)) {
    if (!d.dataset.ready) continue;
    // Клик по «затемнению» вокруг окна = мимо окна
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside || e.target === d) closeDialog(d);
  }
});
