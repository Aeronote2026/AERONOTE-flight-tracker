# AERONOTE – Project plan

## Goal
A professional, aviation-inspired flight tracker for EASA student pilots.
Version 1 is for one pilot (personal use). The design must allow other
student pilots, and later flight schools, to use it without a rewrite.

## Regulatory context
- Authority: EASA (Part-FCL), supervised in Spain by AESA.
- Target licences: PPL(A) and LAPL(A). Exact minimum-hour requirements will be
  added in Step 4 and checked against current EASA regulations.

## Roadmap
1. **Foundation** – project setup, aviation design, home screen. ✅
2. **Digital logbook** – add, edit, delete and list flights.
3. **Dashboard** – live totals (total, dual, solo, night, cross-country, landings).
4. **EASA licence progress** – progress bars against PPL(A)/LAPL(A) minimums.
5. **Accounts & polish** – secure sign-in, home-screen app, iPad testing.

## Scalability decisions
- Every flight record will belong to a user (`user_id`) from day one, so more
  pilots can be added later without changing existing data.
- A future "organisation" (flight school) layer can link students and
  instructors on top of this without rewriting the logbook.

## External services (need owner approval before setup)
- **Vercel** (hosting, free plan) – publishes the app at a web address.
- **Supabase** (database + sign-in, free plan) – stores flights safely online.
