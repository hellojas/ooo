# Spec — sabbatical calendar + tracker

## Stack (suggested, not mandated)

Vite + React + TypeScript. Persistence: Firebase Auth (Google sign-in, single
allow-listed account) + Firestore. If that feels heavy for a personal tool,
start local-first (IndexedDB via Dexie or plain localStorage) with a clear
`storage` interface so Firestore can replace it later. Deploy to Firebase
Hosting or GitHub Pages. Tailwind is fine; keep the prototype's tokens
(`prototype/index.html` `:root` block) as the palette.

## Data

Static plan data ships with the app from `data/*.json` (import at build time).
User data (logs, check-ins, settings) is persisted.

### Static
- `programs.json` — dated items. Fields: id, kind, name, short, time, dates[],
  url, loc, go, plan?, planOpt?, drop?, uncertain?[].
- `online-curriculum.json` — Open Studio courses with week ranges + `skip` list.
- `training-phases.json` — climbing / pull-up / C25K phases (week ranges) and
  the program tables.
- `trips.json` — travel windows.
- `coffee-shops.json` — two lists.

### User (persisted)
```
settings: { travelOverrides, hiddenItems[], taipeiStart?: date }
attendance: { [programId+date]: "went" | "missed" | "skipped" }
practice: { [date]: { sax: min, piano1: min, piano2: min, transcribe: min,
             arrange: min, notes, standardOfWeek, songTranscribed } }
climbing: { [date]: { gym: "BK"|"LES", sessionType: "volume"|"limit",
             sends: [{grade, style}], fingerFeel: 1-5, notes } }
running: { [date]: { minutes, c25kWeek, felt } }
pullups: { [date]: { sets: [{reps, weightLb}], maxTest?: reps } }
coffee: { [shopId]: { visited: bool, date?, rating?, note? } }
weekly: { [weekNo]: { recordedStandard: bool, recordedArrangement: bool,
           review: text } }
```

## Views

### 1. Full sabbatical
Month grids Oct / Nov / Dec, Sunday-start, with week bars (online curriculum,
dashed) above each week and day chips. Filter groups with master toggles:
Music · online, Music · in person (plan items only), Abs, Read, Travel
(toggles trip shading + strike-through). Below the grid: the full weekly
template and notes (copy in `prototype/index.html` → `renderPlan('full')`).

### 2. Jazz
Segmented control: In person | Online | Suggested plan.
- In person: all 15 optional classes as chips; a "Where things are" table
  (name link, when, address, travel from home).
- Online: curriculum bars + per-day video/PDF chips on the calendar (from
  `dayByDay`) + course table + day-by-day table. Course names link to
  https://app.openstudiojazz.com/courses.
- Suggested plan: plan items + online bars + weekly template + "N of M
  sessions attendable" counts (computed: sessions in Oct 5–Dec 23 minus trip
  days).

### 3. Abs
Solid phase bars (climb / pull-up / C25K) + session chips. Program tables and
the C25K week-by-week table. Training weekly template.

### 4. Coffee shops
Two card lists (Read here / Check out) with visited checkbox, rating, note.

## Tracking (new vs prototype)

- **Tap a chip → check-in sheet**: went / missed / skipped, plus the
  kind-specific fields above (sends + finger feel for climbing, minutes for
  runs, sets for pull-ups). Attended chips get a filled dot; missed ones dim.
- **Today view** (default on mobile): the day's items in time order, the
  practice-block timer (sax 30 / piano 120 / piano 90), and quick-log buttons.
  Practice minutes accumulate per block.
- **Weekly review** (Sundays): a form with the week's targets — standard
  memorized? arrangement recorded? pull-up max if test week, C25K week done,
  climbing sessions count vs the 3–5 range — and a free-text review. Store
  under `weekly[weekNo]`.
- **Progress strip** at the top of Jazz / Abs: weeks elapsed, standards
  memorized (count of weeks with recordedStandard), songs transcribed, climbs
  this week vs floor/ceiling, pull-up max trend, C25K week reached.
- **Milestones** from `docs/plan.md` (week 3 / 6 / 10) rendered as a checklist.

## Behaviors to keep from the prototype
- Missed = in-person item on a travel day (unless the trip is toggled off).
- Life items (abs, read) on travel days are hidden, not struck.
- `uncertain` dates render with a dashed left border and a "confirm" tag.
- `drop` items render with a "flex" tag.
- Every chip and bar is an external link to the program page (open in new tab).
- Trip names appear on the first day of the trip and on the 1st of a month.

## Nice-to-have
- Google Calendar export (ICS) of the chosen plan items.
- Taipei start date as a setting; recompute missed sessions.
- Import of a Kotofit/NYJW confirmation into `uncertain` resolution (manual
  toggle is fine).
- Practice recordings: store a link (Drive/Voice Memos URL) per week, not the
  audio.

## Out of scope
Multi-user, sharing, auth beyond one account, editing the static program data
in-app (edit JSON and redeploy).
