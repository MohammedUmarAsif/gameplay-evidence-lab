import { describeDataset } from "./analytics";
import type { Dataset } from "./domain";

const number = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const bar = (count: number, total: number) =>
  `<span class="chart-track" aria-hidden="true"><span style="width:${total ? (count / total) * 100 : 0}%"></span></span><span>${count} / ${total}</span>`;
export function analysisView(data: Dataset) {
  const summary = describeDataset(data);
  return `<section class="panel panel-body" aria-labelledby="review-chart-title"><h2 id="review-chart-title">Human review status</h2><p>Latest appended review per raw event. An imported raw “verified” label does not count as a human review.</p><dl class="count-chart">${Object.entries(
    summary.reviewCounts,
  )
    .map(
      ([label, count]) =>
        `<div><dt>${label === "pending" ? "Review pending" : label[0].toUpperCase() + label.slice(1)}</dt><dd>${bar(count, summary.eventDenominator)}</dd></div>`,
    )
    .join("")}</dl></section>
  <section class="panel panel-body"><h2>Annotation coverage</h2><p><strong>${number(summary.coverage.annotatedSeconds)} / ${number(summary.coverage.sessionSeconds)} recorded seconds</strong> ${summary.coverage.fraction === null ? "· not available (no sessions)" : `· ${number(summary.coverage.fraction * 100)}%`}</p><p class="helper">Union of raw intervals, counted once per session even when events overlap. Includes uncertain and excluded events. This describes annotation coverage, not evidence validity, skill or engagement.</p></section>
  <section class="panel panel-body" aria-labelledby="rating-chart-title"><h2 id="rating-chart-title">Feedback response distributions</h2><p>Custom pilot items, ordinal 1–5. Each row is a feedback record; repeated records may come from one player. Missing responses remain missing.</p><div class="rating-charts">${summary.ratings.map((rating) => `<section aria-labelledby="rating-${rating.item}"><h3 id="rating-${rating.item}">${rating.item[0].toUpperCase() + rating.item.slice(1)}</h3><p class="helper">${rating.answered} answered / ${rating.records} records · ${rating.missing} missing</p><dl class="count-chart rating-chart">${rating.bins.map((bin) => `<div><dt>Rating ${bin.value}</dt><dd>${bar(bin.count, rating.records)}</dd></div>`).join("")}</dl></section>`).join("")}</div><details><summary>How to interpret these summaries</summary><p>No average, composite score or inferential comparison is calculated. Control: 1 very little–5 very much; difficulty: 1 very easy–5 very difficult; enjoyment: 1 not at all–5 very much. The bars use all feedback records as the denominator, including unanswered records.</p></details></section>`;
}
