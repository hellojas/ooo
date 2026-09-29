# Sabbatical app — context for Claude Code

Read this first, then `SPEC.md`, then skim `docs/`. The `data/` folder is the
source of truth for every date and program; `prototype/index.html` is a working
single-file version of the UI that the app should replace.

## Who this is for

Jas — software engineer, Brooklyn (505 Union Ave, Williamsburg). On sabbatical
from work **Oct 5 – Dec 23, 2026**. Comfortable with React, Firebase, TypeScript;
this is a personal tool, single user, no need for multi-tenant anything.

## What the sabbatical is

Piano is the main job (3–4 hrs/day: jazz standards, voicings, chord-tone
soloing, ear training via transcription, solo-piano arrangement). Around it:
climbing at Vital BK/LES (3× a week minimum, up to 4), a fixed Tuesday run +
optional Sunday run at McCarren, pull-up progression, badminton every other
Saturday at Kotofit LIC, daily 15–30 min sax, and coffee-shop reading on
Tuesday and Friday mornings. Full narrative in `docs/plan.md`.

## What the app is

A personal calendar + tracker for the 10 weeks. Four top-level views:

1. **Full sabbatical** — everything on one month grid, filters grouped as
   Music (online / in person), Abs, Read, Travel.
2. **Jazz** — sub-views: In person (all optional classes), Online (Open Studio
   curriculum), Suggested plan (the chosen stack + weekly template).
3. **Abs** — climbing, pull-up and C25K phases as week bars + session chips,
   with the program tables.
4. **Coffee shops** — checklist of specialty shops to read at / visit.

Plus what the prototype does *not* have and the app should: logging what
actually happened (practice minutes, sessions attended, climbing sends, runs,
pull-up maxes, shops visited), so the calendar becomes a record, not just a
plan. See `SPEC.md`.

## Key facts the code must respect

- Week 1 = Sun Oct 4 – Sat Oct 10. Weeks are Sunday-start. Week 10 = Dec 6–12,
  week 11 = Dec 13–19 buffer.
- Trips: Sep 28 – Oct 8 (SF/Toronto, fixed), Oct 24–26 (cabin, fixed),
  Nov 7–9 (CoRL, optional), Dec 16–28 (Taipei, flexible). In-person sessions
  on trip days are "missed"; life items on trip days are simply not shown.
- In-person program dates in `data/programs.json` are explicit lists scraped
  from each school's page on 2026-09-29. Dates marked in `uncertain` are
  holiday weeks where the school hasn't confirmed the class runs.
- `plan: true` marks the suggested jazz stack. `drop: true` = flex/drop-in
  (no cost to missing). `kind` ∈ inperson | abs | read.
- Online courses and training phases are week ranges (`wk: [start, end]`),
  not dates. `online-curriculum.json.dayByDay` is the per-day video + PDF
  schedule; render those as chips only in the Jazz → Online view.
- Panel order on every view: calendar first, then "Where things are", then
  any tables/templates.
- Travel-from-home strings are rough subway estimates from 505 Union Ave; treat
  as copy, not data.

## Conventions

- Keep the prototype's information design: chips for dated sessions, dashed
  bars for online weeks, solid bars for training phases, hatched shading for
  tentative trips, strike-through for missed sessions.
- Everything on the calendar links to its program page.
- Mobile: the month grid collapses to a per-day list that hides empty days.
- Dark mode via `prefers-color-scheme` with an explicit override.
- Don't invent program dates. If something needs to change, change the JSON.
