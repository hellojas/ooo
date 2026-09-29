# sabbatical-app

Personal calendar + tracker for a 10-week sabbatical (Oct 5 – Dec 23, 2026).

- `CLAUDE.md` — start here: who, what, and the rules the code must respect.
- `SPEC.md` — features, data model, views.
- `data/` — the plan as JSON (programs, online curriculum, training phases,
  trips, coffee shops). Source of truth.
- `docs/` — the narrative plan, program research, curriculum, sources.
- `prototype/index.html` — working single-file prototype (open in a browser).
  Everything in `data/` was extracted from it; the app replaces it.

Suggested first prompt for Claude Code:

> Read CLAUDE.md and SPEC.md. Scaffold a Vite + React + TypeScript app that
> loads data/*.json, reproduces the four views in prototype/index.html, then
> adds the check-in sheet and Today view from SPEC.md with local-first
> persistence behind a storage interface. Keep the prototype's palette and
> chip/bar language.
