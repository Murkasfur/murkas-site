// Всплывающее сообщение снизу (Material 3 snackbar): успех или ошибка.
// showSnackbar('Готово') / showSnackbar('Ошибка', { error: true, action: { label: 'Повторить', run } })

type Opts = { error?: boolean; action?: { label: string; run: () => void }; ms?: number };

let host: HTMLElement | null = null;
let timer = 0;

export function showSnackbar(text: string, opts: Opts = {}) {
  if (!host) {
    host = document.createElement('div');
    host.className = 'snackbar';
    document.body.append(host);
  }
  host.replaceChildren();
  host.classList.toggle('is-error', !!opts.error);
  host.setAttribute('role', opts.error ? 'alert' : 'status');

  const msg = document.createElement('span');
  msg.className = 'snackbar__text';
  msg.textContent = text;
  host.append(msg);
  if (opts.action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'snackbar__action';
    btn.textContent = opts.action.label;
    btn.addEventListener('click', () => {
      hide();
      opts.action!.run();
    });
    host.append(btn);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'snackbar__close';
  close.setAttribute('aria-label', '×');
  close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  close.addEventListener('click', hide);
  host.append(close);

  requestAnimationFrame(() => host!.classList.add('is-visible'));
  clearTimeout(timer);
  timer = window.setTimeout(hide, opts.ms ?? (opts.error ? 9000 : 7000));
}

function hide() {
  host?.classList.remove('is-visible');
}
