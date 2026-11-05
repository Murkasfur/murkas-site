# 🍉 murkas.net

[English](README.md) · **Русский**

Личный сайт **Муркаса**, фурри-дизайнера и разработчика из Торонто.
Фурсона, арт, портфолио и контакты в одном месте.

**🌐 Сайт:** [murkas.net](https://murkas.net)

![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)
![Figma](https://img.shields.io/badge/Designed_in-Figma-F24E1E?logo=figma&logoColor=white)

> 🚧 Сайт в разработке, страницы добавляются постепенно.

## Стек

- **[Astro](https://astro.build)**: статический сайт без клиентского фреймворка, только немного обычного JS
- **Material 3**: дизайн-система собрана в Figma (*Murkas M3 Kit*)
- **[Rubik](https://fonts.google.com/specimen/Rubik)** через `@fontsource-variable/rubik`
- **Cloudflare Workers** (статические файлы): каждый пуш в `main` автоматически выкатывается на сайт

## Запуск

Нужен **Node.js 22+**.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # сборка в ./dist
npm run preview   # посмотреть собранную версию
```

## Структура проекта

```text
src/
├── pages/
│   ├── index.astro         # главная
│   ├── 404.astro           # одна 404 на оба языка
│   ├── admin.astro         # песочница тем (временная)
│   └── ru/                 # русские версии страниц
├── components/
│   ├── ThemeInit.astro     # ставит тему и светлый/тёмный режим до отрисовки
│   ├── NotFound.astro      # страница 404 с кастомным курсором
│   └── AdminPage.astro     # интерфейс песочницы тем
├── i18n/
│   └── ui.ts               # все тексты интерфейса (en / ru) и хелперы
└── styles/
    ├── tokens.css          # цветовые токены, выгруженные из Figma
    └── theme.css           # шрифты, шкала типографики M3, кнопки
public/                     # фавиконка и статические файлы
wrangler.jsonc              # настройки Cloudflare Workers
```

## Темы

Цвета лежат в `src/styles/tokens.css` в виде CSS-переменных (`--md-primary`,
`--md-surface`, …). Они сгенерированы из кита в Figma, поэтому **руками их не правим**:
меняем цвета в Figma и выгружаем заново.

Тема задаётся атрибутами на `<html>`:

| Атрибут      | Значения                       |
| :----------- | :----------------------------- |
| `data-theme` | `watermelon` 🍉 (по умолчанию) |
| `data-mode`  | `light` / `dark`               |

Светлый или тёмный режим берётся из настроек системы, если посетитель не выбрал его
на `/admin` (выбор хранится в `localStorage` под ключом `murkas-theme`).

## Языки

Английский по умолчанию (`/`), русский лежит в `/ru/`.
Все строки собраны в `src/i18n/ui.ts`. Чтобы добавить текст, заведи ключ и в `en`, и в `ru`,
а на странице используй `useTranslations(lang)`.

Страница 404 общая: сервер всегда отдаёт английскую версию, а маленький встроенный
скрипт переключает её на русский для адресов `/ru/...`.

## Деплой

Пуш в `main` запускает сборку на Cloudflare (`npm run build`), сайт раздаётся из `./dist`.
На несуществующие адреса отдаётся `404.html` (`not_found_handling: "404-page"`).

```sh
git add -A
git commit -m "что изменил"
git push
```

## Лицензия

© 2026 Муркас. **Все права защищены.**
Код, арт, персонажей и остальное содержимое репозитория нельзя копировать,
использовать или распространять без письменного разрешения.
Хочешь что-то использовать? Пиши на [furry@murkas.net](mailto:furry@murkas.net).

---

Сделано с 🧡 Муркасом
