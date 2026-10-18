# Private collection setup and operational gate

Default: unavailable. No backend credentials or project were available during implementation. The static demonstration is usable without this setup. No paid resources have been created.

## Provider and cost

Supabase provides Postgres, authentication, row-level security and Edge Functions. The pricing page checked 18 October 2026 lists Free: 500 MB database, 5 GB egress, 1 GB file storage, 50,000 monthly active users and 500,000 function invocations; free projects may pause after a week of inactivity, with no automatic database backups included. Pro starts at USD 25/month; compute, usage and other charges may apply. We do not need video storage. Recheck https://supabase.com/pricing before provisioning and keep billing/limits under your control. Do not upgrade automatically.

## Security model

- Public static client contains only a project URL and public publishable key, never service/admin keys.
- Invited authenticated users only; disable public signup. This instrument does not invite people or recruit participants.
- Edge Function calls `auth.getUser(token)` to verify the user on every request. `verify_jwt=false` in config is used because verification is explicit in code, not because authentication is optional.
- Exact Origin allowlist, bounded JSON stream, strict shared schema, active researcher-held study document, membership, source/consent gates, no video route.
- Direct browser insert/update/delete rights are revoked. Row policies permit owner reads and authorised study-researcher reads; anonymous visitors cannot read records. Withdrawal hashes are not readable by browser roles.
- Service-only transaction functions enforce idempotent retries, atomic per-account submission limits (20/day even after withdrawal, 200 retained), review sequencing, researcher membership and owner/code withdrawal.
- Server-held expiry comes from study retention_days. Expired rows are hidden; configure a scheduled purge before activation. A private minimal receipt ledger (submission ID, owner ID and dates only) is retained until 30 days after the original research expiry to enforce retry/abuse limits and prevent withdrawn IDs being reused; it contains no research payload or withdrawal secret. Provider auth records/logs/backups have their own retention and must be included in the operational policy.
- Rate limiting and invited accounts reduce abuse but are not a complete internet-scale abuse programme. Monitor account creation, project quotas and errors; no participant payload logging. There is no server-side video storage.

## Set up in a private/disposable project first

1. Create/select a suitable Supabase project. Choose region and privacy arrangements with the institution when relevant. Nothing in this README establishes ethics approval.
2. Apply `supabase/migrations/202610180001_private_evidence.sql` with the Supabase CLI or reviewed SQL editor. Deploy `evidence-api` from this repository root so relative imports of `src/domain.ts` and `backend/validation.ts` are bundled. The function's deno.json pins its SDK/Zod dependencies.
3. Set server secret `ALLOWED_ORIGINS` to the exact Pages origin (e.g. `https://your-account.github.io`) and any explicitly permitted local development origin. Paths are not Origins. Keep SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY only in the server environment; Supabase normally supplies them. Do not put them in VITE_* settings or shell history containing their literal values.
4. Disable public signups. Provision accounts through the operator's existing invitation/identity process only when authorised. This build neither sends invitations nor stores contact information in research records.
5. Download `public/study-template.json`. In a private copy, set a unique stable id, versions, actual contact, accurate information/permissions/retention/deletion, createdAt and `reviewStatus: researcher-configured`. That marker is an operational declaration, not an approval certificate. Validate against studySchema. Keep `publicRecruitment: false`.
6. Insert that exact JSON as `evidence_studies.document`, with matching `id`, `active: false`, and an appropriate retention_days value. Add study/user memberships as participant or researcher. No client can edit these tables.
7. Schedule a daily private call to `public.evidence_purge_expired()` using the platform's scheduler/pg_cron, verify it, and document auth/log/backup retention and withdrawal response handling.
8. Configure private test accounts A, B and researcher R. Run access-control tests below against disposable records. Inspect function errors/quotas without recording payloads.
9. Only after the study's review/permissions and operating arrangements are settled, activate the server study for a bounded invited technical pilot. Public recruitment remains disabled.
10. Create an ignored `.env.local` from `.env.example`, setting only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_COLLECTION_ENABLED=true`. The default Pages workflow deliberately forces collection off. Do not enable it through publication alone.

The prototype's connection form accepts an authenticated-user access token obtained from the operator-managed Supabase sign-in/session flow, kept only in memory. It rejects service/admin role tokens. This is suitable for an invited technical demonstration, not a finished participant identity experience. Before a participant study, replace manual token handling with an approved institutional sign-in flow and perform a full security/ethics review. No passwords are entered into this Pages app.

Import the researcher-issued study JSON through **Study protocol → Import study configuration** in the local workspace. Create sessions under that study. The server rejects a modified study document, wrong information version, synthetic records, researcher reviews or machine suggestions in a participant submission. A restored analysis export has blank study contact; restore the exact issued contact before submission.

Submission is a two-step explicit action: prepare/download a random receipt, then submit. Success appears only after a matching server persistence receipt. Keep the submission and withdrawal code private. Retrying an unchanged request reuses the submission ID; changed content needs a new ID. Local drafts remain separate from the central copy.

## Verification and limits

`npm test` executes the real SQL migration in isolated PostgreSQL/PGlite. It checks anonymous denial, cross-user reads, write rejection, researcher reads, researcher-only review, version conflicts, idempotency and owner/code withdrawal. This is not a test of a deployed Supabase Auth/HTTP/CORS system.

`npm run test:backend` requires a deliberately configured disposable project and the environment variables listed in `tests/backend.integration.ts`. The suite skips explicitly when not configured. It submits a disposable test-labelled payload, checks persistence, retry, invalid auth, cross-user isolation and withdrawal, and should only run where those synthetic infrastructure tests are authorised. Do not use real participant records for security testing.

Before deployment with collection enabled also test: forged/expired tokens, disallowed Origin, oversized body, wrong consent/study, concurrent retries, rate limits, researcher allowlist removal, session expiry, scheduled deletion, backup restoration, withdrawal with missing receipt, and provider logging. These are operational acceptance requirements, not claims that deployment was completed here.

Only the newest 50 authorised submissions are loaded by the prototype's central list. It is a bounded demonstration, not a complete institutional data-management platform. Add reviewed pagination and audited operator tooling before larger collection.
