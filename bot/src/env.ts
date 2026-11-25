export interface Env {
  DB: D1Database;
  SETTINGS: KVNamespace;
  ADMIN_IDS: string;
  SITE_URL: string;
  TG_BOT_TOKEN: string;
  TG_WEBHOOK_SECRET: string;
  /** '1' = не ходить в Telegram, а печатать запросы в лог (для локальных тестов) */
  TG_DRY?: string;
}
