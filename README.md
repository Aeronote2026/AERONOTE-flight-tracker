# AERONOTE · Student Pilot Flight Tracker

A personal flight logbook and training tracker for **EASA student pilots**
(Part-FCL, PPL(A) / LAPL(A)), starting with training in Spain under AESA.

> AERONOTE is a personal training aid. Your official logbook remains the legal
> record of your flight time.

## Technology

| Part            | Tool                          |
| --------------- | ----------------------------- |
| App framework   | Next.js (App Router) + TypeScript |
| Styling         | Tailwind CSS                  |
| Database & auth | Supabase (email + password sign-in) |
| Hosting         | Vercel                            |

## Folder structure

```
src/
  app/          Screens (pages). One folder per page.
  components/   Reusable building blocks (cards, logo, buttons…)
  lib/          Calculations and database connection (later steps)
  types/        Data definitions, e.g. what a "flight" is (later steps)
docs/           Plain-English project notes and decisions
```

## Running it on a computer (developers only)

```bash
npm install
npm run dev      # open http://localhost:3000
npm run build    # production build check
npm run lint     # code quality check
npm test         # automatic tests (HH:MM duration rules)
```

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the roadmap.
