# Design system: 5th Kajang BB ("Saturday")

The single source of truth for how the public website and Parade HQ look. Page files in `pages/` override this file where they say so.

Generated with the **ui-ux-pro-max** skill (`search.py --design-system`, plus `--domain` searches for colour, typography, product and charts), then checked against the brief. The skill says to treat results as recommendations and not to keep output that doesn't fit, so each section below says what came from the skill and what was changed and why.

## Brief

- **Website:** the public site of a church-based Boys' Brigade company in Kajang, for parents and children aged 7 to 18. It should feel friendly, honest and welcoming, like an officer talking to a parent after Saturday parade, never like an advert.
- **Parade HQ:** the staff app for officers and squad leaders. They mark attendance on their phones, often outdoors, and check reports at home. It should feel quick, clear and dependable, like a good roll book, never cluttered or stressful.

## 1. UI style

| | Skill result | Used |
|---|---|---|
| Website | Product "Church/Religious Organization" → **Accessible & Ethical** + Soft UI Evolution | **Accessible & Ethical**, with a light touch of Soft UI: soft corners and one faint shadow on cards |
| Parade HQ | "attendance tracking mobile dashboard" → **Minimalism & Swiss Style** | **Minimalism & Swiss**: one clear grid, high contrast, nothing decorative |

Together: **calm, accessible, flat-but-soft**.
- White cards on a light grey page.
- 16px or larger body text.
- Visible 3px focus rings and 44px touch targets.
- Reduced motion respected.
- One accent colour, used sparingly.

## 2. Colour palette

The skill's colour advice for church organisations is **"Warm Gold + Deep Purple/Blue + White"**. We use the blue and the gold, because navy is the Boys' Brigade uniform colour.
- **Gold:** the skill's contrast-adjusted value, `#A16207`.
- **Purple (rejected):** its palette row, `#7C3AED`, belongs to no part of this company's identity, so it is not used.

### Light

| Token | Name | Hex | Used for | Contrast |
|---|---|---|---|---|
| `--color-primary` | Brigade Blue | `#1E3F7A` | Main buttons, links, selected states, chart series | white on it 10.3:1 |
| `--color-primary-strong` | Night Blue | `#142B57` | Menu background, hero overlay, hover on primary | |
| `--color-on-primary` | | `#FFFFFF` | Text on primary | |
| `--color-secondary` | Sky | `#E6EEFA` | Selected tints, soft badges | primary on it 8.8:1 |
| `--color-accent` | Badge Gold | `#A16207` | One highlight per screen: the latest chart bar, the current page marker, the website's "Join us" | white on it 4.9:1 |
| `--color-background` | Hall Grey | `#F5F7FA` | Page background | |
| `--color-foreground` | Ink | `#172033` | Text | 15.2:1 on background |
| `--color-card` | White | `#FFFFFF` | Cards, forms, tables | |
| `--color-muted` | Mist | `#EEF2F7` | Inset areas, table header rows | |
| `--color-muted-foreground` | Slate | `#4A5568` | Secondary text, labels, hints | 7.0:1 on background |
| `--color-border` | Line | `#D6DDE8` | Card and divider lines | |
| `--color-border-strong` | Field Line | `#8A96A8` | Input and button outlines (3:1 for controls) | 3.0:1 |
| `--color-destructive` | Crest Red | `#C62828` | Absent, delete, errors | 5.6:1 |
| `--color-ring` | | `#1E3F7A` | 3px focus ring | |

Never put Badge Gold on Brigade Blue (2.1:1). On dark blue, use Dark Gold `#E0B04A`.

### Status (the roll)

| Status | Text/mark | Tint | Border |
|---|---|---|---|
| Present | `#1F7A4D` | `#E8F4EC` | `#B9DCC7` |
| Late | `#B45309` | `#FEF3E2` | `#F2CF9A` |
| Excused | `#2B5FB3` | `#EAF0FB` | `#BFD0EE` |
| Absent | `#C62828` | `#FBEAEA` | `#F0BDBD` |
| Unmarked | `#5B6474` | `#EEF1F5` | `#D3D9E2` |

Each status always has a word or letter next to its colour, never colour alone.

### Dark

| Token | Hex |
|---|---|
| Background | `#0F1726` |
| Card | `#172238` |
| Card raised / inset | `#1D2A44` |
| Foreground | `#EEF2F8` |
| Muted foreground | `#A3B0C6` (7.3:1 on card) |
| Border | `#2A3956` |
| Border strong | `#5A6A88` |
| Primary (fills and links) | `#9DB8F0`, with text `#0F1726` on it (9.0:1) |
| Gold | `#E0B04A` |
| Destructive | `#F28B82` |

The Owner's accent colour in Parade HQ Settings still replaces Brigade Blue.

## 3. Typography

The skill's typography search for "accessible legible" returned two pairings we use:
- **"Accessibility First":** Atkinson Hyperlegible for everything. It was designed by the Braille Institute so that every character is distinct.
- **"Corporate Trust":** Lexend headings, "designed for readability".

We pair the two:

| Role | Font | Weights |
|---|---|---|
| Headings (page titles, card titles, the brand) | **Lexend** | 500, 600, 700 |
| Body, forms, tables, buttons | **Atkinson Hyperlegible Next** | 400, 700 |
| **Numbers, stats, dates, badges, labels and all small text** | **Atkinson Hyperlegible Next**, with `font-variant-numeric: tabular-nums` | 700 for big numbers |

Why numbers use Atkinson:
- **1, l and I** look different, and so do **0 and O**, and **5 and S**.
- **Tabular figures** keep columns of attendance figures lined up.
- It stays legible on a phone in the sun.

Headings may use Lexend, but a heading that is a number (a strength figure, a date tile, a total) always uses Atkinson.

**Scale** (rem, from a 16px base):

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 0.8125 (13px) | Smallest text allowed: chart axis labels, badges |
| `--text-sm` | 0.875 (14px) | Labels, meta lines, table headers |
| `--text-base` | 1 (16px) | Body |
| `--text-lg` | 1.125 (18px) | Card titles |
| `--text-xl` | 1.375 (22px) | Section titles in Parade HQ |
| `--text-2xl` | 1.75 (28px) | Page titles in Parade HQ |
| `--text-3xl` | 2.25 (36px) | Website section headings, big stats |
| `--text-4xl` | clamp(2.25rem, 5vw, 3.5rem) | Website hero |

Body line height is 1.55, and headings 1.15 to 1.25. Lines stay under about 72 characters, and nothing goes below 13px.

## 4. Spacing scale

A 4px base. The skill's density dial is "Standard" for the website and denser for Parade HQ.

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | Icon to label |
| `--space-2` | 8 | Between chips, tight stacks |
| `--space-3` | 12 | Gaps inside a card on phones, between buttons |
| `--space-4` | 16 | Card padding on phones, grid gaps in Parade HQ |
| `--space-5` | 20 | Card padding |
| `--space-6` | 24 | Between cards on the website |
| `--space-8` | 32 | Between groups |
| `--space-12` | 48 | Website section padding on phones |
| `--space-16` | 64 | Website section padding |
| `--space-24` | 96 | Website hero padding |

Touch targets are at least 44×44px, and at least 8px apart.

## 5. Buttons

| Variant | Look | Use |
|---|---|---|
| Primary | Brigade Blue fill, white text | The main action on a screen (Take attendance, Save, Send) |
| Secondary | White fill, 1px Field Line outline, Ink text | Everything else |
| Accent | Badge Gold fill, white text | Only the website's "Join us" |
| Danger | White with Crest Red text and outline; red fill only in the confirm step | Delete, Revoke |
| Ghost / link | No border, Brigade Blue text, underline on hover | Inline actions |

- **Size:** 44px tall (40px for small buttons on desktop), padding 0 16px, radius **10px**.
- **Text:** Atkinson 16px/700 (14px for small).
- **States:** hover deepens the fill, over 150 to 200ms. Pressed moves down 1px. Disabled is 45% opacity with `cursor: not-allowed`. Focus is a 3px ring offset by 2px.
- **Icons:** stroke icons only (no emoji), 18px. Icon-only buttons need an `aria-label`.

## 6. Cards

- **Look:** white, 1px Line border, radius **12px**, shadow `0 1px 2px rgba(23,32,51,.06)`, padding 20px (16px on phones).
- **Title:** Lexend 18px/600. An optional one-line subtitle in Slate 14px, only when it adds information.
- **Stat cards (Parade HQ):** a label (14px/700 Slate), then the number (Atkinson 700, 36px, tabular), then one note line (14px). No icon tiles. The one "key" stat may sit on Night Blue with the number in Dark Gold.
- **Grouping:** no cards inside cards. On the website, a list is fine instead of a grid of cards.

## 7. Chart colours

From the skill's chart search ("attendance trend over time"):
- **Bars or lines over time** for a trend.
- **Direct labels**, and never tell series apart by hue alone.
- **A visible table fallback.** The Report page already provides one.

| Role | Light | Dark |
|---|---|---|
| Main series (strength bars, trend) | `#1E3F7A` at 85% | `#9DB8F0` |
| Latest / highlighted point | `#A16207` | `#E0B04A` |
| Gridlines | `#E3E8F0`, 1px dashed | `#2A3956` |
| Axis and value labels | Atkinson 13px, `#4A5568` | `#A3B0C6` |
| Present / Late / Excused / Absent / Unmarked | the status colours above (Unmarked uses a hatch, not just grey) | the dark status colours |
| Categorical order (if more series are ever needed) | `#1E3F7A`, `#0F766E`, `#A16207`, `#C62828`, `#5B6474` | `#9DB8F0`, `#5FD3BD`, `#E0B04A`, `#F28B82`, `#A3B0C6` |

## 8. Anti-patterns to avoid

From the skill:
- **Accessible & Ethical style:** outdated design; hidden information.
- **Priority table:** removing focus rings; icon-only buttons without labels; hover-only interactions; horizontal scroll; body text under 12px; grey-on-grey text; raw hex values in components; meaning shown by colour alone in charts; emoji used as icons; no reduced-motion support; placeholder-only form labels; errors shown only at the top of a form.

For this kind of app, a church youth company with a staff roll book:
1. **Advert patterns on the website:**
   - countdown timers and "spots left" urgency
   - pop-ups and sticky "Join now" bars
   - auto-rotating carousels
   - stock photos
   - slogans instead of plain facts
2. **Testimonial carousels.** The skill suggested "Hero + Testimonials + CTA". We don't have real testimonials, and inventing them would be dishonest.
3. **Decorative or condensed fonts for numbers.** Strength, totals and dates must use the readable font with tabular figures.
4. **Small tap targets on the roll.** Marking 60 names outdoors needs 44px or larger buttons with gaps between them.
5. **Confirmation pop-ups for every mark.** Marking must be one tap and reversible. Ask only before destructive actions.
6. **Dense tables on phones.** Wide tables become stacked cards under 760px.
7. **Layout shift while marking.** Rows must not jump when a status changes or data syncs.
8. **Stressful red.** Crest Red is for absent, errors and delete only, never for decoration or "urgency".
9. **Decorative gradients, glassmorphism, glows, heavy shadows**, and icon tiles on every card.
10. **Collecting children's data without saying why.** Forms say what the details are for, and children's names never appear in public or in a spreadsheet committed to the repository.

## 9. Pre-delivery checklist (from the skill)

- [ ] No emoji as icons (SVG only)
- [ ] `cursor: pointer` on everything clickable
- [ ] Hover states with smooth 150 to 300ms transitions
- [ ] Text contrast 4.5:1 or more in light and dark
- [ ] Visible keyboard focus
- [ ] `prefers-reduced-motion` respected
- [ ] Works at 375, 768, 1024 and 1440px with no sideways scroll
