import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;
export const INSTRUMENT_VERSION = "0.1.0";
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const short = z.string().trim().min(1).max(300);
const text = z.string().trim().max(4000);
const timestamp = z.iso.datetime();
const finite = z.number().finite();
export const provenance = z.enum([
  "observed",
  "self-reported",
  "model-inferred",
  "unknown",
]);
const source = z.enum([
  "own-play",
  "participant-play",
  "simulation",
  "authorised-external",
  "synthetic-example",
]);
const evidenceURL = z.union([
  z.literal(""),
  z
    .url()
    .max(1200)
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    }, "Use an HTTPS reference without credentials, query parameters or fragments. Do not include signed links."),
]);

export const studySchema = z.strictObject({
  id,
  title: short,
  protocolVersion: short,
  consentVersion: short,
  question: short,
  inclusion: short,
  measures: short,
  permittedMediaUse: text,
  retention: short,
  deletion: short,
  contact: text,
  informationText: text,
  reviewStatus: z.enum(["not-reviewed", "researcher-configured"]),
  publicRecruitment: z.literal(false),
  createdAt: timestamp,
});
export const configurationSchema = z.strictObject({
  id,
  studyId: id,
  label: short,
  equipment: short,
  properties: z
    .array(
      z.strictObject({
        name: short,
        value: finite.nullable(),
        unit: short,
        status: provenance,
        source: short,
      }),
    )
    .max(30),
  createdAt: timestamp,
});
export const sessionSchema = z.strictObject({
  id,
  studyId: id,
  configurationId: id,
  participantId: id,
  groupId: id,
  game: short,
  gameVersion: short,
  platform: short,
  experience: z.enum([
    "new",
    "some",
    "experienced",
    "unknown",
    "not-applicable",
  ]),
  encounter: short,
  conditions: short,
  durationSeconds: finite.positive().max(86400),
  source,
  evidenceKind: z.enum(["none", "local-file", "private-reference"]),
  evidenceRef: evidenceURL,
  mediaId: z.string().max(80),
  createdAt: timestamp,
  consent: z.strictObject({
    adultConfirmed: z.literal(true),
    participation: z.literal(true),
    mediaReuse: z.boolean(),
    mlProcessing: z.boolean(),
    version: short,
    recordedAt: timestamp,
  }),
});
export const eventSchema = z
  .strictObject({
    id,
    sessionId: id,
    startSeconds: finite.nonnegative(),
    endSeconds: finite.nonnegative(),
    label: short,
    components: z.array(short).min(1).max(20),
    outcome: short,
    note: text,
    provenance,
    verification: z.enum(["unreviewed", "verified", "uncertain"]),
    source: short,
    annotationVersion: z.literal(1),
    createdAt: timestamp,
  })
  .refine((row) => row.endSeconds > row.startSeconds, {
    message: "Event end must be after its start.",
    path: ["endSeconds"],
  });
const rating = z.number().int().min(1).max(5).nullable();
export const feedbackSchema = z.strictObject({
  id,
  sessionId: id,
  eventId: id.nullable(),
  intendedAction: short,
  occurred: short,
  control: rating,
  difficulty: rating,
  enjoyment: rating,
  suggestion: text,
  instrument: z.literal("custom-pilot-v1"),
  createdAt: timestamp,
});
export const comparisonSchema = z
  .strictObject({
    id,
    sessionA: id,
    sessionB: id,
    factorChanged: short,
    kind: z.enum(["observational-human", "controlled-simulation"]),
    order: short,
    startingStateRef: text,
    seedRef: text,
    controllerRef: text,
    outcomeNotes: short,
    createdAt: timestamp,
  })
  .superRefine((row, ctx) => {
    if (row.sessionA === row.sessionB)
      ctx.addIssue({
        code: "custom",
        message: "Choose two different sessions.",
      });
    if (
      row.kind === "controlled-simulation" &&
      (!row.startingStateRef.trim() ||
        !row.seedRef.trim() ||
        !row.controllerRef.trim())
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Controlled simulator pairs require starting-state, seed and controller references.",
      });
  });
export const reviewSchema = z.strictObject({
  id,
  eventId: id,
  reviewerId: id,
  originalLabel: short,
  correctedLabel: short,
  status: z.enum(["verified", "uncertain", "excluded"]),
  notes: short,
  annotationVersion: z.number().int().min(2).max(10000),
  createdAt: timestamp,
});
export const predictionSchema = z
  .strictObject({
    id,
    eventId: id,
    model: short,
    modelVersion: short,
    prompt: short,
    proposedLabel: short,
    startSeconds: finite.nonnegative(),
    endSeconds: finite.nonnegative(),
    confidence: finite.min(0).max(1).nullable(),
    limitations: short,
    verification: z.literal("unreviewed"),
    createdAt: timestamp,
  })
  .refine(
    (row) => row.endSeconds > row.startSeconds,
    "Prediction interval must increase.",
  );
export const datasetShape = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  instrumentVersion: z.literal(INSTRUMENT_VERSION),
  origin: z.enum(["synthetic", "local", "submitted"]),
  datasetId: id,
  createdAt: timestamp,
  studies: z.array(studySchema).max(20),
  configurations: z.array(configurationSchema).max(200),
  sessions: z.array(sessionSchema).max(200),
  events: z.array(eventSchema).max(2000),
  feedback: z.array(feedbackSchema).max(500),
  comparisons: z.array(comparisonSchema).max(200),
  reviews: z.array(reviewSchema).max(2000),
  predictions: z.array(predictionSchema).max(2000),
});
export type Dataset = z.infer<typeof datasetShape>;
export type Study = z.infer<typeof studySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type EventRecord = z.infer<typeof eventSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Origin = Dataset["origin"];
export const TABLES = [
  "studies",
  "configurations",
  "sessions",
  "events",
  "feedback",
  "comparisons",
  "reviews",
  "predictions",
] as const;

export const datasetSchema = datasetShape.superRefine((data, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  const maps = Object.fromEntries(
    TABLES.map((table) => [table, new Map(data[table].map((r) => [r.id, r]))]),
  ) as unknown as Record<(typeof TABLES)[number], Map<string, { id: string }>>;
  for (const table of TABLES)
    if (maps[table].size !== data[table].length)
      issue(`Duplicate IDs in ${table}.`);
  for (const c of data.configurations)
    if (!maps.studies.has(c.studyId))
      issue(`Configuration ${c.id}: study not found.`);
  for (const s of data.sessions) {
    const study = data.studies.find((row) => row.id === s.studyId);
    const configuration = data.configurations.find(
      (row) => row.id === s.configurationId,
    );
    if (!study || !configuration || configuration.studyId !== s.studyId)
      issue(`Session ${s.id}: study/configuration mismatch.`);
    if (study && s.consent.version !== study.consentVersion)
      issue(`Session ${s.id}: consent version mismatch.`);
    if ((data.origin === "synthetic") !== (s.source === "synthetic-example"))
      issue(`Session ${s.id}: synthetic and real origins cannot be mixed.`);
    if (s.evidenceKind === "private-reference" && !s.evidenceRef)
      issue(`Session ${s.id}: evidence reference is missing.`);
    if (s.evidenceKind !== "private-reference" && s.evidenceRef)
      issue(`Session ${s.id}: unexpected evidence reference.`);
  }
  for (const event of data.events) {
    const session = data.sessions.find((row) => row.id === event.sessionId);
    if (!session) issue(`Event ${event.id}: session not found.`);
    else if (event.endSeconds > session.durationSeconds)
      issue(`Event ${event.id}: interval exceeds session duration.`);
    if (
      event.verification === "verified" &&
      event.provenance === "model-inferred"
    )
      issue(
        `Event ${event.id}: a machine inference needs a separate human review.`,
      );
  }
  for (const feedback of data.feedback) {
    if (!maps.sessions.has(feedback.sessionId))
      issue(`Feedback ${feedback.id}: session not found.`);
    if (
      feedback.eventId &&
      !data.events.some(
        (e) => e.id === feedback.eventId && e.sessionId === feedback.sessionId,
      )
    )
      issue(`Feedback ${feedback.id}: event/session mismatch.`);
  }
  for (const pair of data.comparisons) {
    const a = data.sessions.find((s) => s.id === pair.sessionA);
    const b = data.sessions.find((s) => s.id === pair.sessionB);
    if (!a || !b || a.studyId !== b.studyId)
      issue(`Comparison ${pair.id}: missing session or mismatched study.`);
    if (
      pair.kind === "controlled-simulation" &&
      (a?.source !== "simulation" || b?.source !== "simulation")
    )
      issue(
        `Comparison ${pair.id}: controlled pairs require simulation sessions.`,
      );
  }
  const versions = new Map<string, number>();
  for (const review of data.reviews) {
    const event = data.events.find((e) => e.id === review.eventId);
    if (!event || event.label !== review.originalLabel)
      issue(`Review ${review.id}: original event label does not match.`);
    const last = versions.get(review.eventId) ?? 1;
    if (review.annotationVersion !== last + 1)
      issue(`Review ${review.id}: annotation versions must be consecutive.`);
    versions.set(review.eventId, review.annotationVersion);
  }
  for (const p of data.predictions) {
    const e = data.events.find((e) => e.id === p.eventId);
    const s = data.sessions.find((s) => s.id === e?.sessionId);
    if (!e || !s || p.endSeconds > s.durationSeconds)
      issue(`Prediction ${p.id}: invalid evidence interval or reference.`);
    if (s && !s.consent.mlProcessing)
      issue(`Prediction ${p.id}: ML-processing permission was not recorded.`);
  }
});

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function emptyDataset(origin: Origin = "local"): Dataset {
  return {
    schemaVersion: SCHEMA_VERSION,
    instrumentVersion: INSTRUMENT_VERSION,
    origin,
    datasetId: uid(),
    createdAt: now(),
    studies: [],
    configurations: [],
    sessions: [],
    events: [],
    feedback: [],
    comparisons: [],
    reviews: [],
    predictions: [],
  };
}
export function studyTemplate(): Study {
  return {
    id: uid(),
    title: "Personal gameplay pilot",
    protocolVersion: "pilot-1",
    consentVersion: "pilot-info-1",
    question:
      "How can timestamped observations and configuration records support reliable interaction annotation?",
    inclusion:
      "Adult researcher documenting their own permitted gameplay; no participant recruitment.",
    measures:
      "Event intervals, action completion, reported experience, missingness and annotation effort.",
    permittedMediaUse:
      "Local annotation only. Optional reuse and ML processing require separate permission.",
    retention:
      "Personal pilot: retain on this device until manually deleted; export backups under your control.",
    deletion:
      "Delete sessions in the workspace and remove exported backups separately. Local files are never deleted by this app.",
    contact: "",
    informationText:
      "Draft personal-pilot information, not an institution-approved consent instrument. Participation is optional. Local data stays in this browser until you export or explicitly submit it. Do not include names, chat logs, voices or third-party identities without permission.",
    reviewStatus: "not-reviewed",
    publicRecruitment: false,
    createdAt: now(),
  };
}
export function checked(data: unknown): Dataset {
  return datasetSchema.parse(data);
}
export function parseDataset(raw: string, expectedOrigin?: Origin): Dataset {
  if (new TextEncoder().encode(raw).length > 2_000_000)
    throw new Error("Dataset exceeds the 2 MB import limit.");
  const result = checked(JSON.parse(raw));
  if (expectedOrigin && result.origin !== expectedOrigin)
    throw new Error(
      `This workspace accepts ${expectedOrigin} records only. Origin labels cannot be changed on import.`,
    );
  return result;
}
export function latestReview(data: Dataset, eventId: string) {
  return data.reviews.filter((r) => r.eventId === eventId).at(-1);
}
export function warnings(data: Dataset): string[] {
  const result: string[] = [];
  for (const session of data.sessions) {
    if (
      ["gameVersion", "encounter", "conditions"].some(
        (key) => session[key as keyof Session] === "unknown",
      )
    )
      result.push(`${session.id}: some session context is unknown.`);
    if (!data.events.some((e) => e.sessionId === session.id))
      result.push(`${session.id}: no events annotated.`);
    if (!data.feedback.some((f) => f.sessionId === session.id))
      result.push(`${session.id}: feedback missing.`);
    if (session.evidenceKind === "none")
      result.push(
        `${session.id}: no recording or evidence reference attached.`,
      );
  }
  const seen = new Set<string>();
  for (const e of data.events) {
    const signature = `${e.sessionId}|${e.startSeconds}|${e.endSeconds}|${e.label}`;
    if (seen.has(signature))
      result.push(
        `${e.id}: potential duplicate event; inspect before inclusion.`,
      );
    seen.add(signature);
    if (!latestReview(data, e.id))
      result.push(`${e.id}: researcher review pending.`);
  }
  return result;
}
export function deleteSession(data: Dataset, sessionId: string): Dataset {
  const events = new Set(
    data.events.filter((e) => e.sessionId === sessionId).map((e) => e.id),
  );
  return checked({
    ...data,
    sessions: data.sessions.filter((s) => s.id !== sessionId),
    events: data.events.filter((e) => !events.has(e.id)),
    feedback: data.feedback.filter((f) => f.sessionId !== sessionId),
    comparisons: data.comparisons.filter(
      (p) => p.sessionA !== sessionId && p.sessionB !== sessionId,
    ),
    reviews: data.reviews.filter((r) => !events.has(r.eventId)),
    predictions: data.predictions.filter((p) => !events.has(p.eventId)),
  });
}
export function splitGroups(data: Dataset) {
  const parents = new Map(data.sessions.map((s) => [s.id, s.id]));
  const root = (id: string): string => {
    const p = parents.get(id)!;
    return p === id ? id : root(p);
  };
  const join = (a: string, b: string) => {
    parents.set(root(b), root(a));
  };
  for (let i = 0; i < data.sessions.length; i++)
    for (let j = 0; j < i; j++) {
      const a = data.sessions[i],
        b = data.sessions[j];
      if (a.participantId === b.participantId || a.groupId === b.groupId)
        join(a.id, b.id);
    }
  for (const p of data.comparisons) join(p.sessionA, p.sessionB);
  return data.sessions.map((s) => ({
    sessionId: s.id,
    participantId: s.participantId,
    sourceGroup: s.groupId,
    leakageGroup: `group-${root(s.id)}`,
    partition: "unassigned",
  }));
}
export function filterConfiguration(
  data: Dataset,
  configurationId: string,
): Dataset {
  if (configurationId === "all") return data;
  let filtered = data;
  for (const session of data.sessions)
    if (session.configurationId !== configurationId)
      filtered = deleteSession(filtered, session.id);
  return filtered;
}
export function assertStudyRevision(data: Dataset, replacement: Study) {
  const previous = data.studies.find((s) => s.id === replacement.id);
  if (previous && data.sessions.some((s) => s.studyId === replacement.id)) {
    const withoutContact = (s: Study) => ({ ...s, contact: "" });
    if (
      JSON.stringify(withoutContact(previous)) !==
      JSON.stringify(withoutContact(replacement))
    )
      throw new Error(
        "This protocol is already linked to sessions. Create a new study rather than rewriting the information previously shown. Only the operational contact can be updated.",
      );
  }
}
