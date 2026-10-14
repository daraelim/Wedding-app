# RSVP v2 — review checklist (not deployed)

This PR adds a detailed RSVP form, two origin-specific shuttle questions, and a four-digit PIN for edits through **2026-11-06 23:59:59 Asia/Seoul**. Both new submissions and edits close at that deadline.

## Important: Preview vs working RSVP

The Vercel PR preview displays the new form. **Submitting / loading / editing RSVPs will not work until the following server-side steps are approved and completed.** Do not run the migration or deploy the Edge Function without explicit approval. No production data has been changed by this PR.

## Required rollout order (after approval)

1. Take a Supabase database backup.
2. Run `supabase/migrations/20261014_rsvp_edit_shuttles.sql` in the Supabase SQL Editor.
3. Configure secret environment variables for the new Supabase Edge Function:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server only; never Vite variables)
   - `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile private secret)
   - `RSVP_PIN_PEPPER` (long random secret, keep stable so old PINs continue working)
4. Deploy `supabase/functions/rsvp-v2/index.ts` as the `rsvp-v2` Edge Function. Set appropriate authentication/JWT settings for anonymous RSVP requests with the project's anon key.
5. Test new RSVP, returning guest lookup, edit, wrong PIN, five wrong attempts, two routes, and the cutoff behavior in a safe test environment.
6. After confirmation, merge PR #7 and deploy production.

## Migration and data notes

- Existing RSVPs have no PIN and **cannot be edited via the new self-service form**. Handle those manually, or run a separately approved migration/onboarding process.
- Four-digit PINs are inherently limited-entropy credentials. The Edge Function uses HMAC with a server-only pepper and enforces five attempts per name per hour. Keep the endpoint under Turnstile protection and check rate-limit logs; if higher assurance is needed, use per-guest private links or stronger login.
- Same-name guests must choose different PINs. Do not disclose a PIN to another guest.
- A route's `왕복` option counts the same passengers on both legs; `서울행 편도` only on the outbound leg, `귀가 편도` only on the return leg. Each leg's sum of the two departure cities cannot exceed total guests.
- The database columns are leg counts, not direction labels. The admin view and CSV expose each leg separately.
- After the SQL migration, only trusted server code should create or edit guest submissions. The original `submit-rsvp` endpoint, if deployed, should be reviewed and disabled separately so it cannot bypass the new close date.

## Functionality before deployment

The PR preview can be used to review typography, fields, buttons, and toggles. Data submission/edit tests require the Edge Function + schema to be staged in a non-production Supabase environment first.
