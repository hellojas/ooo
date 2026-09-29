# Project ooo — Jas fine tuning

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

Today (schedule, practice timers, notes) · Full sabbatical · Jazz (in person / online / plan) ·
Abs · Coffee shops · Weekly review + milestones · check-in sheet on every chip
(went / missed / skipped, climbing sends, runs, pull-up sets) · JSON export/import backup.

## Next

1. Deploy (GitHub Pages or Firebase Hosting) so it can be installed on the phone.
2. Firebase Auth + Firestore behind `Storage` for sync between laptop and phone.
3. Reminders: iOS supports Web Push for home-screen PWAs (iOS 16.4+), which needs a small
   push backend (Firebase Cloud Messaging + a scheduled function). Alternative: a native
   iOS app with local notifications if we outgrow the PWA.
4. ICS export of the plan items.
