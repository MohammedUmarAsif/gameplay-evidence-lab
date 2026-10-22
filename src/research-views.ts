import { latestReview, type Dataset } from "./domain";
import { eligibleExamples, type runBaseline } from "./learning";
const esc = (s: unknown) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export function explorerView(
  data: Dataset,
  query: string,
  verifiedOnly: boolean,
) {
  const rows = data.events.filter(
    (e) =>
      (!verifiedOnly || latestReview(data, e.id)?.status === "verified") &&
      `${e.label} ${e.components.join(" ")} ${e.outcome}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const event of rows) {
    const components = [...new Set(event.components)].sort();
    for (let i = 0; i < components.length; i++)
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i],
          b = components[j],
          key = JSON.stringify([a, b]);
        pairs.set(key, { a, b, count: (pairs.get(key)?.count ?? 0) + 1 });
      }
  }
  return `<header class="page-heading"><div><span class="section-kicker">Field analysis / 01</span><h1>Interaction atlas</h1><p>Find the observations behind a component pairing. Co-occurrence is a lead to inspect, not a mechanic effect.</p></div></header>
  <form id="explorer-form" class="panel panel-body"><label class="field">Search components, labels or outcomes<input class="form-control" name="query" maxlength="300" value="${esc(query)}" placeholder="Try action: or encounter:"></label><label class="check"><input type="checkbox" name="verifiedOnly" ${verifiedOnly ? "checked" : ""}> Latest human review must be verified</label><button class="btn btn-primary" type="submit">Explore evidence</button></form>
  <div class="metrics"><div><strong>${rows.length}</strong><span>matching raw events</span></div><div><strong>${new Set(rows.map((e) => e.sessionId)).size}</strong><span>sessions represented</span></div><div><strong>${pairs.size}</strong><span>distinct component pairs</span></div></div>
  <section class="panel"><div class="panel-heading"><h2>Component co-occurrence</h2><span>Top 12 pairs · events are the denominator</span></div><div class="table-wrap"><table><thead><tr><th>Component A</th><th>Component B</th><th>Events / matching events</th></tr></thead><tbody>${
    [...pairs.values()]
      .sort((a, b) => b.count - a.count || a.a.localeCompare(b.a))
      .slice(0, 12)
      .map(
        (p) =>
          `<tr><td>${esc(p.a)}</td><td>${esc(p.b)}</td><td>${p.count} / ${rows.length}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="3">No matching component pairs. Add timestamped events with at least two components.</td></tr>'
  }</tbody></table></div></section>
  <section class="panel"><div class="panel-heading"><h2>Trace the evidence</h2><span>First ${Math.min(50, rows.length)} of ${rows.length} matching events</span></div><div class="event-list">${
    rows
      .slice(0, 50)
      .map((e) => {
        const review = latestReview(data, e.id);
        return `<article><button class="time-button" data-session="${esc(e.sessionId)}">${e.startSeconds.toFixed(2)}–${e.endSeconds.toFixed(2)}s</button><div><strong>${esc(e.label)}</strong><p>${esc(e.outcome)}</p><p class="helper">${esc(e.components.join(" · "))}</p><p class="helper">${esc(e.source)} · ${esc(e.provenance)} · ${esc(review?.status ?? "review pending")}${review ? ` · reviewed label: ${esc(review.correctedLabel)}` : ""}</p></div><button class="btn btn-sm" data-review="${esc(e.id)}">Review</button></article>`;
      })
      .join("") ||
    '<p class="panel-body">No matching observations. Broaden the search or annotate a session.</p>'
  }</div></section>`;
}
export function learningView(
  data: Dataset,
  result: ReturnType<typeof runBaseline> | null,
) {
  return `<header class="page-heading"><div><span class="section-kicker">Field analysis / 02</span><h1>Baseline lab</h1><p>Run a small, auditable classification experiment entirely on this device.</p></div></header>
  <div class="notice"><strong>${data.origin === "synthetic" ? "Synthetic pipeline demonstration." : "Exploratory local analysis."}</strong> This classifies reviewed event labels from manually supplied components. It is not the proposed relational interaction-effect predictor, video understanding or a validated Monster Hunter model.</div>
  <section class="panel panel-body"><h2>Define the experiment</h2><p>Bernoulli Naive Bayes versus the training-set majority class. One fixed group holdout; no random event split. Feature vocabulary is fitted on training rows only.</p><form id="baseline-form"><label class="field">Study cohort<select class="form-select" name="studyId" required>${data.studies.map((s) => `<option value="${esc(s.id)}" ${result?.studyId === s.id ? "selected" : ""}>${esc(s.title)} · ${eligibleExamples(data, s.id).length} eligible events</option>`).join("")}</select></label><p class="helper">Eligibility: observed event, latest human review verified, recorded ML permission, allowed component tokens. Requires 8 events, 3 connected player/source groups, 2 target classes and one game/version. These are software pilot gates, not an adequate scientific sample-size claim.</p><div class="actions"><button class="btn btn-primary" type="submit" ${data.studies.length ? "" : "disabled"}>Run fixed baseline</button>${data.origin === "synthetic" ? '<button class="btn" type="button" data-action="load-benchmark">Load synthetic benchmark</button>' : ""}</div></form><details><summary>Features and leakage boundary</summary><p>Only action:, weapon:, encounter:, condition: and resource: tokens enter the classifier. Outcomes, labels, notes, durations, feedback and IDs are excluded as predictors. Player/source/comparison connections stay on one side. Manual component names can still encode an outcome or be observed after it: audit the feature timing and label taxonomy before treating any score as informative. Similar clips with unknown source links can still leak. Repeatedly examining this holdout makes it exploratory.</p></details></section>
  ${
    result
      ? `<section class="panel panel-body"><div class="panel-heading"><h2>Experiment readout</h2><span>${result.trainRows} train / ${result.testRows} test events</span></div><p class="helper">${result.split.trainGroups.length} train groups / ${result.split.testGroups.length} test groups · ${result.eligible} eligible / ${result.excluded} excluded events · ${esc(result.version)}</p><div class="table-wrap"><table><thead><tr><th>Model</th><th>Accuracy</th><th>Macro F1</th><th>Test events</th></tr></thead><tbody><tr><td>Bernoulli Naive Bayes</td><td>${pct(result.model.accuracy)}</td><td>${result.model.macroF1.toFixed(3)}</td><td>${result.testRows}</td></tr><tr><td>Majority baseline</td><td>${pct(result.majority.accuracy)}</td><td>${result.majority.macroF1.toFixed(3)}</td><td>${result.testRows}</td></tr></tbody></table></div><p>Unseen target classes: ${result.predictions.filter((p) => p.unseenTarget).length} test events. Unseen component tokens: ${result.predictions.reduce((n, p) => n + p.unknownFeatures.length, 0)} token occurrences (ignored by the fitted model).</p><h3>Confusion matrix</h3><p class="helper">Rows are actual reviewed classes; columns are predicted classes. Cell values are event counts.</p><div class="table-wrap"><table><thead><tr><th>Actual / predicted</th>${result.model.labels.map((l) => `<th>${esc(l)}</th>`).join("")}</tr></thead><tbody>${result.model.labels.map((l, i) => `<tr><th scope="row">${esc(l)}</th>${result.model.matrix[i].map((count, j) => `<td class="${count ? "matrix-count" : ""}">${count}</td>`).join("")}</tr>`).join("")}</tbody></table></div><h3>Inspect held-out predictions</h3><div class="table-wrap"><table><thead><tr><th>Event</th><th>Reviewed target</th><th>Prediction</th><th>Result</th></tr></thead><tbody>${result.predictions
          .slice(0, 50)
          .map(
            (p) =>
              `<tr><td>${esc(p.eventId)}</td><td>${esc(p.actual)}</td><td>${esc(p.predicted)}</td><td>${p.actual === p.predicted ? "Match" : "Mismatch"}</td></tr>`,
          )
          .join(
            "",
          )}</tbody></table></div><p class="helper">First ${Math.min(50, result.testRows)} of ${result.testRows} predictions shown. Export includes all test predictions and group/event assignments.</p><button class="btn" data-action="export-baseline">Export experiment JSON</button><ul>${result.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></section>`
      : '<section class="panel panel-body"><h2>No experiment run</h2><p>The ordinary demo intentionally has too little independent evidence. Load the separate synthetic benchmark to check the pipeline, or build a permissioned, reviewed local cohort. A personal one-player pilot cannot establish a held-out-player result.</p></section>'
  }`;
}
