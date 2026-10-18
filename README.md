# Gameplay Evidence Lab

A working, local-first research instrument for gameplay configurations, timestamped annotation, neutral feedback, append-only review, and validated dataset export. RPG-general; the shipped examples use a fictional RPG and are entirely synthetic.

Supports the proposed theme **Multimodal Learning of RPG System Interactions for Evidence-Based Game Design**. This prototype prepares evidence; it does not implement the relational predictor or establish scientific novelty, causal effects, institutional approval or industry participation.

## Run

Requires Node.js 24+ and npm. In this project folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. The production build is `npm run build`; preview it with `npm run preview` at http://127.0.0.1:4173/. Use an HTTP server, not a file:// URL. The static build uses relative asset paths and hash navigation for repository-subpath hosting.

## First personal gameplay pilot

Follow [docs/FIRST_PILOT.md](docs/FIRST_PILOT.md). The entire personal workflow works without an account or backend. Do not recruit other players from this prototype.

1. Select **Private local pilot**. The initial workspace is empty and separate from the synthetic demo.
2. Save a **Study protocol**, leaving recruitment disabled. Define one observable question and explicit measures.
3. Record a short clip using your own capture software. The app does not capture the screen, microphone or camera.
4. Add a **Session** with game/version, configuration, encounter, recording duration, source and information choices. Use `unknown` where needed.
5. **Annotate evidence**: choose the local clip, seek, use `[`, `]` or the mark buttons, then label one event.
6. Add neutral **Player feedback**, then **Researcher review**. A correction appends a version and preserves the original label.
7. **Dataset & exports**: inspect warnings, filter configuration summaries, and download JSON and ZIP. Exports always include the whole workspace.
8. Reimport the JSON to verify your backup. Local recordings must be reattached after reload. Delete local records separately from backups.

## Three data boundaries

| Mode | Storage | Meaning |
|---|---|---|
| Synthetic demo | Memory only; resets on reload | Fictional examples, never research findings |
| Private local pilot | This browser profile's localStorage | Real drafts, not central submissions; not encrypted or guaranteed permanent |
| Private collection | Separate authenticated private backend | Available only when configured and server-authorised; labelled centrally submitted after persistence |

No recording bytes are uploaded or persisted by the app. A local file is played through a temporary object URL. Evidence links are not automatically opened, embedded or scraped. No AI/analytics/tracking service is called. No participant contact/account fields are collected. The operational study contact is removed from exports by default. Free text and references may still identify people; review exports before sharing.

GitHub Pages is public static hosting, not a private database or authentication service. GitHub logs visitor IPs. Browser-profile access, hosting logs, downloaded backups and backend auth accounts are separate privacy boundaries. This app does not promise absolute anonymity. See [methodology](docs/METHODOLOGY.md) and [backend setup](docs/BACKEND.md).

## Checks

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover validation, integrity and origin-safe JSON round trips, CSV safety, grouping, cascade deletion, consent restrictions and actual PostgreSQL row policies in an isolated PGlite instance. Browser tests exercise the local workflow on desktop/mobile, no-upload behaviour, all routes, accessibility and keyboard navigation. A real Supabase instance is not implied by passing the isolated database tests.

The optional `npm run test:backend` command checks a deliberately configured disposable hosted backend. See its prerequisites before use. No configured backend means that check is explicitly skipped. Evidence and outstanding limits are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## GitHub Pages

The included `.github/workflows/pages.yml` validates, builds and browser-tests before deploying `dist/`. Enable **Settings → Pages → GitHub Actions** on the chosen repository. The default published build forces central collection off. Only source and synthetic examples belong in Git. Never commit real exports, videos, session tokens or private study records.

All routes are hash paths (`/#review`, `/<repository>/#annotate`), so direct navigation and reload work without server rewrites. Assets use `base: './'`. A deployment URL is only claimed after a successful deployment and a live check.

## Backend and research permissions

Supabase adapter, server function and SQL migration are included; no paid service is provisioned. Collection remains unavailable without configuration. Invited access, server-held study documents, size/rate limits, server-side validation and row policies are mandatory. Service/admin keys never belong in client environment variables or build output.

Public recruitment is disabled regardless of whether a demo is deployed. Institutionally appropriate review, study contact, consent, permitted processing, retention, deletion and access tests must be settled before collecting from other people.

## Structure

- `src/domain.ts`: strict schemas and relationship validation shared with backend.
- `src/main.ts`: static-compatible task views and local workflow.
- `src/exports.ts`: checked JSON, checksum manifest, related CSVs and dictionary.
- `src/demo.ts`: visibly synthetic examples.
- `src/backend.ts`: explicit authenticated private-collection adapter.
- `backend/validation.ts`: server collection gates.
- `supabase/`: RLS migration and authenticated Edge Function.
- `tests/`: domain, database policies, UI workflow, accessibility and optional hosted tests.
- `docs/`: visual contract, dictionary, pilot, methodology, backend and collaboration brief.

## Source and limits

No submitted application text or university template is incorporated into the public application. The sibling proposal pack is preserved. No publisher assets or engine telemetry are included. Human observational comparisons are not identical-state counterfactuals. Model suggestions require explicit processing permission and stay separate from reviewed labels. The custom feedback questions are not a validated psychological instrument.

Official implementation references, checked 18 October 2026:

- [GitHub Pages overview and provider logging](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase function authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase environment secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase pricing](https://supabase.com/pricing)
- [Zod validation](https://zod.dev/)
- [Local object URLs](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
