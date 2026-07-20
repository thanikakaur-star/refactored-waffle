# HealthProcure Intel — Design System

This documents the visual identity actually in production across `public/index.html` (landing page) and `dashboard/index.html` (product). It exists so future changes — new source cards, new panels, new pages — extend the same system instead of drifting into generic template patterns. If you're adding UI, read this first.

## Design principles

1. **Dark, gold, editorial-precision — not generic SaaS.** The identity is a near-black ground with a warm gold accent and serif display type, closer to a private banking or intelligence-briefing aesthetic than a typical dashboard template. Protect that; don't default to purple gradients, Inter-everywhere, or rounded-everything.
2. **Every icon means something.** No decorative Unicode glyphs, no emoji as section markers, no sparkles (✦) as a "magic" motif. If you need an icon, draw a small inline SVG in the house style (below) that actually represents the thing it labels.
3. **Real data, or clearly marked as illustrative.** Never present fabricated numbers as live stats. If something is a mockup/demo, label it visibly.
4. **Honor what's already there.** Match existing tokens and patterns before introducing new ones. A new source card should look like the other four source cards.

## Color tokens

Defined as CSS custom properties in both `public/index.html` (Tailwind config + inline vars) and `dashboard/index.html` (`:root`). Keep them in sync if you change one.

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0a0a0f` | Page background |
| `--bg-card` | `#12141d` | Card/panel surfaces |
| `--bg-input` | `#1a1d28` | Form inputs, chips, filter pills |
| `--bg-elevated` | `#171a24` | Slightly-raised surfaces (landing page code blocks, chrome bars) |
| `--gold` | `#c9a96e` | Primary accent — links, active states, primary CTAs |
| `--gold-highlight` / `--gold-bright` | `#d4af37` | Gradient endpoint, hover emphasis |
| `--gold-dim` | `#8a7550` | Muted gold — secondary labels, CPV codes |
| `--teal` | `#0d9488` (dashboard) / `#14b8a6` (demo artifact) | Semantic "open/active" status — **not** a second brand accent, keep it purely semantic |
| `--text-primary` | `#e2e8f0` | Headings, primary copy |
| `--text-secondary` | `#94a3b8` | Body copy, descriptions |
| `--text-muted` | `#64748b` | Captions, timestamps, placeholder-weight text |
| `--border-gold` | `rgba(201,169,110,0.15)` | Default card/input borders |
| `--border-gold-hover` | `rgba(201,169,110,0.35)` | Hover/focus border state |

**Status colors** (semantic, separate from the gold/teal accent system):
- Success/open: `#10b981`
- Error/warning: `#f43f5e`

**Light theme**: not yet built for the dashboard/landing page (both are dark-only by design, matching the "private intelligence briefing" identity). The one-off demo artifact (`surgical-tenders-demo.html`) does implement both themes via `:root[data-theme]` — use that file as the reference if a light variant is ever needed here.

## Typography

Three faces, each with a specific job — don't blend their roles.

- **Playfair Display** (serif, weights 600–800) — display face. Headlines, section titles, the logo mark, panel headers. Used *sparingly*: it's what makes this feel editorial rather than templated. Never use it for body copy or UI labels.
- **Inter** (sans, weights 400–700) — body face. Running copy, buttons, nav, form labels, table content. The workhorse.
- **JetBrains Mono** — utility face, used in the demo artifact for data-heavy contexts (CPV codes, API responses, timestamps). Not yet adopted in the main dashboard/landing page but is the right choice if you add a code block or data-table-heavy view — `font-variant-numeric: tabular-nums` wherever digits line up in columns.

Both `public/index.html` and `dashboard/index.html` load fonts via Google Fonts `<link>` tags (not inlined) — fine for those pages since they're not sandboxed Artifacts. If you ever port this identity into an Artifact, fonts must be inlined as `@font-face` data URIs instead (the Artifact CSP blocks font CDNs).

## Icons

**Rule: hand-drawn inline SVG only. Never Unicode glyphs, never emoji, never icon-font ligatures.**

House style, matched across the dashboard's sidebar/KPI icons and the landing page's source-card icons:
```html
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <!-- shape -->
</svg>
```
- `viewBox="0 0 20 20"` for compact UI icons (sidebar, KPI cards), `0 0 24 24` for larger ones (welcome states, empty states)
- `stroke-width` 1.4–1.6 — thin, precise, matches the editorial tone. Never filled/solid icons.
- Color via `stroke="currentColor"` so it inherits the parent's text color (active/hover states just work)
- Rendered size: 14–17px for inline/sidebar icons, 26–28px for empty-state/welcome icons

Before this was fixed (see git history, "Replace raw Unicode glyph icons with a coherent SVG icon set"), the dashboard used things like ♦ for "Total Tenders" and a generic ⚕ caduceus for the welcome state — arbitrary symbols with no real connection to what they labeled. Don't reintroduce that pattern. If you need a new icon and don't have a clean idea, a five-node network graph (aggregation), a grid (overview), a document with lines (tenders), a ribbon/medal (awards), ascending bars (benchmarks), a stacked-ellipse database shape (sources), and a bell (alerts) are the ones already established — reuse or extend the same visual language rather than inventing a new one.

## Layout patterns

- **Cards**: `border-radius: 12px` (`.glass-card` / `rounded-2xl`), `1px solid var(--border-gold)` border, subtle `translateY(-2px)` lift + border-brighten on hover. No accent-bar-sweep-on-hover effects (removed as a generic-template tell — see git history).
- **Grids**: source/product cards use `grid-cols-1 md:grid-cols-N` responsive grids, not fixed pixel widths.
- **Hero sections**: asymmetric two-column (thesis statement + supporting visual/data), not centered-everything with a decorative badge pill. The landing page hero was rebuilt around this principle — see `public/index.html` for the reference pattern.
- **Filter rows**: `flex gap-3 flex-wrap`, consistent `text-sm rounded-lg px-3 py-2` styling on all selects/inputs within a row, search inputs get a left-padded magnifying-glass SVG icon.

## Content rules

- **Never fabricate stats.** The landing page previously had "12,000+ tenders / 85 countries / $50B" with no real backing — removed. Any number shown as fact must be true or clearly labeled illustrative/sample.
- **Source cards must match reality.** If a source has no working scraper, don't give it a card implying live data (this is why WHO/NHS Supply Chain cards were replaced with Find a Tender/Contracts Finder — the sources that actually work).
- **Mockups/demos get a visible label.** Any illustrative-only view (see `surgical-tenders-demo.html`) carries a persistent "Illustrative preview" badge — never let a mockup look indistinguishable from live data.

## Anti-patterns already fixed (don't reintroduce)

These were identified and removed this session as generic "AI-generated design" tells — listed explicitly so they don't creep back in:

- Centered hero with a gradient-shimmer animated headline
- Uppercase glass pill badge with a pulsing dot ("● B2B Intelligence Platform")
- Accent bar that sweeps across the top of a card on hover
- Raw Unicode/emoji used as icons (♦ ★ ⚕ ✦ etc.)
- Fabricated round-number stats with no real source
- Stale copy that doesn't match the actual product (e.g. "Four Pillars" after a fifth source shipped)

## Where things live

- `public/index.html` — marketing/landing page (Tailwind CDN + inline config)
- `dashboard/index.html` — the product itself (Tailwind CDN + Chart.js, vanilla JS)
- No shared CSS file — tokens are duplicated as `:root` custom properties in each file. Keep them in sync manually until/unless these are consolidated into a shared stylesheet.
