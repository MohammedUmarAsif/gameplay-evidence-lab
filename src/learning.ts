import { checked, latestReview, splitGroups, type Dataset } from "./domain";

export const BASELINE_VERSION = "bernoulli-components-v1";
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const tokens = (values: string[]) =>
  [
    ...new Set(
      values
        .map((v) => v.trim().toLowerCase())
        .filter((v) =>
          /^(action|weapon|encounter|condition|resource):/.test(v),
        ),
    ),
  ].sort(compare);
const hash = (value: string) => {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
};
export type Example = {
  eventId: string;
  sessionId: string;
  group: string;
  features: string[];
  target: string;
};
export function eligibleExamples(input: Dataset, studyId: string) {
  const data = checked(input),
    grouping = new Map(
      splitGroups(data).map((g) => [g.sessionId, g.leakageGroup]),
    );
  return data.events
    .flatMap((event) => {
      const session = data.sessions.find((s) => s.id === event.sessionId)!;
      const review = latestReview(data, event.id);
      if (
        session.studyId !== studyId ||
        !session.consent.mlProcessing ||
        review?.status !== "verified" ||
        event.provenance !== "observed"
      )
        return [];
      const features = tokens(event.components);
      return features.length
        ? [
            {
              eventId: event.id,
              sessionId: session.id,
              group: grouping.get(session.id)!,
              features,
              target: review.correctedLabel,
            },
          ]
        : [];
    })
    .sort((a, b) => compare(a.eventId, b.eventId));
}
export function scorePredictions(actual: string[], predicted: string[]) {
  if (!actual.length || actual.length !== predicted.length)
    throw new Error(
      "Metrics need matching nonempty actual and predicted rows.",
    );
  const labels = [...new Set([...actual, ...predicted])].sort(compare);
  if (labels.length > 20)
    throw new Error(
      "Pilot baseline limit: 20 classes for bounded confusion-matrix analysis.",
    );
  const matrix = labels.map((a) =>
    labels.map(
      (p) => actual.filter((v, i) => v === a && predicted[i] === p).length,
    ),
  );
  const classes = labels.map((label, i) => {
    const tp = matrix[i][i],
      support = matrix[i].reduce((a, b) => a + b, 0),
      predictedCount = matrix.reduce((sum, row) => sum + row[i], 0);
    const precision = predictedCount ? tp / predictedCount : 0,
      recall = support ? tp / support : 0;
    return {
      label,
      support,
      precision,
      recall,
      f1:
        precision + recall
          ? (2 * precision * recall) / (precision + recall)
          : 0,
    };
  });
  return {
    n: actual.length,
    accuracy:
      actual.filter((v, i) => v === predicted[i]).length / actual.length,
    macroF1: classes.reduce((sum, c) => sum + c.f1, 0) / classes.length,
    labels,
    matrix,
    classes,
  };
}
export function fitBernoulli(train: Example[]) {
  if (!train.length) throw new Error("Training rows are required.");
  const vocabulary = [...new Set(train.flatMap((e) => e.features))].sort(
    compare,
  );
  const labels = [...new Set(train.map((e) => e.target))].sort(compare);
  if (vocabulary.length > 256 || labels.length > 20)
    throw new Error(
      "Pilot baseline limit: 256 feature tokens and 20 classes. Curate the cohort before running.",
    );
  const classes = labels.map((label) => {
    const rows = train.filter((e) => e.target === label);
    return {
      label,
      n: rows.length,
      prior: rows.length / train.length,
      probabilities: vocabulary.map(
        (feature) =>
          (rows.filter((e) => e.features.includes(feature)).length + 1) /
          (rows.length + 2),
      ),
    };
  });
  const majority = [...classes].sort(
    (a, b) => b.n - a.n || compare(a.label, b.label),
  )[0].label;
  return {
    vocabulary,
    labels,
    majority,
    predict: (features: string[]) => {
      const present = new Set(features);
      return classes
        .map((c) => ({
          label: c.label,
          logScore:
            Math.log(c.prior) +
            vocabulary.reduce(
              (sum, f, i) =>
                sum +
                Math.log(
                  present.has(f) ? c.probabilities[i] : 1 - c.probabilities[i],
                ),
              0,
            ),
        }))
        .sort((a, b) => b.logScore - a.logScore || compare(a.label, b.label))[0]
        .label;
    },
  };
}
export function runBaseline(input: Dataset, studyId: string) {
  const data = checked(input),
    rows = eligibleExamples(data, studyId);
  const groups = [...new Set(rows.map((e) => e.group))].sort(
    (a, b) => hash(`fixed-v1:${a}`) - hash(`fixed-v1:${b}`) || compare(a, b),
  );
  if (rows.length < 8 || groups.length < 3)
    throw new Error(
      "Need at least 8 eligible observed events and 3 independent connected groups. A single player/recording cannot be split into independent train and test data.",
    );
  const sessions = data.sessions.filter((s) =>
    rows.some((e) => e.sessionId === s.id),
  );
  if (new Set(sessions.map((s) => `${s.game}|${s.gameVersion}`)).size !== 1)
    throw new Error(
      "Choose one study with a single game and version; this pilot does not pool different game versions.",
    );
  if (new Set(rows.map((e) => e.target)).size < 2)
    throw new Error("Need at least two reviewed target classes.");
  if (new Set(rows.map((e) => e.target)).size > 20)
    throw new Error(
      "Pilot baseline limit: 20 classes. Curate the target taxonomy before running.",
    );
  const testGroups = groups.slice(
    0,
    Math.max(1, Math.floor(groups.length * 0.25)),
  );
  const test = rows.filter((e) => testGroups.includes(e.group)),
    train = rows.filter((e) => !testGroups.includes(e.group));
  const model = fitBernoulli(train);
  const predictions = test.map((e) => ({
    eventId: e.eventId,
    sessionId: e.sessionId,
    group: e.group,
    actual: e.target,
    predicted: model.predict(e.features),
    majority: model.majority,
    unknownFeatures: e.features.filter((f) => !model.vocabulary.includes(f)),
    unseenTarget: !model.labels.includes(e.target),
  }));
  return {
    version: BASELINE_VERSION,
    origin: data.origin,
    datasetId: data.datasetId,
    studyId,
    task: "Supplemental reviewed-event classification from manually supplied component tokens; not the proposed relational interaction-effect predictor.",
    split: {
      rule: "fixed-v1 FNV-1a group-ID ordering; first floor(25%) groups held out, at least one; no event-level shuffle",
      trainGroups: groups.filter((g) => !testGroups.includes(g)),
      testGroups,
      trainEventIds: train.map((e) => e.eventId),
      testEventIds: test.map((e) => e.eventId),
    },
    features: model.vocabulary,
    featurePolicy:
      "Only action/weapon/encounter/condition/resource component tokens. No raw/review labels, outcomes, notes, feedback, identifiers, durations or video as predictors. Vocabulary fitted on training rows only. Manual feature provenance may still leak labels; audit temporal availability before interpreting.",
    metricPolicy:
      "Accuracy per test event; macro F1 over the union of actual and predicted test classes, zero division = 0. Events within a group are not independent participants.",
    eligible: rows.length,
    excluded:
      data.events.filter(
        (e) =>
          data.sessions.find((s) => s.id === e.sessionId)?.studyId === studyId,
      ).length - rows.length,
    trainRows: train.length,
    testRows: test.length,
    predictions,
    model: scorePredictions(
      predictions.map((p) => p.actual),
      predictions.map((p) => p.predicted),
    ),
    majority: scorePredictions(
      predictions.map((p) => p.actual),
      predictions.map((p) => p.majority),
    ),
    limitations: [
      "One fixed exploratory holdout; no confidence intervals, tuning, calibration or generalisation claim.",
      "Grouped by player/source/comparison links. Unknown identities and duplicate clips can still leak; curate before use.",
      "Review-verified is a recorded decision, not proof of independent ground truth.",
      "Synthetic scores test the pipeline only; they are not gameplay performance or evidence of novelty.",
      "No hosted model, training upload, prediction persistence or automated design advice.",
    ],
  };
}
