# Pilot university and backend direction

Recorded November 8, 2026.

**Superseded provider status:** The user subsequently approved the production migration. [The implementation decision](2026-11-08-production-implementation.md) selects Supabase PostgreSQL/Auth and records the initial domain/timezone defaults. The tentative discussion below is retained as history.

## Confirmed scope

- The first pilot is BRAC University (BRACU).
- Additional universities will be considered later. Only BRACU launches initially;
  university configuration and tenant boundaries must remain reusable.
- Keep `university_id` on university-scoped records and enforce it in application
  services and database access. Do not embed a BRACU-only assumption throughout
  business logic.

## Email domain and timezone

The proposed student domain is `g.bracu.ac.bd`. BRACU's official CSE student
evaluation form explicitly uses `name@g.bracu.ac.bd` as its student G-suite email
example: [BRACU CSE evaluation](https://cse.bracu.ac.bd/evaluation).

This is a source-backed configuration proposal, not a user-confirmed final signup
allowlist. Store allowed domains in university configuration and compare the
normalized email domain exactly. Staff domains must not automatically grant
student or administrator privileges. Admin accounts remain invite-only.

Use `Asia/Dhaka` as the proposed pilot timezone; confirm this with the remaining
pilot settings and expected launch cohort size.

## Provider preference, not a final selection

The user is considering Supabase. Record it as the preferred candidate for
PostgreSQL hosting; do not mark the provider decision complete or provision a
project yet.

Recommendation: pair Supabase PostgreSQL with Supabase Auth for the initial
production journey. Supabase Auth supports email/password and integrates with
Postgres Row Level Security. Next.js can use the supported server-side client
and cookie integration:

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Next.js server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework&router=app)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

If this pairing is selected, revise the existing Auth.js/custom-password schema
assumptions before implementing authentication. Supabase should own credentials,
verification tokens, and provider sessions; application profile/role records
should reference the provider identity. Do not build a second password system.
Keep student/admin route checks and university/owner database policies. ORM and
migration ownership still need a decision before schema implementation.

## Next implementation milestone

Scaffold the planned Next.js workspace, preserving the completed prototype as a
visual reference. The first production slice is signup → email verification →
onboarding → dashboard → a persistent personal deadline. Jobs and AI providers
can be selected when their features are implemented. Authoritative catalog and
personal enrollment sources remain unconfirmed; the public schedule CDN is not
an authenticated student enrollment integration.
