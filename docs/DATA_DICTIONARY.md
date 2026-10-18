# Data dictionary

Canonical runtime contract: `src/domain.ts`. Structural JSON Schema: `dataset.schema.json`. `data-dictionary.json` is also bundled with each export. Cross-record checks cannot all be expressed in JSON Schema; run the runtime validator for interval, relationship, origin, consent and review-version checks.

## Dataset and export

`schemaVersion` = 1.0.0; `instrumentVersion` = 0.1.0. `origin` is `synthetic`, `local` or `submitted` and cannot be relabelled during import. `datasetId` is an opaque UUID; `createdAt` and all record timestamps are UTC ISO 8601.

JSON exports wrap the dataset in `exportMetadata`: format/version, export time, origin, table counts, SHA-256 over the canonical validated dataset, and redaction declarations. Study contacts are blanked by default in both JSON and CSV. This means a restored export needs the researcher-issued study contact restored before central submission. Hashes detect accidental change; they are not digital signatures or proof of authenticity.

No video bytes or dedicated auth-account, participant-email, session-token or withdrawal-code fields are included in research exports. Participant/reviewer pseudonyms, free text and evidence references can still be identifying. No automatic free-text deidentification is claimed.

## Related tables

| Table | Key / relationship | Important fields |
|---|---|---|
| studies | `id` PK | title, protocolVersion, consentVersion, question, inclusion, measures, media-use policy, retention, deletion, informationText, contact; reviewStatus does not mean ethics approval; publicRecruitment always false |
| configurations | `id` PK; `studyId` FK | equipment and label; properties are `{name,value,unit,status,source}` records |
| sessions | `id` PK; `studyId`, `configurationId` FK | participantId pseudonym, groupId episode/source, game/version/platform, experience, encounter, conditions, durationSeconds, source, evidenceKind/evidenceRef, opaque mediaId, consent choices |
| events | `id` PK; `sessionId` FK | start/end seconds, raw label, component identifiers, outcome, note, evidence category, source, raw verification, annotationVersion=1 |
| feedback | `id` PK; `sessionId` FK; optional `eventId` FK | intendedAction, occurred, control/difficulty/enjoyment, optional suggestion, custom instrument ID |
| comparisons | `id` PK; sessionA/sessionB FK | changed factor, comparison kind, order, state/seed/controller references, outcome notes |
| reviews | `id` PK; `eventId` FK | originalLabel, correctedLabel, decision, reviewer pseudonym, adjudication note, consecutive annotationVersion and timestamp |
| predictions | `id` PK; `eventId` FK | model/version/prompt, proposed label, interval, confidence or null, limitations; unreviewed; session ML permission required |
| split_groups | session linkage, export-derived | participant, source grouping and connected leakageGroup; unassigned partition |

Nested structures are JSON strings in CSV cells. Empty tables still have header rows. Formula-like text is prefixed with an apostrophe for spreadsheet safety; JSON retains the original text.

## Units and missing values

- Duration and intervals: seconds from recording/session start. The interval end must be strictly greater than start and no greater than session duration. Boundary precision is annotation precision, not a validated engine-frame measurement.
- Configuration properties: a finite number or null, with a unit and evidence status. `unknown` and `not-applicable` are explicit text values for context; a missing numeric property is null.
- Experience: new, some, experienced, unknown or not-applicable. Source: own-play, participant-play, simulation, authorised-external or synthetic-example.
- Provenance: observed, self-reported, model-inferred or unknown. Raw verification: unreviewed, verified or uncertain. Review decisions: verified, uncertain or excluded. A reviewed correction is separate from the raw verification field.
- Custom control rating: 1 very little → 5 very much. Difficulty: 1 very easy → 5 very difficult. Enjoyment: 1 not at all → 5 very much. Null means unanswered, not zero. These are not validated psychometric subscales.
- Machine confidence: null or 0–1 self-reported score; not a calibrated probability.

## Later training/evaluation

Keep connected players, sessions, source groups and comparison pairs together. Independently investigate duplicate recordings and overlapping clips; grouping IDs do not discover all duplicates. Do not promote ordinary observations into experimental intervention labels. Define pre-outcome inputs and target horizons separately before modelling; this MVP does not generate a ready-to-train feature matrix.
