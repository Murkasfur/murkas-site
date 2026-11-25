// Погода в Торонто для карточки «Сейчас» и статуса по погоде.
// Источник - Open-Meteo (бесплатно, без ключа). Кэш 30 минут в Cloudflare Cache,
// так что запрос к Open-Meteo уходит не чаще пары раз в час, сколько бы ни было посетителей.
// Без зависимостей: используется и сайтом, и ботом (bot/).

export type Weather = {
  temp: number; // °C
  feels: number; // ощущается как, °C
  code: number; // код погоды WMO
  isDay: boolean;
};

const URL_ =
  'https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832' +
  '&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=America%2FToronto';
const TTL = 30 * 60;

export async function getWeather(): Promise<Weather | null> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request('https://weather.murkas.internal/toronto');
  try {
    const hit = await cache?.match(key);
    if (hit) return (await hit.json()) as Weather;
  } catch {
    /* кэша нет - не страшно */
  }
  try {
    const res = await fetch(URL_, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const c = ((await res.json()) as { current?: Record<string, number> }).current;
    if (!c || typeof c.temperature_2m !== 'number') return null;
    const w: Weather = { temp: c.temperature_2m, feels: c.apparent_temperature ?? c.temperature_2m, code: c.weather_code ?? 0, isDay: c.is_day === 1 };
    await cache
      ?.put(key, new Response(JSON.stringify(w), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${TTL}` } }))
      .catch(() => {});
    return w;
  } catch {
    return null; // Open-Meteo недоступен - просто без погоды
  }
}

/** +28°, −3°, 0° */
export const deg = (n: number) => {
  const r = Math.round(n);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}°`;
};

/** Значок и описание по коду WMO */
export function describe(w: Weather): { icon: string; ru: string; en: string } {
  const c = w.code;
  if (c === 0) return { icon: w.isDay ? '☀️' : '🌙', ru: 'Ясно', en: 'Clear' };
  if (c <= 2) return { icon: w.isDay ? '🌤️' : '☁️', ru: 'Переменная облачность', en: 'Partly cloudy' };
  if (c === 3) return { icon: '☁️', ru: 'Пасмурно', en: 'Overcast' };
  if (c === 45 || c === 48) return { icon: '🌫️', ru: 'Туман', en: 'Fog' };
  if (c >= 51 && c <= 57) return { icon: '🌦️', ru: 'Морось', en: 'Drizzle' };
  if (c === 66 || c === 67) return { icon: '🧊', ru: 'Ледяной дождь', en: 'Freezing rain' };
  if (c >= 61 && c <= 65) return { icon: '🌧️', ru: c === 65 ? 'Ливень' : 'Дождь', en: c === 65 ? 'Heavy rain' : 'Rain' };
  if (c >= 71 && c <= 77) return { icon: '🌨️', ru: c === 75 ? 'Сильный снег' : 'Снег', en: c === 75 ? 'Heavy snow' : 'Snow' };
  if (c >= 80 && c <= 82) return { icon: '🌧️', ru: c === 82 ? 'Ливень' : 'Дождь', en: c === 82 ? 'Downpour' : 'Showers' };
  if (c === 85 || c === 86) return { icon: '🌨️', ru: c === 86 ? 'Сильный снег' : 'Снег', en: c === 86 ? 'Heavy snow' : 'Snow showers' };
  if (c >= 95) return { icon: '⛈️', ru: 'Гроза', en: 'Thunderstorm' };
  return { icon: '🌡️', ru: 'Погода', en: 'Weather' };
}

/** Непогода, в которую сидим дома: ливень, сильный снег, ледяной дождь, гроза */
const STORM: Record<number, [string, string]> = {
  65: ['ливень', 'downpour'], 82: ['ливень', 'downpour'],
  75: ['снегопад', 'heavy snow'], 86: ['снегопад', 'heavy snow'],
  66: ['ледяной дождь', 'freezing rain'], 67: ['ледяной дождь', 'freezing rain'],
  95: ['гроза', 'thunderstorm'], 96: ['гроза', 'thunderstorm'], 99: ['гроза', 'thunderstorm'],
};
export const COLD_FEELS = -20; // ощущается так холодно или холоднее - сидим дома
export const HOT_TEMP = 25; // жарче этого - слишком жарко для прогулок

/** Статус по погоде (заменяет только статус по умолчанию) или null, если погода обычная */
export function weatherStatus(w: Weather | null | undefined): { ru: string; en: string } | null {
  if (!w) return null;
  const storm = STORM[w.code];
  if (storm) return { ru: `Сижу дома · на улице ${storm[0]}`, en: `Staying in · ${storm[1]} outside` };
  if (w.feels <= COLD_FEELS) return { ru: `Сижу дома · ощущается ${deg(w.feels)}`, en: `Staying in · feels like ${deg(w.feels)}` };
  if (w.temp > HOT_TEMP) return { ru: `Слишком жарко для прогулок · ${deg(w.temp)}`, en: `Too hot for walks · ${deg(w.temp)}` };
  return null;
}
