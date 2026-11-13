# First FRIDAY schema setup

Google is enabled on the supplied Supabase project. The publishable key and app
callback routing have been verified. After initial setup, all 21 expected tables
are available through the Data API and reject anonymous access. The instructions
below are for a fresh installation; the current project does not need this script
run again. Administrative policy/history inspection and real student acceptance
remain pending.

The publishable key cannot install database objects. Use the project's SQL Editor
with its existing administrative session for the following one-time setup.

1. Run `npm run db:prepare` to generate `supabase/setup-friday.sql` from all six
   canonical migrations.
2. Open the project's [SQL Editor](https://supabase.com/dashboard/project/dfciqixacqwszllfcbvg/sql/new).
3. Paste the complete generated script and run it as the project database owner.
4. The final result should show `friday_tables = 21`,
   `all_tables_have_rls = true`, and `bracu_tenants = 1`.

The generated script runs in one transaction. It first refuses to proceed if any
FRIDAY table already exists; it does not drop or overwrite existing app tables.
If that check stops installation, inspect the project's actual schema and applied
migrations instead of forcing the fresh-install script through. API visibility
alone cannot prove that an installation is absent.

The script installs the existing schema, owner/tenant RLS, trusted Google identity
checks, Connect imports, and one BRACU tenant. It creates private profiles for
existing BRACU student Auth accounts that signed in before the creation trigger
was installed. Those profiles still require a verified Google Workspace identity
for data access. User-editable metadata cannot assign roles, and no administrator
account or password is created. Student IDs remain empty until onboarding.

Sample programs, semesters, courses, sections and grades are excluded. Configure
verified programs and semesters through a provisioned administrator before
students complete academic onboarding. Verified students can already use private
imports at `/app/connect` and `/app/schedule`; other academic pages and actions
still require onboarding. Existing staff/admin provisioning follows
the trusted setup described in the root README.

The SQL Editor path does not record Supabase CLI migration history. Before using
`supabase db push` on this installation later, inspect and baseline the migration
history against the installed schema. Do not blindly rerun all migration files.

Tests execute the generated script in PostgreSQL-compatible PGlite with Supabase
Auth fixtures and legacy automatic grants. They check installation, RLS, Google
eligibility, backfill, denied SELECT/TRUNCATE privileges, and safe refusal to rerun.
These tests do not replace the user's hosted execution and real account test.
