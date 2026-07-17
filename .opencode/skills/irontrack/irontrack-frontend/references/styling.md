# Styling

## Three-Layer System

1. **Tailwind CSS v4** (browser build via CDN `<script>`)
   - Utilities: `flex`, `items-center`, `gap-2`, `p-2`, `rounded-lg`
   - Responsive: `lg:grid-cols-2`, `xl:grid-cols-3`

2. **Custom CSS** (`style.css`)
   - CSS custom properties for theming: `--color-brand: #27dd33`, `--color-surface: #020617`
   - Component classes: `.btn-core`, `.card`, `.input-core`, `.section-heading`
   - BEM-like naming: `.btn-core.is-primary`, `.btn-core.is-ghost`

3. **MDUI** (Material Design web components)
   - `<mdui-button>`, `<mdui-text-field>`, `<mdui-select>`, `<mdui-navigation-bar>`

## Theme Modes

Defined by class on `<html>`:
- `mdui-theme-dark` — default
- `mdui-theme-light` — light mode overrides
- `mdui-theme-auto` — follows system preference

## Brand Color

`#27dd33` (green) — accent color throughout the UI.
