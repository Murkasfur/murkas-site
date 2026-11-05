# 🍉 murkas.net

[English](README.md) · **Русский**

Личный сайт Муркаса, фурри-дизайнера и разработчика из Торонто 🇨🇦

Фурсона, арт, портфолио и контакты в одном месте в ближайшем будущем :0

**🌐 Заглядывай:** [murkas.net](https://murkas.net)

![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)
![Figma](https://img.shields.io/badge/Designed_in-Figma-F24E1E?logo=figma&logoColor=white)

> 🚧 Тут ещё идёт стройка: хвост пушится, страницы появляются по одной

## 🧰 Из чего сделано

- **[Astro](https://astro.build)**: статический сайт без тяжёлых фреймворков, только щепотка обычного JS
- **Material 3**: дизайн-система живёт в Figma (*Murkas M3 Kit*)
- **[Rubik](https://fonts.google.com/specimen/Rubik)**: шрифт, подключённый через `@fontsource-variable/rubik`
- **Cloudflare Workers**: оттуда сайт и раздаётся

## 🚀 Как запустить у себя

Понадобится **Node.js 22+**

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # сборка в ./dist
npm run preview   # посмотреть собранную версию
```

## 🗂️ Что где лежит

```text
src/
├── pages/
│   ├── index.astro         # главная
│   ├── 404.astro           # одна 404 на оба языка
│   ├── admin.astro         # песочница тем (временная)
│   └── ru/                 # русские версии страниц
├── components/
│   ├── ThemeInit.astro     # ставит тему ещё до отрисовки, чтобы ничего не мигало
│   ├── NotFound.astro      # 404 с кастомным курсором
│   └── AdminPage.astro     # интерфейс песочницы тем
├── i18n/
│   └── ui.ts               # все тексты (en / ru) и хелперы
└── styles/
    ├── tokens.css          # цвета, выгруженные из Figma
    └── theme.css           # шрифты, типографика M3, кнопки
public/                     # фавиконка и прочая статика
wrangler.jsonc              # настройки Cloudflare
```

## 🎨 Темы

Цвета живут в `src/styles/tokens.css` в виде CSS-переменных (`--md-primary`, `--md-surface`, …). Они приезжают прямиком из кита в Figma, так что **руками их не трогаем**: меняем в Figma и выгружаем заново

Тема задаётся атрибутами на `<html>`:

| Атрибут      | Значения                       |
| :----------- | :----------------------------- |
| `data-theme` | `watermelon` 🍉 (пока только он) |
| `data-mode`  | `light` ☀️ / `dark` 🌙           |

Светлый или тёмный режим подхватывается из системы, а на `/admin` его можно выбрать вручную (выбор запоминается в `localStorage` под ключом `murkas-theme`)

## 🌍 Языки

Английский живёт на `/`, русский на `/ru/`. Все строки собраны в `src/i18n/ui.ts`: добавляешь ключ и в `en`, и в `ru`, а на странице зовёшь `useTranslations(lang)`

Страница 404 одна на оба языка. Сервер всегда отдаёт английскую, а крошечный скрипт сам переводит её на русский, если ты заблудился где-то в `/ru/...` 🐾

## 📜 Лицензия

© 2026 Муркас, все права защищены. Хочешь что-то использовать? Пиши на [furry@murkas.net](mailto:furry@murkas.net)

---

Сделано Муркасом
