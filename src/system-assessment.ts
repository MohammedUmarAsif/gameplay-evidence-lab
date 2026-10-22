const systems = [
  [
    "Study & permissions",
    "Stops records losing the question, protocol and permitted use they belong to.",
    "Version-linked local protocols; active consent; frozen used information.",
    "Before external collection: institutional process, named operator and operational contact.",
  ],
  [
    "Configuration & session",
    "Makes weapon/build/context differences inspectable instead of guessing from a clip.",
    "Typed properties with units and provenance; game/version/source groups.",
    "Add a sourced Monster Hunter taxonomy and repeatable capture checklist after a personal pilot.",
  ],
  [
    "Gameplay annotation",
    "Connects a claim to a replayable moment.",
    "Device-only playback, interval marks and original observations.",
    "Next: stable local file hashes and independent interval annotation; no frame-accuracy claim.",
  ],
  [
    "Player feedback",
    "Keeps reported experience separate from mechanical performance.",
    "Neutral raw questions; optional ratings remain missing.",
    "Choose and permission an appropriate validated instrument for the eventual study.",
  ],
  [
    "Researcher review",
    "Makes correction and exclusion accountable.",
    "Append-only versions preserve raw labels and decisions.",
    "Plan blinded second annotation and adjudication before reporting inter-rater agreement.",
  ],
  [
    "Interaction atlas",
    "Finds the observations behind recurring component combinations.",
    "Search, review filter, pair counts and source-linked event inspection.",
    "Use it to identify evidence gaps; co-occurrence alone is not a causal interaction effect.",
  ],
  [
    "Dataset & exports",
    "Turns browser notes into reproducible analysis inputs.",
    "Integrity-checked JSON/CSVs, dictionary, missingness, grouping and an executable local PostgreSQL summary.",
    "Next: a reproducible Python report and measured data-quality checks on a real pilot.",
  ],
  [
    "Baseline lab",
    "Demonstrates how to test a modest model without hiding leakage or a weak comparator.",
    "Local Bernoulli Naive Bayes, fixed group holdout, majority baseline, macro F1, confusion matrix and manifest.",
    "Supplemental classifier only. Next scientific step: controlled simulator outcomes and the proposal’s relational predictor.",
  ],
  [
    "Private collection",
    "Supports invited collaboration without exposing submissions on static hosting.",
    "Server validation and row-policy implementation; public build disabled.",
    "Hosted auth/access/retention checks remain required; no recruitment is enabled.",
  ],
  [
    "Game reference data",
    "Would make materials, drops and mechanics claims traceable to a version and source.",
    "Not implemented. No datamined values or publisher telemetry are asserted.",
    "Build an explicit licence/source/version register before ingesting any external corpus.",
  ],
];
export function assessmentView() {
  return `<header class="page-heading"><div><span class="section-kicker">Engineering / field readiness</span><h1>System assessment</h1><p>Each system earns its place by solving a specific evidence problem.</p></div></header><section class="panel panel-body"><h2>Build a credible data portfolio</h2><p>The useful demonstration is a traceable path from capture to review to a reproducible result, with limitations a reviewer can inspect. The Monster Hunter field-journal theme provides context; reliability and analysis make the work worth reviewing.</p><p>Capcom’s data-role listings reviewed on 22 October 2026 emphasize acquisition design, data governance, SQL/Python processing and BI outputs, with ML knowledge also relevant. This is a skills alignment, not an endorsement, vacancy guarantee or promise of employment. <a href="https://hrmos.co/pages/capcom/jobs?category=2136393355494035456" target="_blank" rel="noopener noreferrer">Read Capcom’s current data-role listings</a>.</p></section><section class="system-grid">${systems.map(([name, problem, current, next], i) => `<article class="panel panel-body"><span class="section-kicker">${String(i + 1).padStart(2, "0")} / SYSTEM</span><h2>${name}</h2><p>${problem}</p><dl class="system-status"><dt>Current capability</dt><dd>${current}</dd><dt>Next useful upgrade</dt><dd>${next}</dd></dl></article>`).join("")}</section><section class="panel panel-body"><h2>Next evidence milestone</h2><ol><li>Complete one personal Wilds pilot: exact game version, configuration, a short original recording and a declared event taxonomy.</li><li>Document ambiguities and review decisions; export and reproduce the summaries. One player is an instrument pilot, not a player-generalisation study.</li><li>Build a separately planned, permissioned cohort or controlled simulator dataset. Define features before outcomes, comparison baselines and held-out combinations before model tuning.</li><li>Publish a small case study with a data card, reproducible analysis, error analysis and limitations. Include negative or uncertain findings. Keep private recordings and identifiers out of the repository.</li></ol><p>No new game corpus, hidden engine telemetry, automated video model or industry collaboration is implied by this prototype.</p></section>`;
}
