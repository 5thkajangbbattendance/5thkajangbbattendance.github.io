# Design plan: "Fall in"

The visual identity for Parade HQ (the staff app) and the public website of The 5th Kajang Boys' Brigade Company. Written with the frontend-design skill before any code changed, then checked against the brief.

## The brief, in our own words

- **Subject.** A Boys' Brigade company in Kajang: a uniformed Christian youth organisation that meets every Saturday afternoon for parade, drill, badges, camps and service. Its world has navy serge uniforms, brass cap badges and buttons, white haversacks and webbing, chevron rank stripes, the anchor crest with its red cross, and the motto *Sure & Stedfast*.
- **Audience.**
  - **Parade HQ:** officers and squad leaders taking the roll on their phones, often outdoors in Malaysian sun, then checking reports at home.
  - **Public website:** parents and boys deciding whether to join, and checking notices.
- **Primary job.**
  - **Parade HQ:** mark the roll fast and read the company's strength at a glance.
  - **Public website:** make joining feel serious, warm and easy.
- **Constraint.** This is a design change only. Every feature, page, word of copy and piece of sample data stays as it is. Owners can still pick an accent colour, and light and dark themes still work.

## Colour: 6 named colours

| Name | Hex | Role |
| --- | --- | --- |
| **Serge** | `#17233F` | The uniform. Navigation, headings, primary buttons, chart bars. Authority. |
| **Brass** | `#C99A2E` | The cap badge. Used only for "here and now": the current page, the latest parade, the focus ring, the one key number. Never a fill for large areas, never body text. |
| **Crest Red** | `#B3261E` | The red cross in the crest. Absent marks, deleting, errors. Nothing decorative. |
| **Webbing** | `#FFFFFF` | Cards and forms, like a clean white haversack against the uniform. |
| **Tarmac** | `#ECEEF1` | The parade ground. Page background, cool grey (not cream). |
| **Drill Grey** | `#596273` | Secondary text, gridlines, hints. |

Status colours for the roll keep their meaning (Present green, Late amber, Excused blue, Absent Crest Red, Unmarked grey), retuned to sit with Serge and Brass. In dark mode Serge becomes the night: page `#0D1424`, cards `#152039`, and Brass brightens to `#E2B654` so it still reads.

## Type

| Typeface | Role |
| --- | --- |
| **Big Shoulders Display** (600 to 800) | Display only: page titles, card titles, big numbers (strength, attendance rate, totals), the brand. Tall, condensed lettering in the spirit of stencilled parade-ground signs and embroidered badge lettering. Set large and tight, in title case, never in capitals. |
| **Atkinson Hyperlegible Next** (400, 500, 700) | Everything people read and type: names, forms, tables, buttons, notices. Designed for legibility; each character is distinct (1, l and I; 0 and O), which matters when an officer scans 60 names on a phone in bright sun. |

**Scale.** A 1.25 ratio from a 16px body: 13, 16, 20, 25, 31, 39, 49, 61. Lines are kept under about 75 characters.

**Small labels.** These were tracked-out capitals (for example "NEEDS ATTENTION", "ON THE ROLL") and are now sentence case in 13px bold Atkinson. This changes how they look, not the words.

## Layout concept

```
Parade HQ, desktop                         Public site, desktop
┌────────┬───────────────────────────────┐  ┌──────────────────────────────────────┐
│ SERGE  │ Parade overview      [date][▶]│  │ (photo, Serge overlay)               │
│ ▌Cmd   │ ═══ brass rule                │  │  Growing young people                │
│  Desk  │ ┌─────┬─────┬─────┬─────┐     │  │  who are Sure & Stedfast.            │
│  ...   │ │ 64  │ 0/64│ 64  │92.1%│     │  │  ═══ brass rule   [Join us] [Events] │
│        │ └─────┴─────┴─────┴─────┘     │  ├──────────────────────────────────────┤
│        │ ┌ Today ───────┐┌ Trend ─────┐│  │ Latest notices (left aligned, ruled) │
│        │ │ Serge band   ││ ▮▮▮▮▮▮█    ││  │ ...                                  │
│        │ └──────────────┘└────────────┘│  └──────────────────────────────────────┘
└────────┴───────────────────────────────┘
 ▌ = brass bar on the current page        █ = latest parade bar in Brass
```

- **Left-aligned throughout.** It's a roll book, not a poster. Numbers in tables are right-aligned with tabular figures.
- **The brass rule.** A short, thick Brass bar, like a single chevron stripe, appears in three places only: beside the current page in the menu, under the page title, and on the latest data point in a chart. It means "you are here" or "this is now".
- **Flat, crisp surfaces.** White cards on Tarmac with a 1px border and no soft drop shadows. Corner radius follows hierarchy rather than being one value everywhere: 4px for buttons and fields (drill precision), 8px for cards, and fully round only for roll-call status marks, which are badges.
- **Uniform and webbing.** The menu and the hero stay Serge. Working surfaces stay white.
- **Charts.**
  - Strength bars are Serge, with the latest parade in Brass.
  - Gridlines are dotted Drill Grey, and labels use Atkinson.
- **Parade dates.**
  - The calendar grid and the Report date strip become square, flat "drill tiles" in a strict grid.
  - Parade Saturdays are outlined in Serge, and the chosen date is filled Serge with a Brass underline.
- **Tables.** Ruled like a roll book: hairline rows and a heavier Serge rule under the header.

## Principles

1. **Function first.** It must work outdoors, on a phone, one-handed: 44px touch targets on phones, strong contrast and legible type.
2. **Spend boldness in one place.** The condensed display type and the brass rule are the identity. Everything else stays quiet.
3. **Colour means something.** Brass means now, Crest Red means absent or danger, and Serge means authority. Nothing is coloured for decoration.
4. **Respect the uniform.** Flat, sharp and orderly, like insignia, not a startup dashboard.
5. **Quality floor.** Visible keyboard focus (a Brass ring), reduced motion respected, light and dark themes, works from 375px up, and the Owner's accent choice still recolours Serge.

## Review against the brief: what I changed after the first draft

My first draft came out as roughly the default I'd produce for any youth-club or school dashboard. I revised these parts:

| First draft | Why it was generic | Revised to |
| --- | --- | --- |
| Keep Manrope, or switch to Inter, for everything | A neutral geometric sans used on countless dashboards; says nothing about the subject | **Big Shoulders Display** for display (parade-ground signage) with **Atkinson Hyperlegible Next** for text (legible in the sun on a phone) |
| Navy and gold with a gradient hero and gold headings | Navy and gold is the stock "academy or law firm" look; gold text and gradients read as decoration | Gold becomes **Brass**, used only as a small marker for "now". The hero is a flat Serge overlay. Headings are Serge or white, never gold. |
| Rounded 16px cards with soft shadows everywhere (the current design) | The SaaS card kit: one radius on everything, the same soft grey shadow | Flat cards with a 1px border and **radius by hierarchy** (4, 8, round only for status badges) |
| Off-white warm page background | Close to the cream default | Cool **Tarmac** grey, the parade ground |
| Small tracked-out capital labels above numbers and sections | A generated-page tell | Sentence-case 13px bold labels |
| Brass accent on buttons, links, badges and charts | An accent used everywhere stops meaning anything | Brass only on the brass rule, the latest chart bar, the key number and focus rings |

Left as they are, because they're content rather than design:
- the middle dots in existing text such as "4 officers · 6 primers"
- the arrows in "Reply →"
- all wording

The brief says the design changes and the content doesn't.
