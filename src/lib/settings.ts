// Чтение настроек на стороне сайта. cacheTtl: Worker держит значение
// у себя до 60 с, поэтому KV читается редко, а переключение ботом
// доходит до посетителей максимум за минуту.
import { env } from 'cloudflare:workers';
import { SETTINGS_KEY, mergeSettings, defaultSettings, type Settings } from './settings-core';

export async function getSettings(): Promise<Settings> {
  try {
    return mergeSettings(await env.SETTINGS.get(SETTINGS_KEY, { type: 'json', cacheTtl: 60 }));
  } catch (err) {
    console.error('getSettings failed', err);
    return defaultSettings();
  }
}
