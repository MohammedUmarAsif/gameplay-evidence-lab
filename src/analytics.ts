import { checked, latestReview, warnings, type Dataset } from "./domain";

export const ANALYSIS_VERSION = "descriptive-1";
export const ANALYSIS_DEFINITIONS = {
  scope:
    "Descriptive convenience-sample summaries; no population or causal estimates.",
  review:
    "Latest appended human review; raw verification fields do not count as researcher review.",
  coverage:
    "Union of all raw event intervals within each session, divided by recorded session seconds. Overlaps count once. Includes uncertain/excluded events; this measures annotation coverage, not validity or gameplay engagement.",
  ratings:
    "Separate ordinal 1–5 counts and explicit missing count per custom item. Feedback records are repeated observations, not independent participants. No composite score or mean.",
  timing:
    "Raw interval lengths, not reaction time, frame timing, hidden engine properties or skill.",
};

export function intervalUnion(
  intervals: readonly { startSeconds: number; endSeconds: number }[],
) {
  const sorted = [...intervals].sort((a, b) => a.startSeconds - b.startSeconds);
  let length = 0,
    end = -Infinity;
  for (const row of sorted) {
    length += Math.max(0, row.endSeconds - Math.max(end, row.startSeconds));
    end = Math.max(end, row.endSeconds);
  }
  return length;
}

export function describeDataset(input: Dataset) {
  const data = checked(input);
  const reviewCounts = { pending: 0, verified: 0, uncertain: 0, excluded: 0 };
  const eventRows = data.events.map((event) => {
    const review = latestReview(data, event.id);
    const decision = review?.status ?? "pending";
    reviewCounts[decision]++;
    return {
      eventId: event.id,
      sessionId: event.sessionId,
      rawLabel: event.label,
      reviewedLabel: review?.correctedLabel ?? null,
      reviewStatus: decision,
      annotationVersion: review?.annotationVersion ?? 1,
      durationSeconds: event.endSeconds - event.startSeconds,
    };
  });
  const sessions = data.sessions.map((session) => {
    const events = data.events.filter(
      (event) => event.sessionId === session.id,
    );
    return {
      sessionId: session.id,
      configurationId: session.configurationId,
      durationSeconds: session.durationSeconds,
      events: events.length,
      annotatedSeconds: intervalUnion(events),
      feedbackRecords: data.feedback.filter((f) => f.sessionId === session.id)
        .length,
    };
  });
  const sessionSeconds = sessions.reduce(
    (sum, s) => sum + s.durationSeconds,
    0,
  );
  const annotatedSeconds = sessions.reduce(
    (sum, s) => sum + s.annotatedSeconds,
    0,
  );
  const ratings = (["control", "difficulty", "enjoyment"] as const).map(
    (item) => ({
      item,
      records: data.feedback.length,
      answered: data.feedback.filter((f) => f[item] !== null).length,
      missing: data.feedback.filter((f) => f[item] === null).length,
      bins: [1, 2, 3, 4, 5].map((value) => ({
        value,
        count: data.feedback.filter((f) => f[item] === value).length,
      })),
    }),
  );
  return {
    analysisVersion: ANALYSIS_VERSION,
    origin: data.origin,
    definitions: ANALYSIS_DEFINITIONS,
    sessions,
    eventRows,
    reviewCounts,
    eventDenominator: data.events.length,
    coverage: {
      annotatedSeconds,
      sessionSeconds,
      fraction: sessionSeconds ? annotatedSeconds / sessionSeconds : null,
    },
    ratings,
    qualityWarnings: warnings(data),
  };
}
