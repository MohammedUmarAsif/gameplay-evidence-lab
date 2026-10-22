# Baseline lab: an auditable engineering experiment

This supplemental component classifier demonstrates research-software and evaluation skills. It does not replace or implement the agreed PhD's relational interaction-effect predictor, learn hidden engine rules, analyse video or produce game-design recommendations.

## Run it

In the site, open **Baseline lab**, load the separate **synthetic benchmark**, then run the fixed baseline. This changes only the in-memory synthetic workspace. The ordinary two-event demo is intentionally insufficient. The benchmark has 24 artificial events, four fictional player/source groups, two deliberately separable labels and fictional fixed metadata. Its strong score checks software behaviour, not game performance.

The same pipeline runs locally from the project directory:

```sh
npm run baseline:synthetic
npm run analyse:synthetic
```

For your own private validated dataset export, keep it outside Git:

```sh
npx tsx scripts/run-baseline.ts "C:/private-research/local-evidence.json" YOUR_STUDY_ID
npx tsx scripts/analyse-export.ts "C:/private-research/local-evidence.json"
```

These commands print JSON to standard output. Treat real-data results and terminal logs as private too. No model service or hosted database is called. The SQL command uses an in-memory PostgreSQL/PGlite instance and the checked-in query at `analysis/pilot-summary.sql`. It aggregates event and feedback child tables before joining to avoid count inflation, and distinguishes unanswered ratings from sessions with no feedback. SQL is tested against repeated feedback records.

## Cohort and features

Choose one study. Eligible events need observed provenance, a latest appended human review marked verified, recorded ML-processing permission and at least one allowed component token. Excluded, uncertain, pending, model-inferred and self-reported observations do not enter training. The software gates require at least eight eligible events, three connected groups, two classes and one game/version. They are not a power calculation or evidence of adequate external validity.

The target is the latest corrected event label. Predictors are binary presence/absence of manually supplied `action:`, `weapon:`, `encounter:`, `condition:` and `resource:` tokens. Labels, outcomes, notes, feedback, duration, identifiers and video are excluded as predictors. Tokens are normalised and deduplicated. The vocabulary is learned from training rows only; unseen test tokens are reported and ignored. Maximum 256 training tokens and 20 training classes bound this browser pilot.

Manual components can still encode the answer or be derived after an outcome. This is a material limitation, not solved by excluding a field named “outcome”. Define a feature-availability window and target taxonomy before collecting real data, audit each feature's provenance and inspect duplicate recordings. No assertion of leakage-free scientific evidence is made.

## Split, estimator and evaluation

Build connected groups using shared player pseudonyms, source-group IDs and comparison links, including connections through ineligible sessions. Sort the eligible groups by FNV-1a hash of `fixed-v1:` plus group ID, with lexical tie breaking. Hold out the first floor(25%) of groups, at least one; all remaining groups train. This is an explicit deterministic engineering rule, not an optimal experimental design. IDs and input grouping affect the assignment. The exported manifest lists the actual groups and event IDs. No row-level shuffle is used. Unknown source relationships can still leak.

Bernoulli Naive Bayes uses empirical class priors and Laplace smoothing alpha=1: a token's conditional probability is (class rows containing token + 1)/(class rows + 2). Prediction sums the log prior and log presence/absence likelihoods over training vocabulary. Ties use lexical label order. Compare against the most frequent training class with the same tie rule. No probability or confidence score is presented as calibrated.

Report test-event accuracy and macro F1 over the union of actual/predicted test labels, zero division=0. Show the confusion matrix, support, unseen targets/tokens and individual predictions. These events are not independent participants. This is one exploratory holdout, with no tuning, confidence interval or claimed generalisation. Repeatedly viewing the holdout also makes it unsuitable as a fresh final test.

Exports include the algorithm version, feature policy, group/event assignments, predictions, metrics, origin and checked/contact-redacted source dataset checksum. Results are not inserted into raw event or prediction tables. Any dataset mutation or mode reset invalidates the displayed experiment. Preserve the source JSON separately if you need to reproduce it.

## References and next scientific step

Implementation follows the definitions in [scikit-learn's Naive Bayes documentation](https://scikit-learn.org/stable/modules/naive_bayes.html#bernoulli-naive-bayes). Group separation and train-only preprocessing address the issues described in its [grouped cross-validation guidance](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data). This implementation is TypeScript, not scikit-learn, and does not claim numerical parity with that library.

The next scientific milestone remains the submitted proposal: an authorised controlled environment, predeclared components and measured outcomes, held-out interactions and strong equal-information baselines, followed by the proposed relational model and error/abstention analysis. A classifier demo and a beautiful field journal do not establish that hypothesis.
