# FRIDAY: Design Guide (Glassmorphism)

**Companion to:** `prd.md`, `tech-stack.md`, `app-flow.md`
**Date:** October 21, 2026
**Design direction:** Glassmorphism, with frosted translucent surfaces floating over soft, colorful backgrounds, creating depth, calm, and focus for a dense student dashboard.

---

## 1. Design Principles

1. **Calm over clutter.** Students arrive stressed (deadlines, registration). The UI should feel light, spacious, and organized.
2. **Glass is a surface, not decoration.** Use translucency to show hierarchy and layering, not on every element.
3. **Legibility first.** Text contrast always wins over aesthetics (WCAG 2.1 AA, per the PRD). If glass hurts readability, add opacity.
4. **Urgency is communicated by color and shape, not blur.** Status colors (🔴🟡🟢) stay solid and high-contrast.
5. **Consistency.** A small set of glass levels, radii, and shadows used everywhere.
6. **Graceful degradation.** The UI must work without `backdrop-filter` and on low-end phones.

---

## 2. The Glass Recipe

A glass surface is the combination of five properties:

| Property | Purpose | Typical value |
|---|---|---|
| Translucent fill | Lets background color through | `rgba(255,255,255,0.12–0.35)` (light) / `rgba(20,24,40,0.35–0.55)` (dark) |
| Backdrop blur | Frosted effect | `blur(16px–28px)` |
| Saturation boost | Keeps colors vivid behind the blur | `saturate(140%–180%)` |
| 1px light border | Defines the edge, simulates a glass rim | `rgba(255,255,255,0.25–0.4)` |
| Soft shadow | Lifts the surface | `0 8px 32px rgba(31,38,135,0.15)` |

Optional: a subtle inner highlight (`inset 0 1px 0 rgba(255,255,255,0.4)`) and a faint noise texture (2–4% opacity) to avoid banding.

### Base CSS

```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}

/* Fallback when backdrop-filter is unsupported */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--glass-fallback); }
}

/* Respect user preference for reduced transparency */
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--glass-fallback);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

---

## 3. Glass Levels (Elevation System)

| Level | Use | Fill (light) | Blur | Border | Shadow |
|---|---|---|---|---|---|
| **G0: Base** | Page background layer, no glass | n/a | n/a | n/a | n/a |
| **G1: Surface** | Main cards, widgets, sidebar | `rgba(255,255,255,0.22)` | 16px | `rgba(255,255,255,0.30)` | soft |
| **G2: Raised** | Hovered cards, dropdowns, popovers | `rgba(255,255,255,0.30)` | 20px | `rgba(255,255,255,0.38)` | medium |
| **G3: Overlay** | Modals, drawers, command palette | `rgba(255,255,255,0.45)` | 28px | `rgba(255,255,255,0.45)` | large |
| **G-Solid: Content** | Data tables, long text, forms in heavy use | `rgba(255,255,255,0.75)` | 12px | `rgba(255,255,255,0.5)` | soft |

**Rule:** the more text a surface contains, the more opaque it should be. Dashboards use G1 for widgets; dense tables and long notices use G-Solid.

---

## 4. Color System

### 4.1 Backgrounds (the thing the glass sits on)
Glass needs something colorful behind it. Use a soft **mesh/gradient background** with 2–3 blurred color blobs, fixed behind the app.

| Theme | Gradient base | Blob accents |
|---|---|---|
| **Light** | `#EEF2FF → #FDF2F8` | Indigo `#818CF8`, Pink `#F9A8D4`, Cyan `#67E8F9` |
| **Dark** | `#0B1020 → #1A1033` | Violet `#7C3AED`, Blue `#2563EB`, Teal `#0D9488` |

```css
body {
  background:
    radial-gradient(40% 40% at 15% 10%, rgba(129,140,248,.55), transparent 60%),
    radial-gradient(35% 35% at 85% 20%, rgba(249,168,212,.45), transparent 60%),
    radial-gradient(45% 45% at 50% 95%, rgba(103,232,249,.40), transparent 60%),
    linear-gradient(135deg, #EEF2FF, #FDF2F8);
  background-attachment: fixed;
}
```

### 4.2 Brand and UI Tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand-500` | `#6366F1` | `#818CF8` | Primary actions, links, active nav |
| `--brand-600` | `#4F46E5` | `#6366F1` | Hover/pressed |
| `--accent-500` | `#06B6D4` | `#22D3EE` | Secondary highlights, charts |
| `--text-primary` | `#0F172A` | `#F8FAFC` | Headings, body |
| `--text-secondary` | `#334155` | `#CBD5E1` | Supporting text |
| `--text-muted` | `#475569` | `#94A3B8` | Captions (still ≥ 4.5:1 on glass) |
| `--border-subtle` | `rgba(15,23,42,0.08)` | `rgba(255,255,255,0.12)` | Dividers |

### 4.3 Semantic / Status Colors (solid, never blurred)
Matches the deadline statuses in the PRD.

| Status | Color | Background chip | Icon |
|---|---|---|---|
| 🔴 Urgent / Error | `#DC2626` | `rgba(220,38,38,0.14)` | alert-circle |
| 🟡 Upcoming / Warning | `#D97706` | `rgba(217,119,6,0.16)` | clock |
| 🟢 On track / Success | `#16A34A` | `rgba(22,163,74,0.14)` | check-circle |
| 🔵 Info | `#2563EB` | `rgba(37,99,235,0.14)` | info |

**Never rely on color alone**: every status pairs color with an icon and a text label.

### 4.4 Notice Category Colors
Registration `#6366F1` · Exam `#DC2626` · Tuition `#D97706` · Scholarship `#16A34A` · Holiday `#EC4899` · Academic `#0891B2` · Administrative `#64748B` · Emergency `#B91C1C` (always with a solid banner).

### 4.5 CSS Variables

```css
:root {
  --glass-fill: rgba(255,255,255,0.22);
  --glass-fallback: rgba(255,255,255,0.92);
  --glass-border: rgba(255,255,255,0.30);
  --glass-highlight: rgba(255,255,255,0.40);
  --glass-shadow: 0 8px 32px rgba(31,38,135,0.15);
  --glass-blur: 16px;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}

[data-theme="dark"] {
  --glass-fill: rgba(20,24,40,0.45);
  --glass-fallback: rgba(20,24,40,0.96);
  --glass-border: rgba(255,255,255,0.14);
  --glass-highlight: rgba(255,255,255,0.10);
  --glass-shadow: 0 8px 32px rgba(0,0,0,0.45);
}
```

---

## 5. Typography

| Role | Font | Weight | Size / Line height |
|---|---|---|---|
| Display / H1 | **Inter** (or Plus Jakarta Sans) | 700 | 32 / 40 |
| H2 | Inter | 600 | 24 / 32 |
| H3 | Inter | 600 | 18 / 26 |
| Body | Inter | 400–500 | 15–16 / 24 |
| Small / Caption | Inter | 500 | 13 / 18 |
| Numbers / data | Inter with tabular figures (`font-variant-numeric: tabular-nums`) | 600 | varies |
| Bangla (future) | Noto Sans Bengali / Hind Siliguri | match weights | slightly larger line-height (1.6) |

**Rules**
- Use weight 500+ on glass for body text; thin weights wash out over blur.
- Minimum 14px for any interactive text; 16px for body on mobile.
- Avoid pure white text on light glass; use `--text-primary` dark on light theme.

---

## 6. Layout, Spacing, and Grid

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64 px.
- **Radii:** cards 20px, buttons/inputs 12–14px, chips fully rounded, modals 28px.
- **Desktop shell:** floating glass **sidebar** (240px, collapsible to 72px) with 16px margin from the viewport, floating glass **top bar** (64px) with search, notifications, profile.
- **Content grid:** 12 columns, max width 1280px, 24px gutters. Dashboard widgets span 4/6/8/12 columns.
- **Mobile shell (≥ 360px):** 16px side gutters, floating glass **bottom tab bar** (Home, Schedule, Deadlines, Notices, More), Assistant as a floating action button.
- **Z-order:** background → content cards (G1) → sticky bars → popovers (G2) → modals/drawers (G3) → toasts.

> **Stacking caution:** `backdrop-filter` only blurs what is *behind* the element. Nested glass-on-glass blurs the parent, not the page, so avoid stacking more than two glass layers.

---

## 7. Components

### 7.1 Cards and Widgets (G1)
- 20px radius, 20–24px padding, subtle hover lift (`translateY(-2px)` + G2 shadow).
- Header row: icon in a tinted circle, title (H3), optional action link.
- Dashboard widgets: Today's classes, Next deadlines, Important notices, Attendance alerts, Degree snapshot.

### 7.2 Buttons
| Type | Style |
|---|---|
| **Primary** | Solid brand gradient (`#6366F1 → #4F46E5`), white text, 12px radius, soft colored shadow. *Not glass*, so it stays the clearest call to action. |
| **Secondary** | Glass G1 with brand-colored text and border |
| **Ghost** | Transparent, hover shows G1 fill |
| **Destructive** | Solid red, white text |
| **Icon button** | 40px glass circle |

States: hover (brighten + lift), active (scale 0.98), focus (2px brand ring + 2px offset), disabled (50% opacity, no pointer), loading (spinner replaces label, width preserved).

### 7.3 Inputs and Forms
- Field: G-Solid fill (`rgba(255,255,255,0.6)`), 1px border, 12px radius, 44px height (touch-friendly).
- Label above field (14px, 500 weight); helper text below.
- **Focus:** brand border + 3px soft ring.
- **Error:** red border, icon, and message directly beneath ("Enter your university email"), plus a summary at the top of long forms (PRD FR-3.2).
- Select, date, and time pickers open as G2 popovers; the multi-select (completed courses) uses searchable chips.

### 7.4 Navigation
- **Sidebar item:** icon + label; active state = brand-tinted glass pill with a left indicator; hover = G2 fill.
- **Top bar:** global search (opens a G3 command palette with `Ctrl/⌘ + K`), notification bell with count badge, avatar menu.
- **Breadcrumbs** on nested pages (PRD FR-2.2).

### 7.5 Data Display
- **Tables (admin, sections):** G-Solid container, sticky header, zebra rows at 4% opacity, row hover highlight, sort icons, sticky first column on mobile with horizontal scroll.
- **Schedule grid:** G-Solid canvas; class blocks are solid-tinted cards (course color at 20% fill with a 3px left accent) so times stay readable.
- **Chips/badges:** fully rounded, tinted fill + colored text + icon.
- **Progress ring (degree):** gradient stroke on a translucent track, centered percentage in tabular numerals.
- **Charts:** brand/accent palette, 2px lines, 12% area fills, grid lines at 8% opacity, direct labels where possible.

### 7.6 Feedback
| Component | Spec |
|---|---|
| **Toast** | G3 glass, bottom-right desktop / top on mobile, icon + message + optional action, auto-dismiss 4s (errors persist until closed) |
| **Banner (emergency)** | Solid red, full width, not glass, white text, non-dismissible until acknowledged |
| **Modal** | G3 glass over a dimmed (40% black) backdrop, 28px radius, focus trapped, `Esc` closes |
| **Drawer** | Right-side G3, 420px wide (full-screen on mobile) for deadline details and class details |
| **Tooltip** | Small dark solid (readability), 8px radius |

### 7.7 Registration Copilot Cards
- **Plan card:** G1 with a header chip (Plan A / B / C), course rows with section, time, instructor; footer with credits and conflict count (green "0 conflicts" chip).
- **Recommended plan:** brand gradient border (2px) and a "Best for you" badge.
- **Compare view:** two or three columns of plan cards aligned by day/time.
- **Conflict highlight:** overlapping blocks outlined in red with a striped pattern (not color alone).

### 7.8 AI Assistant
- Chat panel in G-Solid for readability; user bubbles in brand gradient, assistant bubbles in G1.
- Source chips under each answer linking to the underlying record (schedule entry, notice).
- Typing indicator: three softly pulsing dots.
- Suggested prompts as ghost glass chips in the empty state.

---

## 8. UI States (Aligned with the PRD)

| State | Visual treatment |
|---|---|
| **Loading** | Skeleton blocks with a slow shimmer (translucent white sweep) matching final card size; spinners only for short actions |
| **Empty** | Centered soft illustration or large icon in a tinted circle, one-line explanation, primary action button |
| **Success** | Green toast with check icon; brief checkmark animation on completed deadlines |
| **Error** | Inline red message with icon and retry action; full-page fallback for 404/500 on a G1 card with a clear route home |
| **Offline / stale** | Slim info banner "Offline. Last updated 9:14 PM" |
| **Permission denied** | G1 card explaining the access issue and linking to the right portal |

---

## 9. Motion

| Interaction | Duration | Easing |
|---|---|---|
| Hover lift | 150 ms | `ease-out` |
| Page/route transition | 200–250 ms fade + 8px rise | `cubic-bezier(0.22,1,0.36,1)` |
| Modal / drawer in | 250 ms scale 0.97→1 / slide | same |
| Toast in/out | 200 ms | ease-out / ease-in |
| Skeleton shimmer | 1.6 s loop | linear |
| List reorder / filter change | 180 ms | ease-in-out |

- Prefer animating `transform` and `opacity` only (cheap on GPU); never animate `backdrop-filter` blur radius.
- Respect `prefers-reduced-motion`: replace transitions with instant or fade-only changes and stop shimmer loops.

---

## 10. Accessibility (WCAG 2.1 AA)

| Concern | Rule |
|---|---|
| **Contrast** | Text ≥ 4.5:1, large text and UI components ≥ 3:1, measured against the *worst-case* background behind the glass (test over both bright and dark blobs) |
| **Glass + text** | Surfaces carrying paragraphs or small text use G-Solid or a higher opacity fill |
| **Focus** | Visible 2px brand ring with offset on every interactive element, never removed |
| **Keyboard** | Full keyboard navigation; logical tab order; skip-to-content link; `Esc` closes overlays; focus trapped in modals and returned on close |
| **Screen readers** | Semantic landmarks (`nav`, `main`, `aside`), labeled controls, `aria-live` for toasts and form errors, status chips include text |
| **Color independence** | Icons and text accompany all status colors; conflict patterns use stripes as well as red |
| **Touch targets** | Minimum 44×44 px |
| **Reduced transparency/motion** | Honor `prefers-reduced-transparency`, `prefers-reduced-motion`, and `prefers-contrast: more` (increase opacity and border strength) |
| **Zoom** | Layouts work at 200% zoom and 360 px width without horizontal scrolling |

---

## 11. Performance Guidelines

`backdrop-filter` is GPU-expensive, especially on low-end Android devices common among students.

1. **Limit simultaneous glass surfaces** in the viewport (aim for fewer than ~8 large ones on mobile).
2. **Use lower blur on mobile** (8–12px instead of 16–28px).
3. **Do not apply glass to list items** in long lists (tables, notice lists); use G-Solid or plain surfaces.
4. **Keep the background static** (CSS gradients or a single pre-rendered image), with no animated video or heavy canvas behind glass.
5. **Avoid `backdrop-filter` on elements that animate position every frame**, and use `will-change: transform` sparingly.
6. **Provide a "Reduce effects" setting** in Profile → Settings that switches all surfaces to solid fallbacks.
7. **Test** on a mid-range Android phone and aim for 60 fps scrolling on the dashboard.

---

## 12. Dark Mode

- Default follows the system setting with a manual toggle (stored per user).
- Dark glass uses deeper tints (`rgba(20,24,40,0.45)`), lighter 12–14% borders, and stronger shadows.
- Background blobs shift to violet, blue, and teal at lower brightness to avoid glare.
- Re-verify contrast for status colors; use lighter tints (`#F87171`, `#FBBF24`, `#4ADE80`) on dark glass.

---

## 13. Iconography and Imagery

- **Icons:** Lucide (consistent 1.75px stroke, 20–24px), tinted per module (Academic = indigo, Deadlines = amber, Notices = cyan, Degree = emerald, Career = pink).
- **Illustrations:** soft, abstract, gradient shapes in the brand palette for empty states. Avoid photographic backgrounds behind text.
- **Logo/Brand mark:** "FRIDAY" wordmark in Inter 700 with a small glass-orb icon; works on both light and dark backgrounds.

---

## 14. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| **< 640 px (mobile)** | Single column, bottom tab bar, drawers become full-screen sheets, tables scroll horizontally, reduced blur |
| **640–1023 px (tablet)** | Two columns, collapsed icon-only sidebar |
| **≥ 1024 px (desktop)** | Full sidebar, 12-column dashboard grid |
| **≥ 1440 px** | Content capped at 1280 px, centered, with more background visible |

---

## 15. Implementation Notes (Next.js + Tailwind + shadcn/ui)

**Tailwind utilities (add to `tailwind.config`):**

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    borderRadius: { lg: "20px", xl: "28px" },
    boxShadow: {
      glass: "0 8px 32px rgba(31,38,135,0.15)",
      "glass-lg": "0 16px 48px rgba(31,38,135,0.22)",
    },
    backdropBlur: { glass: "16px", "glass-lg": "28px" },
  },
}
```

**Reusable component classes:**

```css
@layer components {
  .glass-1 { @apply bg-white/20 backdrop-blur-glass backdrop-saturate-150 border border-white/30 shadow-glass rounded-lg; }
  .glass-2 { @apply bg-white/30 backdrop-blur-[20px] backdrop-saturate-150 border border-white/40 shadow-glass-lg rounded-lg; }
  .glass-3 { @apply bg-white/45 backdrop-blur-glass-lg backdrop-saturate-150 border border-white/45 shadow-glass-lg rounded-xl; }
  .glass-solid { @apply bg-white/75 backdrop-blur-[12px] border border-white/50 shadow-glass rounded-lg; }
}
```

- Build a `<GlassCard level="1|2|3|solid">` React component so levels are used consistently.
- Customize shadcn/ui `Card`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, and `Toast` to use the glass levels above.
- Store theme and "Reduce effects" in a cookie so the server renders the correct tokens without a flash.
- Document components in Storybook with light/dark and reduced-transparency variants, and run axe checks.

---

## 16. Do and Don't

| ✅ Do | ❌ Don't |
|---|---|
| Use glass for containers, nav, and overlays | Put glass on every small element (chips, rows) |
| Keep primary CTAs solid and vivid | Make the main button translucent |
| Increase opacity for text-heavy panels | Place body text on low-opacity glass over busy backgrounds |
| Pair status colors with icons and labels | Use color alone to show urgency |
| Limit glass layers to two deep | Nest glass inside glass inside glass |
| Offer solid fallbacks and a "Reduce effects" toggle | Assume every device handles blur smoothly |
| Use soft gradients behind glass | Use busy photos or high-contrast patterns behind text |

---

## 17. Design Checklist (Before Shipping a Screen)

- [ ] Contrast checked against the brightest and darkest background areas
- [ ] Text-heavy areas use G-Solid or higher opacity
- [ ] Status colors have icons and text
- [ ] Focus ring visible; keyboard path works
- [ ] Loading, empty, error, and success states designed
- [ ] Works at 360 px width and 200% zoom
- [ ] Reduced transparency, reduced motion, and dark mode verified
- [ ] Glass count and scrolling performance tested on a mid-range phone
