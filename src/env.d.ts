/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Живые настройки из KV, кладёт src/middleware.ts */
    settings?: import('./lib/settings-core').Settings;
    /** Префикс ссылок портфолио: '' на portfolio.murkas.net, '/portfolio' на murkas.net */
    pfBase?: string;
  }
}
