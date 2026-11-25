// Ответы API в одном стиле
export const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

export const error = (status: number, message: string) => json({ ok: false, error: message }, { status });
