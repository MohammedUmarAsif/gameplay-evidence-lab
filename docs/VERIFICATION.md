# Verification evidence

Initial verification on 18 October 2026; field-journal and analysis upgrade checked on 22 October 2026. These are software/instrument checks, not gameplay findings or evidence of PhD novelty. Earlier dated deployment/check records below are retained as history.

## Scope preservation

Read the build prompt and current AGENTS, CURRENT_DIRECTION, START_HERE, ISE2_RESEARCH_TEXT, METHOD_AND_DEFENCE and LITERATURE_MATRIX before implementation. Created a separate sibling project with its own Git repository. A baseline comparison of all 36 files at the application-pack root found **zero changes**.

The initial 18 October working `ISE_2_Mohammed_Umar_Sayed.docx` SHA-256 was preserved during that build:

`0DDCA4B0C3DF8256953703498B3C3AB3656E6A586ABC3091CA0D5D15CF268A51`

No application document was edited, copied into the public frontend, or submitted. No person was contacted and no participant recruitment or paid provisioning was enabled.

## Completed checks

| Check | Observed result |
|---|---|
| `npm run check` | TypeScript passed |
| `npm test` | 38 tests passed on 22 October |
| `npm run build` | Static production build passed |
| `npm run test:e2e` | 26 tests passed across desktop and mobile Chromium projects on 22 October |
| `npm run test:backend` | Explicitly skipped: no disposable hosted backend/test accounts configured |
| Deno check of evidence-api with its pinned import map | Passed |
| `npm audit --omit=dev` | Zero reported production dependency vulnerabilities at check time |
| Build-output scan for service-role/secret-key/private-key patterns | No matches in generated dist |
| Proposal root-file hash comparison | 36 files checked; zero changes |

The build emits upstream Primer `@custom-media` warnings. The app's responsive rules use standard media queries; all tested layouts/workflows pass. No claim is made that every upstream CSS feature is supported by every browser.

## Browser evidence

Desktop viewport: 1440×1000. Mobile: iPhone-13-sized Chromium emulation, 390×664 CSS viewport as supplied by Playwright's device preset. Additional width checks at 320px. This is not a real iOS/Safari device test.

- Created an empty private-local study and session, requiring active adult/information choices; optional permissions remained unchecked.
- Rejected an invalid event interval; accepted a valid interval.
- Recorded neutral feedback with unanswered ratings preserved as null.
- Appended a review and retained the original label.
- Exported/reimported JSON with relationships and checksum validated; reloaded local drafts.
- Deleted a session and confirmed linked events/feedback/reviews disappeared.
- Rejected importing synthetic data into the real-local workspace.
- Filtered synthetic summaries by configuration, including missing feedback and explicit denominators. Whole-workspace export is clearly labelled.
- Chose and played a generated disposable synthetic video; mark controls worked; no upload or external request occurred.
- Confirmed central submission is disabled when unconfigured.
- Checked all ten routes with axe WCAG 2 A/AA and 2.1 AA rules on both desktop and mobile; zero detected violations after fixes. Automated scanning is not a complete accessibility certification.
- Verified keyboard skip link/focus and hash direct navigation.
- Served the real build under `/test-repository/`; assets, direct review navigation and reload worked.
- Fixed a 320px overflow caused by an absolutely positioned accessible table header; contained it correctly. Mobile session cards expose actions without horizontal table scrolling.

Synthetic-only screenshots: `screenshots/synthetic-desktop.png`, `screenshots/synthetic-mobile.png`. They show instrument fixtures, not participant data or research results.

## Reliability and descriptive-analysis pass

Added human-review counts using the latest appended decision, annotation coverage using interval unions, and separate ordinal response distributions with explicit missingness. Filters affect on-screen summaries; ZIP summaries remain whole-workspace. Derived export views carry definitions, analysis version and the source dataset hash. Unit checks cover nested/touching intervals, empty denominators, latest-review decisions, raw-label preservation and reproducible exports. See [definitions and limits](DESCRIPTIVE_SUMMARIES.md).

Stale tabs now fail before overwriting or erasing newer saved records. Browser tests used two tabs in one profile, confirmed the newer session survived the rejected stale write, then explicitly reloaded saved records. Corrupt saved storage remained unchanged and could be downloaded for private recovery before deliberate erasure. This is a stale-snapshot guard, not a transactional multi-user storage engine.

Local videos are probed before attachment persistence. Duration mismatch and unsupported bytes were rejected without saving evidence references. The original playback fixture contained one frame at time zero; the strengthened check rejected it. Replaced it with a disposable animated fixture, verified mismatch rejection, then used the correct session duration and verified actual playback time advanced and marking worked without upload. Missing finite-duration metadata remains explicitly flagged for manual verification; file identity is not verified. Obsolete playback URLs are released on import, workspace reset and linked deletion.

All 20 browser tests passed on the final full run, including the original end-to-end workflow, ten-route accessibility checks, desktop/mobile layouts, 320px overflow checks, chart/filter origin isolation, multi-tab conflict and corrupt-storage recovery. Synthetic analytical screenshots are in `screenshots/synthetic-analytics-desktop.png` and `screenshots/synthetic-analytics-mobile.png`. They were visually inspected. No real gameplay or participant data was used. Hosted-backend integration remains explicitly skipped because no disposable backend/test accounts are configured. Production dependency audit reported zero vulnerabilities.

## Data and security evidence

Domain tests reject invalid intervals, orphan links, duplicated IDs, extra identity fields, non-finite values, origin mixing, wrong consent versions, unsafe/signed evidence URLs, unreviewed machine promotion, controlled-human pair claims and invalid review histories. They also check CSV injection protection, empty table headers, JSON tamper detection, linked deletion and split grouping.

Study contacts are removed from JSON/CSV exports without mutating local data. Used study information cannot be silently rewritten through the editor. Raw reports and reviews remain separate. Build configuration rejects secret-like public variables and service/admin-role keys. The private adapter rejects false persistence responses and makes offline uncertainty explicit.

The actual SQL migration executed in isolated PostgreSQL/PGlite, using test auth-role/UID fixtures. Verified anonymous read denial, owner read, cross-user denial, direct browser write/secret-column denial, researcher read, researcher-only review, review-version conflict, idempotent retry, owner/code withdrawal, rejection of withdrawn IDs, daily limits surviving withdrawal, expiry visibility and purge. This is stronger than inspecting SQL text, but it does not test hosted Supabase Auth, CORS, infrastructure or operator configuration.

## Field-journal and research-tool upgrade — 22 October

Implemented the original Monster Hunter-inspired journal theme and locally bundled 205,590-byte fictional expedition WebP; no publisher assets or remote fonts were added. Added the Wilds personal-pilot draft starter, searchable interaction atlas with pair denominators and review/source links, and a system assessment describing capabilities and gaps. Desktop/mobile workspace and model-readout screenshots are saved under `screenshots/field-workspace-*.png` and `screenshots/field-lab-*.png` and were visually inspected. The original draft/annotation/review/export workflows still pass.

The local baseline uses verified observed events with ML permission, excludes outcome/label/feedback text as predictors, fits vocabulary on training data only and keeps connected player/source/comparison groups together. Tests verify hand-computed confusion/F1 values, deterministic fixtures and ties, sparse/one-player/mixed-version refusal, latest-review eligibility and unseen-test-token exclusion. Separate synthetic fixtures have fixed fictional metadata; they are deliberately separable pipeline examples, not Monster Hunter measurements or independent annotation evidence.

Added executable local PostgreSQL configuration summaries and CLI reanalysis of checked JSON exports. The SQL test uses repeated feedback to verify child tables are aggregated before joining and keeps missing responses separate from absent feedback sessions. Both synthetic CLI entry points completed locally. No hosted database, model call or training upload is needed.

All thirteen routes were scanned on desktop/mobile with the existing axe WCAG 2/2.1 A/AA tags. Fixed small metadata contrast on parchment, keyboard access to horizontal tables and inline-link distinction. Scans found zero remaining violations in the passing run; this remains an automated check, not complete accessibility certification. 320px layouts and the populated baseline readout passed the tested mobile workflows. The new starter prepares only an editable draft and leaves optional permissions unchecked.

No application-pack source was edited. A fresh private hash baseline was taken on 22 October, including the current signed materials, to preserve user changes made since the original build; 284 files checked against it had zero changes. This pass compares against that fresh baseline rather than treating later user changes as ours. Public recruitment and central collection remain disabled. The baseline is a supplemental classifier demonstration; the agreed PhD theme and submitted ISE2 are unchanged by this work.

## Deployment history and remaining work

GitHub Pages workflow is prepared with immutable action commit references checked against official action repositories, least necessary job permissions, tests, a production build and central collection forced off. Relative assets and repository-subpath navigation were tested locally.

The user selected the public `MohammedUmarAsif/gameplay-evidence-lab` repository. Created it and published the reviewed source and synthetic fixtures on 19 October 2026 (Asia/Bahrain). [Initial verification and deployment](https://github.com/MohammedUmarAsif/gameplay-evidence-lab/actions/runs/39169805420) passed, including the 30 domain/database tests and 20 browser tests on GitHub's Linux runner. [Live instrument](https://mohammedumarasif.github.io/gameplay-evidence-lab/) and [public source](https://github.com/MohammedUmarAsif/gameplay-evidence-lab).

`npm run verify:live` then passed 30 route/viewport combinations on the real HTTPS site: all ten routes at 1440px, 390px and 320px; correct selected route; direct review reload; synthetic versus empty local origin isolation; disabled central submission; no failed resources, runtime errors, external-origin requests or non-GET writes during these checks. This used isolated browser profiles with synthetic examples only. The repeatable script is `scripts/verify-live.mjs`; runtime reports and screenshots remain ignored under `test-results/live/`. Hosting necessarily serves requests to GitHub; “no external-origin requests” means no additional service beyond the hosting origin during the tested flows. Localhost records are separate from records in the published site's browser origin.

Private central collection remains unavailable. Missing: selected backend project, server secrets, migration/function deployment, study/operator details, invited accounts, retention scheduler and passing hosted access tests. Manual session-token entry is an invited technical-pilot facility, not a finished participant identity system. Appropriate institutional and security review remain necessary before participant collection.

The prototype has not tested real gameplay datasets, model accuracy, inter-rater reliability, population preference, causal mechanic effects or industry usefulness. Those require separately designed studies and permissions.
