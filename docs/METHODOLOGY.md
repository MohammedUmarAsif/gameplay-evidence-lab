# Methodology and limitations

This is an evidence-preparation instrument for the agreed research theme, not a replacement proposal or an implemented outcome-prediction model.

The units are study, configuration, session, event, feedback and comparison. Supporting tables contain append-only reviews and optional imported machine suggestions. The same schema enforces local imports, exports and server submission gates.

Raw observations, self-reports, machine inferences and unknowns are labelled distinctly. Numeric configuration properties carry units and a source. Timestamp intervals use seconds from the recording/session origin and must be increasing and within the stated duration. A local file is not automatically a verified ground-truth recording; the researcher checks its timing and content.

Feedback uses custom neutral pilot questions. No validation, psychometric reliability or scale licensing is implied. Mechanical effectiveness and reported enjoyment/control are separate variables. Optional missing ratings are null rather than zero.

Review decisions retain the raw event label. Corrections have reviewer pseudonym, time, reason, version and decision. A self-review is not independent agreement. Exclusion decisions do not erase raw records, and analysis users must explicitly choose which review decisions to include.

Human configuration pairs are observational. Controlled-simulation pairs require state, seed and controller references, and simulation sources. These fields document an intended control; they do not independently prove that the simulator reset or policy was correct. Counterfactual and causal claims need an appropriate experimental design.

The analysis reports counts and denominators for the current view and describes suggestions only within the collected sample. It does not infer worldwide preference, hidden state, emotion, retention value or causal effects. Repeated events/feedback from one person are not independent people.

The split-group export connects sessions sharing a participant, source group or comparison pair. It is a conservative grouping aid, not an assigned or verified train/test split. Independently inspect duplicate videos, overlapping clips and mechanic combinations. Later prediction datasets must also prevent future-outcome leakage and fit preprocessing on training data only.

Future model-assisted annotation enters a separate prediction table with model/version/prompt, intervals, score limitations and mandatory unreviewed status. Recorded ML-processing permission is required. Model scores are not calibrated probabilities. No hosted or video model is called. The optional Baseline lab fits a local Bernoulli component classifier on eligible reviewed/permissioned records and reports one fixed group holdout against a majority comparator; this supplemental engineering exercise is not the proposed relational predictor. It does not write predictions into raw annotations. See [methods and limitations](BASELINE_LAB.md).

All public examples are synthetic and explicitly labelled. Local records are browser drafts, never implicitly submitted. Centrally submitted records are accessible only through the configured authenticated backend. No public recruitment, institutional approval, publisher partnership or dataset permission is claimed.

The original scope documents and submitted ISE2 remain in the sibling application pack and are not edited or published by this project.
