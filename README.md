# 🍉 murkas.net

**English** · [Русский](README.ru.md)

Personal site of **Murkas**, a furry designer & developer from Toronto.
Fursona, art, portfolio and contacts, all in one place.

**🌐 Live:** [murkas.net](https://murkas.net)

![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)
![Figma](https://img.shields.io/badge/Designed_in-Figma-F24E1E?logo=figma&logoColor=white)

> 🚧 Work in progress: the site is being built page by page.

## Stack

- **[Astro](https://astro.build)**: a static site with no client framework, just a bit of vanilla JS
- **Material 3** design system, built in Figma (*Murkas M3 Kit*)
- **[Rubik](https://fonts.google.com/specimen/Rubik)** via `@fontsource-variable/rubik`
- **Cloudflare Workers** (static assets): every push to `main` deploys automatically

## Getting started

Requires **Node.js 22+**.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # build to ./dist
npm run preview   # preview the production build
```

## Project structure

```text
src/
├── pages/
│   ├── index.astro         # home
│   ├── 404.astro           # single 404 for both languages
│   ├── admin.astro         # theme playground (temporary)
│   └── ru/                 # Russian versions of pages
├── components/
│   ├── ThemeInit.astro     # sets theme + light/dark before first paint
│   ├── NotFound.astro      # 404 page with the custom cursor
│   └── AdminPage.astro     # theme playground UI
├── i18n/
│   └── ui.ts               # all UI strings (en / ru) + helpers
└── styles/
    ├── tokens.css          # color tokens exported from Figma
    └── theme.css           # fonts, M3 type scale, buttons
public/                     # favicon and static files
wrangler.jsonc              # Cloudflare Workers config
```

## Theming

Colors live in `src/styles/tokens.css` as CSS variables (`--md-primary`,
`--md-surface`, …). They are generated from the Figma kit, so **don't edit them by hand**:
change the colors in Figma and re-export instead.

The theme is set via attributes on `<html>`:

| Attribute    | Values                    |
| :----------- | :------------------------ |
| `data-theme` | `watermelon` 🍉 (default) |
| `data-mode`  | `light` / `dark`          |

Light/dark follows the system setting unless the visitor picks one on `/admin`
(saved in `localStorage` under `murkas-theme`).

## Languages

English is the default (`/`), and Russian lives under `/ru/`.
All strings are in `src/i18n/ui.ts`. To add text, add a key to both `en` and `ru`,
then use `useTranslations(lang)` in the page.

The 404 page is shared: the server always returns the English version, and a tiny inline
script switches it to Russian for `/ru/...` URLs.

## Deploy

Pushing to `main` triggers a Cloudflare build (`npm run build`), which serves `./dist`.
Unknown URLs get `404.html` (`not_found_handling: "404-page"`).

```sh
git add -A
git commit -m "your message"
git push
```

## License

© 2026 Murkas. **All rights reserved.**
The code, art, characters and other content of this repository may not be copied,
reused or redistributed without written permission.
Want to use something? Write to [furry@murkas.net](mailto:furry@murkas.net).

---

Made with 🧡 by Murkas
