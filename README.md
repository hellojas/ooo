# PROJECT OOO — jas fine tuning

Personal calendar + tracker for the sabbatical (Oct 5 – Dec 23, 2026).
Vite + React + TypeScript, installable as a PWA (Add to Home Screen on iPhone).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

- `CLAUDE.md` / `SPEC.md` — context, rules, and feature spec.
- `data/*.json` — the plan (source of truth for dates and programs).
- `docs/` — narrative plan, program research, curriculum, sources.
- `prototype/index.html` — the original single-file prototype (reference only).
- `src/` — the app. User data lives behind the `Storage` interface in
  `src/storage.ts` (localStorage today; swap in Firestore later without touching UI).

## What's built

- **Today**: day type (Full / Floor / Travel / Rest, inferred from trips and a never-miss-twice rule), tune-of-the-week hero,
  Now/Next bar, per-block checklists tied to the week (data/block-tasks.json), conflict warnings vs. fixed classes + travel,
  skip/restore per block, quick log (rough minutes, gym by feel, climb/run ticks, pull-up reps).
- **Calendar**: Week · Month · Agenda · Music · Fitness. Class states: considering / planned / registered (Configure).
- **Practice**: repertoire pipeline for the 10 standards (5 stages, takes + 3-point rubric, review-due after 7 days), transcription log.
- **Review**: three prompts, next week's standard, pre-set next week's day types, milestones; Log lives here too.
- **Resources**: coffee shops by neighborhood (from the Maps list) with nearby lunch spots; program links.
- **Jawn**: soft-locked personal tab (client-side password; content is in the bundle, so not truly secret).
- Hash routing (`#/today`, `#/calendar/week`, …), phone bottom bar, block-start reminders while the app is open,
  Drive deep links for course PDFs (data/drive-links.json), Firebase sync (optional), ICS export.

## Also built
Firebase Google sign-in + Firestore sync (`src/sync.ts`, `firestore.rules`) · ICS export of plan items ·
Taipei start-date setting (recomputes missed sessions) · weekly recording links ·
in-app reminders (30 min before sessions, 9pm practice nudge; only while the app is open).

## Deploy
```
npm run build
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,hosting
```
Console prerequisites: enable Google sign-in, create the Firestore database, add your hosting domain to
Authorized domains. Optional: build with `VITE_ALLOWED_EMAIL=you@gmail.com` to lock to one account.

## Not built
True background push on iPhone (needs Cloud Functions + FCM on the Blaze plan) — the in-app reminders
cover the app-open case for now.
