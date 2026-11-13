# BRACU Google Workspace authentication

Student login and signup now use Google OAuth through Supabase, restricted to
`@g.bracu.ac.bd` with Google's verified hosted-domain claim `g.bracu.ac.bd`.
Administrators keep their separate invited-account password login.

Google authenticates a FRIDAY account. Its tokens do not authorize BRACU Connect
requests: Connect has its own SSO session and access tokens. The browser extension
still needs the student to sign into `https://connect.bracu.ac.bd` separately.
See [Google's OpenID Connect documentation](https://developers.google.com/identity/openid-connect/openid-connect)
and [Supabase's Google provider guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Hosted setup

1. Configure the Supabase project URL, publishable key and exact `APP_URL` in
   `apps/web/.env.local` using `.env.example`. `APP_URL` must match the browser's
   origin, including scheme, hostname and port. Use `http://127.0.0.1:3000` locally
   by default; mixing localhost and 127.0.0.1 breaks PKCE cookies and extension transfers.
2. Apply every versioned migration in order, including
   `202611120002_google_workspace_auth.sql` and
   `202611120003_connect_data_archive.sql`. `npm run db:prepare` stages them for
   the Supabase CLI but does not apply them remotely.
   For a fresh project, it also generates one SQL Editor script; follow
   [the first-install instructions](supabase-first-setup.md).
3. In Google Cloud, create a Web application OAuth client for your project and
   configure its consent screen. Add the callback URI displayed by Supabase's
   Google provider panel, usually `https://<project-ref>.supabase.co/auth/v1/callback`,
   as the authorized Google redirect URI. For a consent app in Testing mode,
   include the intended BRACU student test accounts. Workspace administrators may
   also need to allow your OAuth app under university policy.
4. Enable Google under Supabase Authentication providers and enter the client ID
   and secret there. Do not place the secret in browser code or a `NEXT_PUBLIC_`
   variable. Do not enable skipping nonce checks or accepting unverified email.
5. Configure the Supabase Site URL as `APP_URL` and allow the app's
   `${APP_URL}/auth/callback` destination, including the `flow` and `next` query
   parameters used by this app. Supabase's callback to FRIDAY is different from
   Google's callback to Supabase. Keep production redirect patterns narrow.
6. Start FRIDAY, choose **Continue with Google**, select an eligible student
   account, and import private Connect records or complete the academic profile.
   If the catalog is not configured yet, onboarding links directly to the Connect
   import pages. Student ID, program and semester remain required for academic features.

For local Supabase, provider settings are prepared under `[auth.external.google]`
in `supabase/config.toml`, disabled until credentials are configured. Set
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, enable the provider, and register the
local Supabase Auth callback with Google. These are CLI/provider settings, not
Next.js public environment variables.

## Enforcement

- The OAuth start action requests only `openid email profile` and uses the domain
  hint plus account selection. It sanitizes `next` to the student portal.
- The hint alone is not authorization. The callback asks Supabase Auth for the
  authenticated user, requires a confirmed exact-domain email, and validates the
  Google identity's matching email, `email_verified: true`, and
  `identity_data.custom_claims.hd`. It rejects inactive/admin accounts in this flow.
- Provider-owned `auth.identities` supplies these claims. Editable user metadata
  cannot grant eligibility. PostgreSQL's tenant helper enforces the same check
  for every student RLS query, including requests that bypass the UI.
- Supabase verifies the Google token and exposes its Workspace claim under
  `custom_claims.hd`; this integration fails closed if the deployed Auth version
  does not provide that claim. Never replace it with a user-editable field.
- Existing email-only student accounts retain their data but need a valid linked
  Google Workspace identity before access is restored. Supabase must be configured
  for the intended verified-email identity linking behavior; test an existing
  account before rollout.
- Google does not supply the university's separate student ID. The profile allows
  a missing ID only until onboarding; no placeholder ID is invented.
- Student password login/signup is rejected by the application. Staff accounts
  remain invite-only and keep their existing administrative login.

For the hosted domain requirement, see [Google's claim validation requirements](https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken).

## Acceptance

Test a real eligible account, a personal Gmail account, a staff domain, an
existing student account, cancellation, logout, role separation and onboarding.
Then open Connect separately and use the extension to review/import personal
records. Local tests mock OAuth responses and do not prove university OAuth
approval or hosted account persistence. Supabase's client URL and public publishable key
are now active in ignored `apps/web/.env.local` and were accepted by the live Auth
API on November 14. Google has since been enabled, and a cancelled test flow
confirmed both the Supabase provider callback and FRIDAY's app callback. The
hosted schema's 21 expected tables are now available and deny anonymous access.
Real student acceptance and administrative policy/history inspection remain pending.
