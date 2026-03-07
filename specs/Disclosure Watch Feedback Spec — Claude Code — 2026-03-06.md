# Product Feedback Spec: Disclosure Watch
**Date:** March 6, 2026
**Scope:** Full site review — structure, functionality, data sourcing, interaction patterns
**Reviewer:** User feedback session (voice, via mobile)
**Output:** Claude Code (functionality changes only — visual/design changes in separate v0 spec)

---

## Context
Disclosure Watch is a site that tracks UAP/UFO disclosure activity — government document releases, congressional hearings, events, and related news. The site currently uses a documents-as-homepage layout with card-based browsing, filters, a disclosure timeline, and an about page. The core feedback is that the site needs to evolve from a document browser into an intelligence dashboard that tells users "what happened this week" at a glance, with better content depth, smarter navigation, and a user submission pipeline.

---

## Changes

### Critical (fix these first)

#### Replace homepage with intelligence dashboard
- **What's wrong:** The homepage currently shows documents directly, which works as a document browser but doesn't give users a quick sense of what's happening in the disclosure space this week.
- **What it should be:** A dedicated intelligence dashboard with four components:
  1. **Weekly Intelligence Summary** — Aggregate stats ("35 new documents released this week," "8 congressional hearings scheduled") plus a brief AI-generated summary of major themes, revelations, or patterns from the latest releases.
  2. **Latest Documents Feed** — Excerpts from the three most recent document releases with AI summaries expanded to ~320 characters. Each clickable to open a lightbox or interior page with longer summary, key points, and source link.
  3. **Related News Feed** — News articles related to UAP, UFO, alien disclosure, and Trump administration announcements about file releases, integrated into the "what you need to know this week" narrative.
  4. **Upcoming Events Highlight** — Two or three upcoming hearings or events with brief descriptions.
- **Why it matters:** Users come to the site to understand what's happening, not just browse files. A dashboard-first approach answers "what do I need to know?" immediately.
- **Where:** Homepage / index page

#### Relocate and redesign the email signup widget
- **What's wrong:** The "stay in the loop" email signup is currently full-width and takes up too much visual real estate on the homepage.
- **What it should be:** A smaller, subtler position — either top right corner or bottom of the page. Consider a button that opens a lightbox rather than inline full-width placement.
- **Why it matters:** The signup shouldn't compete with the primary content for attention.
- **Where:** Homepage subscribe widget

#### Make document cards clickable to expanded view
- **What's wrong:** Document cards show metadata but don't have a clear interaction pattern for seeing more detail.
- **What it should be:** Entire cards should be clickable, opening a lightbox or interior page that displays: longer AI summary (320–400 characters), key points/takeaways, all associated tags and categories, and a "View Source" link.
- **Why it matters:** Users need more context than a two-sentence summary before deciding whether to click through to the source.
- **Where:** Documents page cards → lightbox/interior page

#### Implement clickable tags and cross-content search
- **What's wrong:** Tags and categories exist on content but aren't interactive.
- **What it should be:** All tags (e.g., "Trump," "congressional defense committees," "deadline," "news") should be clickable links that search across all content types — documents, events, and timeline items. Results should display with visual indicators (icons or labels) showing whether each result is a document, event, or timeline item.
- **Why it matters:** Cross-referencing content by tag is the core way users will discover connections between documents, hearings, and timeline events.
- **Where:** Tags on document cards, event cards, timeline items, and interior/lightbox views

### Important (fix these next)

#### Update navigation labels to sentence case
- **What's wrong:** Nav labels use inconsistent or title case formatting.
- **What it should be:** Sentence case throughout: "Documents," "Hearings and events," "Disclosure timeline," "About." Remove any duplicate "Documents" nav item.
- **Why it matters:** Consistency and readability.
- **Where:** Main navigation bar

#### Reduce metadata clutter on document cards
- **What's wrong:** Document cards display too much metadata, making them hard to scan.
- **What it should be:** Show only: title, brief summary (two sentences max), content type tag, priority level indicator, and date.
- **Why it matters:** Cleaner cards help users scan and find what they need faster.
- **Where:** Documents page card components

#### Expand hearings and events page
- **What's wrong:** Event descriptions are too short (two sentences), and the page lacks visual distinction from the documents page.
- **What it should be:**
  - Expand description length to ~320 characters for meaningful context without clicking through.
  - Add visual distinction from document cards (different styling, icons, or color treatments).
  - Display both upcoming and past events with clear visual separation (not just a small dot).
  - Make entire cards clickable to external source (opens in new tab).
  - Add a calendar view toggle or split-screen option (list vs. calendar layout).
  - Limit initial display to ten items with a "Load More" button.
- **Why it matters:** Events are a distinct content type and should feel different from documents. Users need enough context to decide whether to click through to external sources.
- **Where:** Hearings and Events page

#### Add "Load More" pagination across long pages
- **What's wrong:** Pages with growing content (timeline, documents, events) could become very long.
- **What it should be:** Implement "Load More" buttons or pagination: 10 items on events page, 15–20 items on timeline page before showing the button.
- **Why it matters:** Prevents slow page loads and overwhelming scroll depth.
- **Where:** Disclosure Timeline page, Documents page, Hearings and Events page

#### Clarify priority level indicators on timeline
- **What's wrong:** Priority color codes (red = critical, blue = major, etc.) are displayed but not explained.
- **What it should be:** Document what each priority level means and who/what assigns the ratings (government source, AI logic, editorial judgment). Display this as a legend or tooltip accessible from the timeline page. Example: "Critical: Government officially released" vs. "Major: Congressional hearing scheduled."
- **Why it matters:** Users need to trust the rating system and understand what it means.
- **Where:** Disclosure Timeline page

### Nice to Have (when there's time)

#### Build a user submission form
- **What's wrong:** No way for users to submit documents, hearings, or events that may have been missed.
- **What it should be:** A submission form accessible from the About page, bottom of Documents page, and bottom of Hearings and Events page. Fields: submission type (missed document / hearing / event), title, link or description, date, additional context. Backend review workflow where submissions are flagged for human review before publishing. User-submitted content should be marked with a distinct tag or label.
- **Why it matters:** Community contributions expand coverage beyond what automated sourcing catches.
- **Where:** About page, Documents page (bottom), Hearings and Events page (bottom)

#### Document and expand data sources
- **What's wrong:** Current sources (Arrow.mil, National Archives, etc.) aren't documented publicly, and there may be additional government sources for UAP-related releases.
- **What it should be:** A documented list of all current sources, plus identification of additional official sources. This could live on the About page or a dedicated "Sources" section.
- **Why it matters:** Transparency about sourcing builds user trust.
- **Where:** About page or new Sources section

#### Consider adding a user timeline submission form
- **What's wrong:** The timeline may be missing historical events that users know about.
- **What it should be:** A simple form at the bottom of the Disclosure Timeline page for submitting missed timeline items.
- **Why it matters:** Crowdsourced additions strengthen the timeline's completeness.
- **Where:** Disclosure Timeline page (bottom)

#### Update About page
- **What's wrong:** Minor issues — missing resources, outdated contribution info.
- **What it should be:** Add MUFON to the list of related resources. Replace GitHub issue submission link with a simple contact form. Update "Wanna help curate content?" section to reflect current capacity — either remove or clarify what help looks like.
- **Why it matters:** Keeps the About page current and useful.
- **Where:** About page

#### Define email digest automation logic
- **What's wrong:** Unclear whether the weekly email digest is automated or manually curated.
- **What it should be:** Confirm automation capability. If automated, define the selection logic for top stories (e.g., highest priority items from the week, most viewed, AI-selected themes). If manual, define the curation workflow.
- **Why it matters:** Consistent email delivery keeps users engaged.
- **Where:** Backend / email system

---

## Design Notes
The overarching direction is shifting from "document archive" to "intelligence dashboard." Users want to come to the site and immediately understand what happened this week in disclosure, not browse through individual documents. The content depth needs to increase — summaries should be 320+ characters instead of two sentences — so users get real context at every level without having to click through to source material.

Tags and categories should function as a connective tissue across the entire site, letting users follow threads (like "Trump administration" or "congressional defense committees") across documents, hearings, and timeline events.

The site has distinct content types (documents, events, timeline items) that currently look too similar. Each should have its own visual treatment while maintaining a cohesive design system.

User submissions and transparent sourcing were emphasized as trust-building features that should be prioritized after the core dashboard and content depth improvements.

---

## Raw Session Notes
- Homepage should be an intelligence dashboard, not a document list
- Weekly summary with aggregate stats and AI-generated themes
- Latest documents feed with expanded summaries (~320 chars)
- Related news feed integrated into the weekly narrative
- Upcoming events highlight (2–3 items)
- Email signup should be smaller/subtler — button + lightbox instead of full-width
- Nav labels to sentence case; remove duplicate "Documents" item
- Document cards: reduce metadata, show only title/summary/type/priority/date
- Cards should be clickable to lightbox/interior with expanded summary + key points
- All tags should be clickable and search across all content types
- Events page: longer descriptions, visual distinction from docs, calendar toggle, load more
- Timeline: keep layout, clarify priority colors, add legend, load more after 15–20
- User submission form on About, Documents, Events pages
- Document all data sources publicly
- Add MUFON to About page resources
- Replace GitHub link with contact form
- Clarify or remove "help curate" section
- Define email digest automation vs. manual curation
