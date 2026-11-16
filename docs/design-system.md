# Design system

Both apps share one visual language, defined in `shared/design/theme.css` and `shared/ui/`. This page explains the ideas behind it and how to use it.

- [The idea](#the-idea)
- [Colour](#colour)
- [Typography](#typography)
- [Signature components](#signature-components)
- [Shared React components](#shared-react-components)
- [Formatters](#formatters)
- [Writing](#writing)
- [Accessibility](#accessibility)
- [How it is wired up](#how-it-is-wired-up)

---

## The idea

Air travel already has a strong visual vocabulary: boarding passes with a torn-off stub, departure boards with condensed numerals, three-letter airport codes. FlyWise borrows from it instead of using generic cards.

- **A flight is a boarding pass.** The route is on the body; the fare and the action are on a stub separated by a perforated line.
- **Anything a departure board would show is set like one.** Times, airport codes, fares, flight numbers and booking references use a condensed typeface with fixed-width digits, so they line up in lists.
- **Colour means something.** One hue per booking status and one per recommendation category, used the same way everywhere.

The traveller app is light and spacious. The desk app uses the same parts, denser, with a dark sidebar, because it is a working tool that is open all day.

---

## Colour

Defined as Tailwind theme tokens, so `--color-signal-600` becomes `bg-signal-600`, `text-signal-600`, `border-signal-600` and so on.

**Base**

| Token | Value | Used for |
|---|---|---|
| `night-950`, `night-900`, `night-800`, `night-700`, `night-600` | `#061533` to `#33558f` | Deep navy: the desk sidebar, dark panels, secondary buttons |
| `signal-600` (with `50`, `100`, `200`, `500`, `700`) | `#1f5bff` | The one accent: primary buttons, links, focus rings, charts |
| `mist` | `#f3f6fb` | Page background |
| `line` | `#dce3ef` | Borders and dividers |
| `ink`, `ink-soft`, `ink-faint` | `#0a1f44`, `#4a5a78`, `#7c8aa5` | Text: primary, secondary, tertiary |

**Booking statuses** (always a dot plus a word, never colour alone)

| Status | Token | Colour |
|---|---|---|
| Waiting for review | `wait-50`, `wait-700` | Amber |
| Allocating seats | `signal-100`, `signal-700` | Blue |
| Confirmed | `mint-50`, `mint-600`, `mint-700` | Green |
| Rejected, Failed | `stop-50`, `stop-600`, `stop-700` | Red |
| Revoked | `void-50`, `void-700` | Violet |
| Cancelled | `ink-soft` on a faint navy tint | Grey |

Revoked has its own colour because it is a different event from rejected: something that was approved has been withdrawn.

**Recommendation categories**

| Category | Colour |
|---|---|
| Best overall | Blue (`signal`) |
| Cheapest | Green (`mint`) |
| Fastest | Orange (`flare`) |

**Shadows**: `shadow-pass` (resting cards), `shadow-lift` (hero and raised panels), `shadow-pop` (dialogs and toasts). All are tinted navy instead of grey.

---

## Typography

| Role | Typeface | Class | Used for |
|---|---|---|---|
| Reading | Hanken Grotesk | default (`font-sans`) | Headings, body text, labels, buttons |
| Departure board | Barlow Condensed | `board` | Times, airport codes, fares, flight numbers, references, counts |

Both load from Google Fonts in each app's `index.html`. Without internet the apps fall back to system fonts.

The `board` class also turns on tabular (fixed-width) figures. Use it for any number that sits in a column or changes while the page is open.

```jsx
<p className="board text-[2rem] font-semibold">06:10</p>
<p className="board text-lg text-night-700">BHO</p>
```

Sizes follow a small scale: 13px captions, 15px body, 17 to 20px section titles, 28 to 30px page titles, and large board numerals (32 to 88px) for the figures that matter most on a screen.

---

## Signature components

These are plain CSS classes in `theme.css`.

### Boarding pass: `.pass` and `.pass-stub`

```jsx
<article className="pass" style={{ '--stub-width': '15rem' }}>
  <div className="p-6">route, times, travellers</div>
  <div className="pass-stub p-6">fare and the main action</div>
</article>
```

On wide screens the stub sits on the right behind a dashed perforation with two notches cut out of the edge. On phones it moves underneath. Set `--pass-notch` to the page's background colour when the pass sits on something other than the default background.

### Route line: `.route-line`

A dashed line with a dot at each end, drawn between the departure and arrival columns. The duration goes above it and the stops below.

### Form field: `.field`

One class for inputs, selects and textareas: consistent height, border, hover and focus ring. Add `aria-invalid="true"` and the border turns red.

### Others

| Class | Purpose |
|---|---|
| `.pass-tab` | The category label that sits on the top edge of a pass |
| `.flight-arc`, `.flight-plane` | The landing page's flight path; the plane flies it once on load |
| `.toast-in` | Entrance for live-update toasts |
| `.spin` | The loading spinner |

Motion is used sparingly and is switched off for people who ask their system to reduce motion.

---

## Shared React components

Exported from `shared/ui/index.jsx`; import with `import { Button } from '@shared/ui/index.jsx'`.

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant`: `primary`, `navy`, `outline`, `ghost`, `danger`, `dangerOutline`. `size`: `sm`, `md`, `lg`. `loading` | Shows a spinner and disables itself while `loading` |
| `StatusPill` | `status` | A booking status as a coloured dot and its plain-language label |
| `Notice` | `tone`: `info`, `success`, `warn`, `error`. `title`, `action` | Inline messages. Errors are announced to screen readers |
| `Field` | `label`, `hint`, `error`, `htmlFor` | Wraps a form control with its label and messages |
| `Dialog` | `open`, `onClose`, `title`, `footer` | Modal for confirmations. Closes on Escape |
| `EmptyState` | `icon`, `title`, `action` | What a list shows when it has nothing |
| `PageLoading` | `label` | Full-area loading indicator |
| `Spinner` | `className` | |
| `cx(...)` | | Joins class names, skipping empty values |

Desk-only building blocks are in `apps/admin-frontend/src/components/ui.jsx` (`PageHeader`, `Panel`, `Tabs`, `SearchField`, `Pagination`, `SeatBar`) and `Charts.jsx` (the requests-per-day columns, the status split, ranked bars). Traveller-only pieces are in `apps/user-frontend/src/components/` (`FlightPass`, `SearchTicket`, `StatusPath`, `TravellerFields`).

### Charts

The desk overview's charts are hand-built SVG and HTML, with no chart library. They follow a few rules: one axis per chart, thin marks, hover details, direct labels on only the values that matter (the peak and today), and every figure also available as text beside the chart. Status colours are reserved for statuses and are never reused as a generic "series 4".

---

## Formatters

From `shared/ui/format.js`. All dates and times are shown in India Standard Time regardless of the viewer's own time zone.

| Function | Example output |
|---|---|
| `time(value)` | `06:10` |
| `day(value)` | `Wed 25 Nov` |
| `date(value)` | `25 Nov 2026` |
| `stamp(value)` | `16 Nov, 07:58` |
| `ago(value)` | `14 min ago` |
| `money(amount, currency)` | `₹4,870` |
| `duration(minutes)` | `1h 35m` |
| `stopsText(stops)` | `Non-stop`, `1 stop` |

---

## Writing

The words are part of the design.

- **Say what the thing is.** "Booking request", "Seat inventory", "Waiting for review". Never the internal status name on screen.
- **A button says what it does**, and the result uses the same word: "Reject request" leads to "Request rejected."
- **Be honest about simulation.** Wherever a traveller might think they are buying a ticket, the page says seats are simulated and nothing is charged.
- **Errors explain and direct.** "This fare has expired. Search again to see current fares."
- **Empty screens invite the next step.** "No trips yet. Search a route ..."
- Sentence case everywhere. No exclamation marks.

---

## Accessibility

- Status is never shown by colour alone: every pill has a dot **and** a label.
- Form controls have real labels. An error appears directly under its field and the control is marked `aria-invalid`.
- Keyboard focus is always visible.
- Dialogs use the browser's native `<dialog>` element, so focus stays inside and Escape closes them.
- Tables have header cells with scope; on phones the desk's request table becomes a list of cards.
- Animations stop under `prefers-reduced-motion`.
- Error messages use `role="alert"` so screen readers announce them.

---

## How it is wired up

Each frontend's `src/index.css` is three lines:

```css
@import "tailwindcss";
@import "../../../shared/design/theme.css";
@source "../../../shared/ui";
```

Tailwind v4 reads the `@theme` block in `theme.css` and generates utilities from the tokens. The `@source` line tells it to also scan the shared components for class names. To change a colour for both apps, change one value in `theme.css`.
