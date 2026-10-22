# Senior engineering assessment — 22 October 2026

The product should answer “what happened, under what conditions, where is the evidence, and what can we responsibly conclude?” for a small gameplay investigation. It should help a returning player organise learning and help a researcher audit observations. It cannot yet answer hidden mechanics, optimal builds, drop rates or population preferences.

## Working systems and their next upgrades

| System | Problem solved now | Material gap / next useful upgrade |
|---|---|---|
| Study and consent | Records a question, information version and separate permissions | Operator/institutional process and study-specific materials before inviting participants |
| Configuration and sessions | Preserves context, units, provenance and grouping | Sourced Wilds weapon/action taxonomy; a repeatable capture checklist and equipment snapshots |
| Annotation | Makes observations replayable by interval; video stays local | Stable file identity, independently annotated intervals and documented timing precision |
| Feedback | Keeps intended action and reported experience separate from mechanics | Choose a validated instrument where justified; do not treat ordinal ratings as a preference model |
| Review | Retains raw observations and appended correction/exclusion decisions | Blinded second annotation, disagreement analysis and adjudication protocol |
| Interaction atlas | Searches component pairs and returns to raw evidence | A curated component vocabulary and evidence gaps, not causal network claims |
| Analytics and exports | Missingness, overlap-safe coverage, integrity and executable SQL summaries | A private real-pilot data card and reproducible Python report; measured quality thresholds |
| Baseline lab | Runnable local model, group holdout, weak comparator and error inspection | Controlled outcomes and equal-information baselines before the proposed relational model |
| Collection backend | Designed server validation, private policies and withdrawal | Hosted access/auth/retention verification; disabled in the public build |
| Game reference corpus | No corpus is falsely asserted | Establish source/licence/version register, permitted extraction scope and validation before ingestion |

## Upgrade order and acceptance evidence

1. **Personal Wilds pilot.** Use the new starter to prepare a draft question, save context and record one short original clip. Success: trace a configuration → session → interval → raw feedback → review → validated export; reproduce SQL totals without hand correction. One player is enough to test the instrument, not held-out-player generalisation.
2. **Taxonomy and annotation reliability.** Define actions, equipment properties, encounter conditions and explicit unknowns from permissible sources. Store units and source/version. Success: a second authorised annotator can apply the codebook; report disagreements rather than silently resolving them.
3. **Research dataset.** Use an editable authorised simulator to measure outcomes and, where genuine controls exist, paired changes. Predeclare held-out combinations and acquisition rules. Success: equal-information comparators and documented source grouping, not a large scraped dataset with unclear provenance.
4. **Model and decision usefulness.** Fit the proposed shared-component relational predictor; compare unstructured alternatives, missing-modality cases and abstention. Success requires measured results and uncertainty on predeclared evaluation data. This remains future scientific work; no submitted scope is changed here.
5. **Invited collaboration.** Configure private infrastructure only after operational requirements are met. Success: hosted owner-isolation, auth, retention and withdrawal checks, plus a small appropriately approved pilot. No public recruitment or messages are enabled.

## Portfolio relevance

[Capcom's employer data-role listings](https://hrmos.co/pages/capcom/jobs?category=2136393355494035456), reviewed 22 October 2026, describe acquisition design, governance-aware data preparation, SQL/Python, data marts and BI outputs; ML knowledge is also relevant. The strongest matching portfolio evidence is the instrument/schema, tested SQL, explicit data-quality rules, a reproducible evaluation and a concise case study explaining a real observation and its limits. The browser baseline demonstrates evaluation engineering; it does not yet demonstrate professional Python, production data-platform operation or Monster Hunter expertise. Build and document those next. This is an interpretation of relevant skills, not a statement about hiring eligibility or a promise of employment.

## Architectural decisions

The static Pages app remains small and local-first. Domain validation is shared with the backend. Raw data and reviews stay separate. The new atlas is a derived view; baseline training never overwrites annotations. JSON exports are the source of truth for reanalysis; CSV and SQL outputs are analysis views. Source hashes and algorithm/query versions make results inspectable. Local browser records, source videos and central submissions retain separate privacy boundaries.

The theme is original Monster Hunter-inspired expedition-journal design, with generated fictional landscape art, parchment surfaces and charcoal/forest/brass accents. It is not a copied publisher interface and includes no official monsters, logos or measured game statistics. See [asset provenance](ASSETS.md). The illustration is an optimised 206 KB WebP with no remote request, animation, external font or model service required at runtime.
