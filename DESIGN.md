# HealthProcure Intel — Design System

## Overview

HealthProcure Intel's design is a **luxury intelligence aesthetic** — black and gold paired with Apple's product-reverent minimalism, applied to global procurement intelligence. Every page is organized around one job: **make real procurement data the hero**. UI recedes. Noise disappears. Tenders, awards, benchmarks, and alerts stand alone.

The system uses **alternating full-bleed sections** (white ↔ black) with a single gold accent (`#c9a96e`) for every interactive element. The black-and-gold pairing creates maximum contrast and editorial gravitas. Color changes provide all visual hierarchy — no gradients, no decorative shadows, no chrome. Photography is honest. Data tables breathe. Typography is confident but quiet.

**Key Characteristics:**
- Data-first presentation; UI recedes so intelligence can speak.
- **Black and gold aesthetic:** Pure black (`#000000`) dark sections paired with warm gold (`#c9a96e`) for maximum contrast and brand gravitas.
- Alternating full-bleed tile sections: white ↔ pure black, with color change acting as the section divider.
- Single gold accent (`#c9a96e`) carries every interactive element; teal (`#0d9488`) is reserved for secondary actions and status on dark surfaces.
- Whisper-soft elevation used only for data cards during hover or sticky bars with backdrop blur.
- Tight two-row nav: slim global nav (black with gold logo) + persistent context-specific sub-nav.
- Section rhythm: light data showcase → pure black analytics tile → light filter/search → pure black awards panel — a bold, predictable pulse.

---

## Colors

### Brand & Action

- **Action Gold** (`#c9a96e`): The single brand-level interactive color. All text links, pill CTAs ("View Tender", "Create Alert"), and focus rings. Press state via `transform: scale(0.95)`.
- **Focus Gold** (`#d4af37`): A brighter sibling of Action Gold, reserved for keyboard focus rings on buttons (`outline: 2px solid`).
- **Status Teal** (`#0d9488`): Secondary accent used on dark surfaces for inline links, secondary buttons, and status indicators where Action Gold would disappear.
- **Teal Light** (`#14b8a6`): Brighter teal for hover states and emphasis on status elements.

### Surface — Light

- **Pure White** (`#ffffff`): The dominant canvas. Data tables, cards, filter rows, form inputs. Clean, uncluttered.
- **Off-White** (`#f8fafc`): A signature off-white for alternating light tiles and card backgrounds. Just different enough from white to create rhythm.
- **Slate 50** (`#f9fafb`): Secondary light surfaces and subtle backgrounds behind interactive elements.

### Surface — Dark

- **Pure Black** (`#000000`): The primary dark-tile surface on the dashboard and dark panels. Paired with gold for maximum contrast and luxury intelligence aesthetic.
- **Black Elevated** (`#0a0a0f`): Micro-step lighter than pure black — used for card backgrounds and slight elevation separation.
- **Black Alt** (`#121212`): Another micro-step for subtle tier separation in nested dark surfaces.
- **Charcoal** (`#1a1a1a`): Used for embedded content frames, video backgrounds, and edge-to-edge darkest overlays. Reserved for maximum visual weight.

### Text

- **Ink Dark** (`#1e293b`): Every headline, body paragraph, and utility button text on light surfaces.
- **Ink on Dark** (`#ffffff`): All text on dark tiles and the global nav.
- **Ink Muted** (`#64748b`): Secondary copy, captions, disabled states, helper text.
- **Ink Muted Strong** (`#475569`): Body text on subtle backgrounds.

### Hairlines & Borders

- **Divider Soft** (`#e2e8f0`): Border tone on secondary buttons and card dividers — functions as a subtle ring rather than a hard line.
- **Divider Subtle** (`#cbd5e1`): The 1px hairline on cards and inputs.
- **Gold Soft** (`rgba(201, 169, 110, 0.2)`): Soft gold divider, used sparingly on data section breaks.

**No gradients.** Depth comes from surface color change and soft shadows — never from CSS gradients. Atmospheric imagery (if used) is photographic, not computed.

---

## Typography

### Font Family

- **Display**: `SF Pro Display, system-ui, -apple-system, sans-serif` — optimized for sizes ≥ 19px.
- **Body / UI**: `SF Pro Text, system-ui, -apple-system, sans-serif` — text-optimized for body, captions, buttons, links below 20px.
- **Serif Display** (alternative): `Playfair Display, Georgia, serif` — for headline emphasis on landing page hero (optional; SF Pro Display is preferred).
- **Monospace**: `SF Mono, Monaco, Courier New, monospace` — for tender IDs, contract values, timestamps in tables.
- **OpenType**: `font-variant-numeric: tabular-nums` on all contract values and dates for alignment in tables.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `hero-display` | 56px | 600 | 1.07 | -0.28px | Page hero headline; signature "tight" cadence |
| `display-lg` | 40px | 600 | 1.10 | 0px | Section headlines; "Five Markets, One Feed" |
| `display-md` | 34px | 600 | 1.47 | -0.374px | Subsection headers; panel titles on dashboard |
| `lead` | 28px | 400 | 1.14 | 0.196px | Tile subheadings; tender titles in list |
| `tagline` | 21px | 600 | 1.19 | 0.231px | Sub-tile tagline; nav category names |
| `body-strong` | 17px | 600 | 1.24 | -0.374px | Inline strong (supplier names, bold labels) |
| `body` | 17px | 400 | 1.47 | -0.374px | Default paragraph; table body text; filter labels |
| `body-mono` | 16px | 400 | 1.5 | 0px | Tender IDs, contract values in tables (tabular) |
| `caption` | 14px | 400 | 1.43 | -0.224px | Secondary captions, button text, helper text |
| `caption-strong` | 14px | 600 | 1.29 | -0.224px | Emphasized captions; modal headers |
| `button` | 15px | 600 | 1.0 | -0.224px | Action buttons; "Create Alert", "View Tender" |
| `fine-print` | 12px | 400 | 1.0 | -0.12px | Footer body, legal disclaimers |
| `micro-legal` | 10px | 400 | 1.3 | -0.08px | Micro legal, attribution |
| `nav-link` | 12px | 400 | 1.0 | -0.12px | Global nav menu items, breadcrumbs |

### Principles

- **Negative letter-spacing at display sizes.** Every headline at 17px and up carries slight tracking tighten (`-0.12 → -0.374px`). Produces the iconic "tight" cadence. Never at 12px or below.
- **Body copy at 17px, not 16px.** The extra pixel gives the page an unmistakable "reading, not scanning" pace.
- **Weight 600 for headlines, 400 for body.** Ladder is 400 / 600 / 700. No 500. Strong inline uses 600; display uses 600; body stays 400.
- **Line-height is context-specific.** Display uses 1.07–1.19 (tight). Body uses 1.47. Data tables use 1.5.
- **Monospace for numeric data.** Tender IDs, contract values, dates use `body-mono` with `font-variant-numeric: tabular-nums` for vertical alignment in tables.

### Copy & Punctuation

- **No em dashes.** Never use em dashes (—) or en dashes (–) in headlines, UI copy, body content, blog posts, or marketing pages. Use commas, colons, periods, or parentheses instead. Em dashes read as AI-generated and are off-brand.
- **Write plainly and human.** Prefer short declarative sentences over long clauses stitched together with dashes. If a sentence needs a dash to work, rewrite it.
- **Punctuation set:** comma, period, colon, semicolon, parentheses. That is the full toolkit for copy.

---

## Layout

### Spacing System

- **Base unit:** 8px. Structural layout snaps to 8/12/16/20/24/32/48/64/80.
- **Tokens:**
  - `xs` 4px — tight typographic adjustments
  - `sm` 8px — compact card padding
  - `md` 12px — standard gutters
  - `lg` 16px — standard padding
  - `xl` 24px — section padding, card spacing
  - `2xl` 32px — large section padding
  - `3xl` 48px — hero vertical padding
  - `section` 64px — full-bleed tile vertical padding

- **Section vertical padding:** 64px inside full-bleed tiles; tiles stack edge-to-edge with 0 gap (color change provides the break).
- **Card padding:** 16px inside data cards.
- **Button padding:** 10–12px vertical, 18–24px horizontal.
- **Universal rhythm constant:** 17px body line-height (~26px line) — every page uses this pulse.

### Grid & Container

- **Max content width:** 1280px on dashboard and data-heavy sections; 1440px on landing page; full-bleed for hero tiles.
- **Column patterns:** Single-column centered stack on heroes; 2–3 column grids on data cards; full-bleed alternating tiles on marketing pages.
- **Gutters:** 16–20px between cards in a grid.

### Whitespace Philosophy

Every section begins with at least 48px of air above its headline and 32–48px below. Data cards are never crowded; nearest content to a data element is at least 24px away. This makes complex data breathable.

---

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Full-bleed tiles, nav, body sections |
| Soft hairline | 1px `rgba(0, 0, 0, 0.08)` | Data cards, input fields |
| Subtle shadow | `rgba(0, 0, 0, 0.04) 0px 1px 3px` | Hovered data cards, tooltips |
| Backdrop blur | `backdrop-filter: blur(20px)` on off-white 80% | Sticky header bar, modal backdrop |
| Card lift shadow | `rgba(201, 169, 110, 0.1) 0px 4px 12px` | Data card on hover — the only gold-tinted shadow |

**Shadow philosophy.** Use exactly one soft shadow: on data cards during hover. Elevation otherwise comes from (a) surface-color change and (b) backdrop-blur on sticky bars. Reserve color-tinted shadows for subtle brand moments.

---

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `none` | 0px | Full-bleed hero tiles |
| `xs` | 4px | Tight inline elements (badges) |
| `sm` | 6px | Small utility buttons, compact inputs |
| `md` | 8px | Data cards, filter inputs |
| `lg` | 12px | Larger card groups, modal corners |
| `pill` | 9999px | Primary gold pill CTAs, search input, filter pills |

---

## Components

### Navigation

**`global-nav`** — Persistent ultra-slim nav bar at top. Background `#000000` (pure black), height 44px. Left: HealthProcure logo in gold. Center: links ("Tenders", "Awards", "Benchmarks", "Alerts", "Docs") in `nav-link` (12px / 400 / white). Right: Search icon + API key indicator. No shadows. Bold and minimal.

**`sub-nav-sticky`** — Surface-specific sticky bar below global nav. Background `#f8fafc` (off-white) at 90% opacity with `backdrop-filter: blur(20px)`. Height 48px. Left: section name in `tagline` (21px / 600). Right: filter count, sort toggle, primary CTA. Pinned during scroll.

### Buttons

**`button-primary`** — Signature action. Background `#c9a96e`, text `#0f172a` (ink dark), `button` size (15px / 600), rounded `pill`, padding 11px × 24px. Full-pill radius IS the brand signal.
- Active: `transform: scale(0.95)`
- Focus: 2px solid `#d4af37` outline

**`button-secondary`** — When a second action exists. Border `1px solid #c9a96e`, text `#c9a96e`, background transparent, `pill` radius, padding 11px × 24px.

**`button-tertiary`** — On dark surfaces. Border `1px solid #0d9488`, text `#0d9488`, background transparent, `md` radius (8px), padding 9px × 16px.

**`button-icon`** — Compact utility. Background `#f8fafc`, text `#1e293b`, 32 × 32px, `md` radius, no padding (icon centered).

**`text-link`** — Inline body links in `#c9a96e`, no underline by default, underline on hover.

**`text-link-on-dark`** — Inline links on dark tiles in `#0d9488` (Status Teal).

### Cards & Containers

**`data-card`** — Light card on light background. Background `#ffffff`, 1px solid `#e2e8f0`, `md` radius (8px), padding 16px. Lift shadow on hover (`rgba(201, 169, 110, 0.1) 0px 4px 12px`). Used for tender rows, awards, alert configs.

**`tile-light`** — Full-bleed light tile. Background `#ffffff`, text `#1e293b`, `none` radius (0), vertical padding 64px, horizontal padding 32px. Centered stack: headline + supporting text + CTA + optional visualization.

**`tile-off-white`** — Alternate light tile on `#f8fafc`. Used to break consecutive white tiles.

**`tile-dark`** — Full-bleed dark tile. Background `#000000` (pure black), text `#ffffff`, `none` radius, padding 64px. Uses `text-link-on-dark` (teal) for inline copy. Maximum contrast with gold CTAs.

**`tile-dark-2`** — Variant on `#0a0a0f`. Used where dark tiles sit adjacent for faint separation via micro-step.

**`dashboard-panel`** — Data-focused panel. Background `#ffffff`, subtle border `1px solid #e2e8f0`, `md` radius (8px), padding 24px 20px. Contains title, filters, data table/card grid, pagination at bottom.

**`dashboard-panel-dark`** — Same as `dashboard-panel` but background `#000000` (pure black), text `#ffffff`, border `rgba(201, 169, 110, 0.2)` (gold-tinted hairline for brand).

### Inputs & Forms

**`input-text`** — Text and number inputs. Background `#ffffff`, text `#1e293b`, 1px solid `#cbd5e1`, `md` radius (6px), padding 10px 12px. Focus: border becomes `#c9a96e`.

**`input-search`** — Search field. Background `#ffffff`, text `#1e293b`, 1px solid `#e2e8f0`, `pill` radius, padding 12px 16px, 44px height. Leading search glyph (14px, muted). Focus: border `#c9a96e`.

**`filter-select`** — Dropdown or toggle. Background `#f8fafc`, border `1px solid #cbd5e1`, text `#1e293b` in `body`, `md` radius, padding 8px 12px. Active: border `#c9a96e`, background `rgba(201, 169, 110, 0.05)`.

**`filter-pill`** — Removable filter tag. Background `rgba(201, 169, 110, 0.15)`, text `#c9a96e` (bold), `pill` radius, padding 6px 10px, trailing `×` close.

### Tables & Lists

**`table-header`** — Background `#f8fafc`, text `#64748b` in `caption` (14px / 400), uppercase, letter-spaced. Sortable headers show small arrow.

**`table-row`** — Alternating `#ffffff` and `#f8fafc` backgrounds. Text in `body` (17px / 400), padding 12px. Hover: background shifts, subtle `rgba(201, 169, 110, 0.04)` tint.

**`tender-row`** — Shows: tender title (bold), category tag, source badge, value (right-aligned, tabular-nums), deadline countdown. Clickable for detail expand.

**`award-row`** — Shows: supplier name (bold), tender title, value, award date, status badge. Linked to supplier/tender detail.

### Status & Badges

**`badge-category`** — Procurement category label. Background `rgba(201, 169, 110, 0.15)`, text `#c9a96e` in `caption`, `xs` radius, padding 3px 8px.

**`badge-source`** — Data source label (TED Europa, SAM.gov, etc.). Background `rgba(13, 148, 136, 0.15)`, text `#0d9488`, `xs` radius, padding 3px 8px.

**`badge-status`** — Contextual status:
- Open: teal background/text
- Awarded: gold background, dark text
- Closed: gray background/text
- New: small green dot + "New" label

### Pagination

**`pagination-controls`** — Flex row at bottom of data panels. Text "Showing X–Y of Z" in `caption`. Buttons: `button-tertiary` for prev/next, bold `#c9a96e` text for current page (e.g., "3 / 8"). Prev/next disabled (opacity 0.4) at boundary.

---

## Layout Patterns

### Hero Section (Landing Page)

**Asymmetric two-column layout:**
- **Left column** (60%): Headline in `hero-display` (56px / 600), subhead in `lead` (28px), two pill CTAs, supporting stats in small text.
- **Right column** (40%): Live data feed, animated tender cards, or dashboard preview. Minimal chrome.

**Spacing:** 80px top/bottom padding, 40px horizontal gutters.

### Dashboard Section

**Sticky filter bar at top:**
- Horizontal flex: filter pills (category, source, date) on left, sort/view toggle on right.
- Pinned during scroll; unpin on mobile.

**Data panel below:**
- Panel title in `display-md` (34px).
- Data table or card grid filling space.
- Pagination at bottom.

**Dark alternate panels** (Awards, Alerts) use `tile-dark` pattern.

### Icons

**Rule: hand-drawn inline SVG only. Never Unicode glyphs, emoji, or icon-font ligatures.**

- **House style:** thin-stroke SVG, 1.6px stroke width, 14–17px rendered size, `stroke="currentColor"` so color inherits from parent text (active/hover states just work).
- **Sidebar icons:** Grid (tenders), Document (awards), Ribbon (benchmarks), Bar chart (analytics), Database (sources), Bell (alerts) — thin stroke, minimal detail, semantic.
- **Status indicators:** Dot + label (Open/Awarded/Closed) — no pictorial icon, just a colored dot.
- **Button icons:** Chevron (expand), X (close), Magnifying glass (search), Caret (sort) — all thin-stroke, currentColor.
- **No decorative icons.** Every icon represents the thing it labels.

---

## Do's and Don'ts

### Do
- Use `#c9a96e` (Action Gold) for every interactive element — links, pill CTAs, focus signals — and nothing else. The single accent is non-negotiable.
- Set headlines in `hero-display` or `display-lg` with negative letter-spacing for the signature "tight" cadence.
- Run body copy at `body` (17px / 400 / 1.47 / -0.374px) — not 16px. The extra pixel defines the brand's reading pace.
- Alternate `tile-light` and `tile-dark` for full-bleed section rhythm. Color change IS the divider.
- Reserve `pill` radius for primary gold CTA and filter pills.
- Apply the single card-lift shadow only during hover on data cards — never on buttons or static elements.
- Use `transform: scale(0.95)` as the press state on every button.
- Keep the global nav true dark/near-black.

### Don't
- Don't introduce a second accent color; every "click me" is `#c9a96e` (Action Gold). Teal is secondary/status only.
- Don't add shadows to buttons or text — shadow reserved for hovered data cards.
- Don't use decorative gradients; depth comes from surface color and subtle shadows.
- Don't set body copy at weight 500 — ladder is 400 / 600 / 700. Body always 400.
- Don't round full-bleed tiles — tiles rectangular, edge-to-edge; color change is the divider.
- Don't tighten line-height below 1.47 for body copy.
- Don't mix radii grammars — use `sm` (6px) for compact utility, `md` (8px) for cards, `pill` for pills.
- Don't use inline SVG decorations or animated backgrounds — let data and photography speak.
- Don't fabricate stats. Ever. If mockup, label it visibly.
- Don't use em dashes (—) or en dashes (–) anywhere in copy, headlines, or content. Use commas, colons, periods, or parentheses. Em dashes read as AI-generated and are off-brand.

---

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Small phone | ≤ 419px | Single-column layout; hero h1 drops to 34px; filter bar → icon toggles |
| Phone | 420–640px | Single-column stack; sidebar → hamburger; hero h1 → 34px |
| Tablet | 641–1023px | Hero single-column; data panels stack; table scrolls horizontally |
| Desktop | 1024–1440px | Full two-column hero; multi-column card grids; sticky sub-nav visible |
| Wide desktop | ≥ 1441px | Content locks at 1280px (dashboard) or 1440px (landing); margins absorb extra |

### Touch Targets
- Minimum 44 × 44px. `button-primary` lands at ~44 × 100px.
- `button-icon` exactly 32 × 32px (touch-friendly; padding nearby provides extra hit area).
- Global nav utility links ~32 × 80px — precision desktop; mobile uses hamburger.

### Collapsing Strategy
- **Global nav**: full link row on desktop → hamburger + logo + action icon at 640px.
- **Sub-nav sticky bar**: full filter row → icon toggles at mobile; labels move to slide-out tray.
- **Hero**: two-column asymmetric → single-column stack at 834px; right column moves below headline.
- **Data tables**: full columns on desktop → horizontal scroll on tablet/mobile; sticky first column (tender title).
- **Hero typography**: 56px → 40px (1024px) → 34px (640px) → 28px (419px).

---

## Known Decisions

- **No dark mode toggle.** The color system supports dark tiles and panels, but global theme (light vs. dark) isn't a user choice. Can be added without breaking tokens.
- **Single gold shadow.** Card-lift shadow (`rgba(201, 169, 110, 0.1) 0px 4px 12px`) is the only drop-shadow. Gold-tinted to reinforce brand.
- **Teal is secondary.** Teal used for status/secondary actions on dark, inline links on dark, progress indicators — not primary accent.
- **No gradients, no animations.** System is static-by-default for clarity. Animations (if added) are micro-interactions only (button press scale, fade-ins on load) — never background motion.
- **Photography is honest.** Imagery is photographic and data-contextual (real dashboards, real data) — never stock or decorative.
