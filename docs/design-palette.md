# Цветовая палитра сайта (ЛОСЬ 400 / ВСЗ)

## Основные токены (тёмная тема)

```css
:root {
  --color-bg-base: #0a0a0a;
  --color-bg-dark: #111214;
  --color-bg-surface: #1a1c1f;

  --color-border: #2a2d32;
  --color-border-sub: #1f2124;

  --color-accent: #E8851A;
  --color-accent-dim: #c46e12;
  --color-accent-bg: #e8851a1a;

  --color-text: #f0ede8;
  --color-text-sub: #7a7d82;
  --color-text-dim: #4a4d52;

  --color-success: #3d9e60;
  --color-warning: #E8851A;
  --color-error: #c0392b;
  --color-info: #2980b9;

  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'Montserrat', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## Альтернативная светлая тема

```css
:root[data-theme='light'] {
  --color-bg-base: #f5f3ef;
  --color-bg-dark: #eceae5;
  --color-bg-surface: #ffffff;
  --color-border: #d0cdc8;
  --color-accent: #E8851A;
  --color-accent-dim: #c46e12;
  --color-text: #111214;
  --color-text-sub: #5a5d62;
  --color-text-dim: #9a9da2;
}
```

## HEX-палитра (кратко)

- `bg-base`: `#0a0a0a`
- `bg-dark`: `#111214`
- `bg-surface`: `#1a1c1f`
- `border`: `#2a2d32`
- `accent`: `#E8851A`
- `accent-dim`: `#c46e12`
- `text`: `#f0ede8`
- `text-sub`: `#7a7d82`
- `success`: `#3d9e60`
- `error`: `#c0392b`

## Tailwind-фрагмент

```js
// tailwind.config.js
colors: {
  brand: {
    base: '#0a0a0a',
    dark: '#111214',
    surface: '#1a1c1f',
    border: '#2a2d32',
    accent: '#E8851A',
    'accent-dim': '#c46e12',
    text: '#f0ede8',
    muted: '#7a7d82',
  }
}
```
