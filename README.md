# 🍉 murkas.net

**English** · [Русский](README.ru.md)

Personal site of Murkas, a furry designer and developer from Toronto 🇨🇦

Fursona, art, portfolio and contacts, all in one place in the near future :0

**🌐 Come say hi:** [murkas.net](https://murkas.net)

![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)
![Figma](https://img.shields.io/badge/Designed_in-Figma-F24E1E?logo=figma&logoColor=white)

> 🚧 Still under construction: the tail is getting fluffier, pages are popping up one by one

## 🧰 What it's made of

- **[Astro](https://astro.build)**: a static site, no heavy frameworks, just a pinch of vanilla JS
- **Material 3**: the design system lives in Figma (*Murkas M3 Kit*)
- **[Rubik](https://fonts.google.com/specimen/Rubik)**: the font, via `@fontsource-variable/rubik`
- **Cloudflare Workers**: where the site is served from

## 🚀 Run it locally

You'll need **Node.js 22+**

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # build to ./dist
npm run preview   # preview the production build
```

## 🗂️ What lives where

```text
src/
├── pages/
│   ├── index.astro         # home (bento)
│   ├── events / photos / arts.astro
│   ├── characters / fursuits / portfolio.astro   # "page in progress" for now
│   ├── 404.astro           # one 404 for both languages
│   ├── admin.astro         # theme playground (temporary)
│   └── ru/                 # Russian versions of pages
├── components/
│   ├── pages/              # page bodies (Home, Events, Photos, Arts), shared by en/ru
│   ├── Page.astro          # page wrapper: maintenance / work-in-progress / content
│   ├── Layout.astro        # <head>, top bar, footer
│   ├── Placeholder.astro   # "site closed" and "page in progress" screens
│   ├── ThemeInit.astro     # sets the theme before first paint, so nothing flickers
│   ├── NotFound.astro      # 404 with the custom cursor
│   └── AdminPage.astro     # theme playground UI
├── data/
│   ├── site.ts             # maintenance switch, page statuses, socials
│   └── mock.ts             # temporary data until the backend exists
├── scripts/gallery.ts      # photo/art filters
├── i18n/
│   └── ui.ts               # all strings (en / ru) + helpers
└── styles/
    ├── tokens.css          # colors exported from Figma
    └── theme.css           # fonts, M3 type scale, buttons
public/                     # favicon and other static stuff
wrangler.jsonc              # Cloudflare config
```

## 🗄️ Backend (Cloudflare)

The whole site renders on Cloudflare Workers (`output: 'server'`), so data from the database and switches from the bot show up right away, with no rebuild. HTML is cached for 30 seconds.

| Binding    | Service | What lives there                                         |
| :--------- | :------ | :------------------------------------------------------- |
| `DB`       | D1      | events, photos, art, people, uploads (`migrations/`)     |
| `MEDIA`    | R2      | `pending/` → `media/` (published), `rejected/`           |
| `SETTINGS` | KV      | "Now" status, maintenance switch, page statuses          |

First-time setup (once):

```sh
npx wrangler login
npx wrangler d1 create murkas-db              # copy database_id into wrangler.jsonc
npx wrangler kv namespace create SETTINGS     # copy id into wrangler.jsonc
npx wrangler r2 bucket create murkas-media
npm run db:migrate                            # create tables in the real database
```

Local development uses a local copy of everything (`.wrangler/`):

```sh
npm run db:migrate:local
npm run db:seed:local    # fill it with test data from src/data/mock.ts
npm run dev
```

API so far: `GET /api/health`, `GET /api/events`

### 🕐 The "Now" card

Worked out on every request by `src/lib/now-core.ts`, first match wins: manual `/now` → short events with a time (on the way, at the event, heading home) → sleep → con day → Canadian holiday → classes (on the way, break, in class, lunch, heading home) → Russian holiday → `/default`.

Classes and the daily routine live in `src/data/schedule.ts` (add a new term there every semester), holidays are calculated in `src/lib/holidays.ts`. Everything is in Toronto time.

### 📤 Uploads

Visitors upload photos and art from the upload tile (or by dropping files anywhere on the page). Code: `src/components/UploadTile.astro`, `src/scripts/upload.ts`, `src/pages/api/upload/*`.

1. The browser prepares the files: photos get re-encoded (long side 2560, or almost lossless in "Full quality"), which also strips EXIF and location data. Art keeps its quality; JPEG metadata is cut out.
2. `POST /api/upload/batch` checks Turnstile, the fields, the per-IP daily limit (`/limit` in the bot, 300 by default) and free space in R2 (stops at 90%).
3. `PUT /api/upload/file` for each file → R2 `pending/`. Duplicates are skipped by SHA-256.
4. `POST /api/upload/finish` → the bot gets the batch (service binding `BOT` → `BotRPC.notifyBatch`).
5. In the bot: accept all / reject all with a reason / go one by one (accept, blur later, reject, delete, character, category, pin). Accepted files move to `media/` and are served from `/media/<id>.<ext>` with a long cache. Rejected ones sit in `rejected/` until you clean them up with `/rejected`.

Setup: create a Turnstile widget for `murkas.net` in the Cloudflare dashboard, put its site key into `TURNSTILE_SITE_KEY` in `wrangler.jsonc` and the secret into `npx wrangler secret put TURNSTILE_SECRET`. Locally, copy `.dev.vars.example` to `.dev.vars` (Cloudflare's test keys, the check always passes).

To run the site and the bot together locally (so the bot receives uploads):

```sh
npm run dev:all
```

### 🤖 Moderation bot (`bot/`)

A separate Worker (`murkas-bot`) on the same database and KV. Only the IDs in `ADMIN_IDS` (`bot/wrangler.jsonc`) can use it; everyone else gets silence.

| Command        | What it does                                              |
| :------------- | :-------------------------------------------------------- |
| `/status`      | what's on the site right now                              |
| `/maintenance` | close or open the whole site                              |
| `/pages`       | toggle pages between ready ✅ and "in progress" 🚧          |
| `/now`         | manual "Now" status on top of the schedule, e.g. `Walking \| Гуляю 2ч`; `/now авто` brings the schedule back |
| `/default`     | what "Now" says when nothing else is going on             |
| `/events`      | list events, tap one to edit or delete it                 |
| `/addevent`    | add an event step by step                                 |
| `/pending`     | upload batches waiting for review                         |
| `/rejected`    | rejected files: restore or delete for good                |
| `/limit`       | how many files one IP can upload per day                  |

First deploy:

```sh
npm run db:migrate                                            # bot_state table
npx wrangler secret put TG_BOT_TOKEN -c bot/wrangler.jsonc       # token from @BotFather
npx wrangler secret put TG_WEBHOOK_SECRET -c bot/wrangler.jsonc  # any long random string
npm run bot:deploy
```

Then open `https://murkas-bot.<account>.workers.dev/setup?key=<TG_WEBHOOK_SECRET>` once: it connects the webhook and the command menu.

Locally: copy `bot/.dev.vars.example` to `bot/.dev.vars` and run `npm run bot:dev`. It shares the local database with `npm run dev`. With `TG_DRY=1` the bot doesn't send anything to Telegram and prints its replies to the console instead.

## 🎨 Themes

Colors live in `src/styles/tokens.css` as CSS variables (`--md-primary`, `--md-surface`, …). They come straight from the Figma kit, so **hands off**: change them in Figma and re-export

The theme is set with attributes on `<html>`:

| Attribute    | Values                                 |
| :----------- | :------------------------------------- |
| `data-theme` | `watermelon` 🍉 (the only one for now) |
| `data-mode`  | `light` ☀️ / `dark` 🌙                   |

Light or dark follows the system, and you can pick one manually on `/admin` (it's remembered in `localStorage` under `murkas-theme`)

## 🚧 Maintenance and unfinished pages

Toggled from the bot (`/maintenance`, `/pages`) and stored in Cloudflare KV, live within a minute:

- maintenance closes the whole site with the "closed for a bit" screen
- a page "in progress" shows the "page in progress" screen instead of its content

`src/data/site.ts` only has the defaults, used while KV is empty

## 🌍 Languages

English lives at `/`, Russian at `/ru/`. All strings are in `src/i18n/ui.ts`: add a key to both `en` and `ru`, then call `useTranslations(lang)` on the page

There's one 404 page for both languages. The server always sends the English one, and a tiny script translates it to Russian if you got lost somewhere under `/ru/...` 🐾

## 📜 License

© 2026 Murkas, all rights reserved. Want to use something? Write to [furry@murkas.net](mailto:furry@murkas.net)

---

Made by Murkas
