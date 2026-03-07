# Product Feedback Spec: Disclosure Watch — Visual Design
**Date:** March 6, 2026
**Scope:** Full site visual design review — color, typography, cards, layout, iconography
**Reviewer:** User feedback session (voice, via mobile)
**Output:** v0 / design tools (visual changes only — functionality changes in separate Claude Code spec)

---

## Context
Disclosure Watch is a UAP/UFO disclosure tracking site built with Next.js and Tailwind CSS. The current design is dark-themed with text-heavy layouts, inconsistent card styling across content types, and limited visual hierarchy. The site needs a design refresh that introduces a more refined color palette, distinct visual treatments for each content type (documents, events, timeline items), and better use of whitespace, icons, and imagery to make information scannable and the site feel modern and trustworthy.

---

## Changes

### Critical (fix these first)

#### Overhaul the color palette
- **What's wrong:** The current dark theme feels heavy and creates readability issues. Multiple bright colors (turquoise/aqua, various blues) compete on the same cards without a clear hierarchy.
- **What it should be:** A more balanced palette with either a refined dark mode or a light background option. Define a clear system: one cohesive accent color for interactive elements (consider a yellowish-green or similar vibrant-but-not-jarring color instead of turquoise/aqua), one consistent bright blue for all links, a primary action color, a secondary action color, and a neutral/informational color. Every color should have a defined role.
- **Why it matters:** Color inconsistency makes the site feel unpolished and makes it harder for users to learn the visual language of what's clickable vs. informational.
- **Where:** Site-wide — Tailwind theme config, all components

#### Create distinct card designs for each content type
- **What's wrong:** Document cards, event cards, and timeline cards all look too similar, making it hard to distinguish content types at a glance.
- **What it should be:** Three distinct card treatments:
  - **Document cards:** Clean, information-focused. Show only title, brief summary, content type tag, priority level indicator, and date. Document icon on every card. Hover state that highlights the card.
  - **Event/Hearing cards:** Visually distinct from documents — different card border, background color, or shape treatment. Event/hearing icon on every card. Clear visual separation between "Upcoming" and "Past" events (color coding, border treatment, or badge). Expanded description length (~320 chars) with readable typography.
  - **Timeline cards:** Distinct from both documents and events. Timeline icon on every card. Prominent dates and milestone markers. Priority level color coding with an accessible legend.
  - **All cards:** Consistent spacing and padding, clear visual hierarchy (title > summary > metadata), hover states indicating interactivity, entire card clickable.
- **Why it matters:** Users need to instantly recognize what type of content they're looking at without reading metadata labels.
- **Where:** Documents page, Hearings and Events page, Disclosure Timeline page

#### Design and implement a content type icon system
- **What's wrong:** No visual icons exist for content types — everything is text-only, making the site feel dense and hard to scan.
- **What it should be:** A consistent icon set:
  - Document icon (file/document symbol)
  - Event/Hearing icon (calendar or microphone symbol)
  - Timeline icon (clock or milestone symbol)
  - News icon (newspaper or broadcast symbol)
  Display these on every content card across all pages, in navigation if helpful, and in cross-content search results to visually distinguish content types.
- **Why it matters:** Icons provide instant visual recognition and break up text-heavy layouts.
- **Where:** All card components, navigation, search results

### Important (fix these next)

#### Improve typography hierarchy
- **What's wrong:** Text lacks clear visual hierarchy — headers, body text, metadata, and links don't have enough differentiation in weight, size, or spacing.
- **What it should be:** Change all nav labels and headers to sentence case (e.g., "Hearings and events" not "Hearings and Events"). Ensure sufficient contrast between text and background. Build hierarchy with font weights and sizes — page titles should be clearly dominant, section headers secondary, card titles tertiary, and metadata/tags smallest.
- **Why it matters:** Good typography hierarchy lets users scan quickly and find what's important without reading everything.
- **Where:** Site-wide — headings, nav, card text, metadata

#### Add whitespace and visual breathing room
- **What's wrong:** Layouts are text-heavy with insufficient spacing between elements.
- **What it should be:** More generous padding between cards, sections, and content blocks. Break up text-heavy areas with icons, imagery, or subtle visual dividers. Consider full-width vs. constrained-width layouts for optimal readability. Ensure responsive design works well on mobile and tablet.
- **Why it matters:** Whitespace makes content feel organized and reduces cognitive load.
- **Where:** All pages — card grids, section spacing, page margins

#### Design clickable tags and categories
- **What's wrong:** Tags and categories exist on content but don't look interactive.
- **What it should be:** Visually distinct treatment for all clickable tags — color, underline, or subtle background highlight. Clear hover states that indicate interactivity. Consistent styling across all tag instances site-wide.
- **Why it matters:** If tags are the main way users discover connections across content (per the Claude Code spec), they need to look obviously tappable.
- **Where:** All card components, lightbox/interior views, search results

#### Redesign the subscribe widget
- **What's wrong:** Full-width email signup on the homepage takes too much visual real estate.
- **What it should be:** Smaller, more subtle design — positioned in top right corner or footer. Consider a compact button that opens a clean lightbox form rather than an inline full-width layout. The lightbox form should be visually polished and feel like a premium interaction.
- **Why it matters:** The signup should feel like an invitation, not an interruption.
- **Where:** Homepage subscribe component

### Nice to Have (when there's time)

#### Design the user submission form
- **What's wrong:** No submission form exists yet (being built per Claude Code spec).
- **What it should be:** Clean, clearly labeled form with fields for: submission type (dropdown or radio buttons), title/headline, link or description, date, additional context/notes. Use clear labels and helpful placeholder text. Visual styling should match the site's design system.
- **Why it matters:** If users are going to contribute, the form should feel trustworthy and easy to use.
- **Where:** About page, bottom of Documents page, bottom of Hearings and Events page

#### Refine button styling
- **What's wrong:** Buttons may not be visually consistent or clearly interactive.
- **What it should be:** Consistent button styling across the site using the defined primary and secondary action colors. Clear hover and active states. Where entire cards are clickable, remove standalone "Details" or "View Source" buttons to reduce visual clutter.
- **Why it matters:** Consistent interaction patterns build user confidence.
- **Where:** Site-wide — all buttons and CTAs

#### Introduce imagery or visual elements
- **What's wrong:** The site is almost entirely text-based with no imagery to break up content.
- **What it should be:** Consider adding subtle visual elements — section header illustrations, background patterns, or imagery related to disclosure themes. Don't overdo it; the site should remain information-focused, but some visual variety would make it feel less like a spreadsheet.
- **Why it matters:** Visual variety reduces fatigue on content-heavy sites.
- **Where:** Homepage sections, page headers, empty states

---

## Design Notes
The overall direction is: modern, trustworthy, information-dense but not overwhelming. Think intelligence briefing, not government database. The site should feel like a curated, authoritative source — clean enough to be credible, but with enough visual personality to not feel sterile.

Key principles emerging from the feedback:
- **Content types should be visually self-identifying** — you should know whether you're looking at a document, event, or timeline item without reading a label.
- **Color should have meaning** — every color in the palette should serve a purpose (action, information, status, navigation). No decorative color noise.
- **Interactivity should be obvious** — if something is clickable (cards, tags, links), it should look clickable before the user hovers.
- **The dark theme isn't inherently wrong**, but it needs refinement. If keeping it, add more contrast layers and a more sophisticated accent palette. A light mode option would also expand accessibility.

---

## Raw Session Notes
- Replace dark-on-dark with more balanced palette
- Consider yellowish-green accent instead of turquoise/aqua
- One bright blue for all links, not multiple bright colors
- Define primary, secondary, and neutral/informational colors
- Sentence case for all nav and headers
- Add icons for each content type: documents, events, timeline, news
- Display icons on every card and in nav
- Document cards: reduce to title, summary, type, priority, date
- Event cards: distinct styling from docs, visual upcoming/past separation
- Timeline cards: distinct from both, prominent dates, priority legend
- All cards: hover states, clickable, consistent spacing
- Subscribe widget: smaller, subtler, lightbox option
- Submission form: clean, labeled, dropdown for type
- Consistent button styling site-wide
- More whitespace and breathing room
- Tags should look obviously clickable
- Responsive for mobile/tablet
- Overall: modern, trustworthy, not sterile
