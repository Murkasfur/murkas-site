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
│   ├── index.astro         # home
│   ├── 404.astro           # one 404 for both languages
│   ├── admin.astro         # theme playground (temporary)
│   └── ru/                 # Russian versions of pages
├── components/
│   ├── ThemeInit.astro     # sets the theme before first paint, so nothing flickers
│   ├── NotFound.astro      # 404 with the custom cursor
│   └── AdminPage.astro     # theme playground UI
├── i18n/
│   └── ui.ts               # all strings (en / ru) + helpers
└── styles/
    ├── tokens.css          # colors exported from Figma
    └── theme.css           # fonts, M3 type scale, buttons
public/                     # favicon and other static stuff
wrangler.jsonc              # Cloudflare config
```

## 🎨 Themes

Colors live in `src/styles/tokens.css` as CSS variables (`--md-primary`, `--md-surface`, …). They come straight from the Figma kit, so **hands off**: change them in Figma and re-export

The theme is set with attributes on `<html>`:

| Attribute    | Values                                 |
| :----------- | :------------------------------------- |
| `data-theme` | `watermelon` 🍉 (the only one for now) |
| `data-mode`  | `light` ☀️ / `dark` 🌙                   |

Light or dark follows the system, and you can pick one manually on `/admin` (it's remembered in `localStorage` under `murkas-theme`)

## 🌍 Languages

English lives at `/`, Russian at `/ru/`. All strings are in `src/i18n/ui.ts`: add a key to both `en` and `ru`, then call `useTranslations(lang)` on the page

There's one 404 page for both languages. The server always sends the English one, and a tiny script translates it to Russian if you got lost somewhere under `/ru/...` 🐾

## 📜 License

© 2026 Murkas, all rights reserved. Want to use something? Write to [furry@murkas.net](mailto:furry@murkas.net)

---

Made by Murkas
