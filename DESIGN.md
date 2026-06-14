# Fasted — Design System

Classifier: **App UI** — calm surface hierarchy, few colors, cards earn their place.
Light-only for V1; tokens authored for a later dark-mode token-swap. Tokens live in
`src/app/globals.css` (`@theme`).

## Color
| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f6f7f4` | App background (off-white) |
| `--color-surface` | `#ffffff` | Cards, sheets |
| `--color-green-200` | `#b6e0c2` | Ring track |
| `--color-green-600` | `#1f9a59` | Ring fill, primary buttons |
| `--color-green-700` | `#167a47` | Active nav, emphasis |
| `--color-accent-500` | `#f4613a` | Goal check / marker, overtime inner lap |
| `--color-amber-500` | `#f59e0b` | Overtime ring + warnings |
| `--color-ink` | `#14211b` | Primary text (navy) |
| `--color-ink-soft` / `--color-ink-faint` | secondary / tertiary text |
| `--color-hairline` | `#e4e8e2` | Dividers, borders |

Theme color (manifest / status bar): `#34b06a`.

## Type
- Sans: **Plus Jakarta Sans** (`--font-jakarta`, via `next/font`).
- Mono: **Geist Mono** (`--font-geist-mono`) — countdown uses `.tabular` (`tabular-nums`).

## Radii & elevation
- Radii: `--radius-sm 10` · `md 16` · `lg 22` · `xl 28`.
- Shadows: `--shadow-soft` (green-tinted glow under primary CTAs), `--shadow-card` (subtle lift).
- Easing: `--ease-out`, `--ease-in-out`.

## Component vocabulary
`FastRing` · `PlanPill` · `Button{primary|secondary|ghost}` · `Sheet` (Vaul) ·
`Switch` (Radix) · `TabBar` · ListRow (hairline divider, not card mosaic) ·
`SuspectClockBanner` · `RingSkeleton` · `GoogleSignInButton` (deferred).

## Motion & a11y
- Ring animates one CSS-transitioned `stroke-dashoffset` (compositor; no rAF).
- `prefers-reduced-motion` disables transitions + swaps confetti for a static state.
- Container max-width ~414px; ≥44px tap targets; `role=img` + `aria-label` on the ring;
  focus-visible rings on all interactive elements; `<html lang="en">`; pinch-zoom kept.
