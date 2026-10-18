# Descriptive summaries, version descriptive-1

These are instrument checks on the active workspace or selected configuration, not population estimates, causal effects, model evaluations or validated psychological measurements. Synthetic data remain labelled synthetic. A filter changes the screen summaries; exports contain the entire workspace.

## Human review

One count per raw event. Use its latest appended review's decision: verified, uncertain or excluded. Without an appended review the event is pending, regardless of its original verification field. Later corrections do not change the raw event. These counts do not establish independent inter-rater agreement or label accuracy.

## Annotation coverage

Sort raw intervals by start within each session and calculate their union. For example, [1,6), [2,3), [5,9), [9,10) cover 9 seconds, not 11. Sum the session unions and divide by the sum of recorded session durations. Overlaps across different sessions are separate recordings and count separately. Include all raw intervals, including excluded or uncertain events: this is annotation coverage, not valid-evidence coverage, skill or engagement. A workspace with no session seconds reports unavailable rather than zero percent. Correct duration and source-group records remain essential.

## Ordinal feedback

Keep separate counts for ratings 1 through 5 for control, difficulty and enjoyment. Show answered, missing and total feedback records. The bar denominator is all feedback records, including unanswered ones; null is never converted to zero. Do not compute an average or composite score. Repeated feedback records are not independent participants. The custom questions are not a validated scale.

## Reproduce an export

The ZIP contains `descriptive-summary.json`, `session_coverage.csv` and `event_review_status.csv` alongside the original tables. The summary records its origin, definitions, analysis version, whole-workspace scope and the SHA-256 of the checked, contact-redacted source dataset. That source hash matches `manifest.json`. Recompute from the envelope's dataset with `describeDataset` in `src/analytics.ts`. CSV cells use the same spreadsheet-formula escaping as the raw tables. Analysis views are derived records, not editable replacements for raw observations.

The hash detects accidental alteration relative to the manifest; it is not a signature, authentication or proof that an observation is true. Free text remains potentially identifying. Review before sharing.

## Storage and media limits

Local storage uses a stale-snapshot check before writes and erasure, plus a warning when another tab changes it. It is not a multi-user transactional database or a cross-device synchronisation service; simultaneous browser processes still require care. Use one editing tab and export backups. Recovery downloads preserve the saved raw entry without claiming it is a valid dataset.

A local recording is inspected for readable metadata before a reference is saved. Finite durations must match the session within one second (container metadata tolerance, not a scientific timing resolution). A clip with no finite duration is explicitly identified for manual verification. Unsupported files, zero-duration clips and mismatches do not replace the current attachment. Local file identity is not hashed or verified: reattach the original recording and create a separate session for a different clip. Replacement, import, mode changes and deletion release obsolete local playback URLs. No video bytes are persisted or sent.
