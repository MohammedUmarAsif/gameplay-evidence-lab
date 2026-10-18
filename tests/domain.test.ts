import test from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { demoDataset } from "../src/demo";
import {
  checked,
  deleteSession,
  parseDataset,
  splitGroups,
  warnings,
  now,
  filterConfiguration,
  assertStudyRevision,
  type Dataset,
} from "../src/domain";
import { csv, exportEnvelope, exportZip, importEnvelope } from "../src/exports";
import { validatePublicEnvironment } from "../build/public-config";
import { describeDataset, intervalUnion } from "../src/analytics";
import { checkRecordingDuration } from "../src/media";
import { loadLocal, saveLocal, eraseLocal, LOCAL_KEY } from "../src/storage";

test("synthetic example has valid references, explicit missingness and correct origin", () => {
  const data = checked(demoDataset());
  assert.equal(data.sessions.length, 2);
  assert.equal(data.events.length, 2);
  assert.ok(warnings(data).some((w) => w.includes("feedback missing")));
  assert.equal(data.feedback[0].enjoyment, null);
});
test("invalid intervals, orphan references and duplicate IDs are rejected", () => {
  for (const alter of [
    (d: Dataset) => {
      d.events[0].endSeconds = 500;
    },
    (d: Dataset) => {
      d.events[0].sessionId = "orphan";
    },
    (d: Dataset) => {
      d.sessions.push(d.sessions[0]);
    },
    (d: Dataset) => {
      d.events[0].endSeconds = d.events[0].startSeconds;
    },
  ]) {
    const data = demoDataset();
    alter(data);
    assert.throws(() => checked(data));
  }
});
test("strict schema rejects extra identity fields and non-finite numeric properties", () => {
  const data = demoDataset();
  assert.throws(() => checked({ ...data, email: "not-allowed" }));
  data.configurations[0].properties[0].value = NaN;
  assert.throws(() => checked(data));
});
test("synthetic, local and submitted origins cannot silently mix", () => {
  const data = demoDataset();
  assert.throws(() => checked({ ...data, origin: "local" }));
  assert.throws(() => parseDataset(JSON.stringify(data), "local"));
});
test("consent versions are linked and required participation cannot be false", () => {
  const data = demoDataset();
  data.studies[0].consentVersion = "new";
  assert.throws(() => checked(data));
  const d = demoDataset();
  assert.throws(() =>
    checked({
      ...d,
      sessions: [
        {
          ...d.sessions[0],
          consent: { ...d.sessions[0].consent, participation: false },
        },
      ],
    }),
  );
});
test("private evidence references reject signed query strings, credentials and unsafe schemes", () => {
  for (const url of [
    "https://example.org/clip?token=secret",
    "https://name:pass@example.org/clip",
    "javascript:alert(1)",
    "http://example.org/clip",
  ]) {
    const d = demoDataset();
    d.sessions[0].evidenceKind = "private-reference";
    d.sessions[0].evidenceRef = url;
    assert.throws(() => checked(d));
  }
});
test("review corrections preserve raw labels and enforce consecutive versions", () => {
  const d = demoDataset(),
    event = d.events[0];
  d.reviews.push({
    id: "review-a",
    eventId: event.id,
    reviewerId: "reviewer",
    originalLabel: event.label,
    correctedLabel: "Action uncertain",
    status: "uncertain",
    notes: "Frame evidence incomplete",
    annotationVersion: 2,
    createdAt: now(),
  });
  checked(d);
  assert.equal(d.events[0].label, "Attack interrupted");
  d.reviews[0].annotationVersion = 4;
  assert.throws(() => checked(d));
});
test("machine predictions require explicit permission and remain separate", () => {
  const d = demoDataset();
  d.predictions.push({
    id: "prediction-a",
    eventId: d.events[0].id,
    model: "test-model",
    modelVersion: "1",
    prompt: "label observed events",
    proposedLabel: "Possible action",
    startSeconds: 12,
    endSeconds: 14,
    confidence: null,
    limitations: "Unvalidated annotation only",
    verification: "unreviewed",
    createdAt: now(),
  });
  assert.throws(() => checked(d));
  d.sessions[0].consent.mlProcessing = true;
  checked(d);
  assert.equal(d.events[0].label, "Attack interrupted");
});
test("human sessions cannot be declared controlled simulator pairs", () => {
  const d = demoDataset();
  d.comparisons.push({
    id: "pair-a",
    sessionA: d.sessions[0].id,
    sessionB: d.sessions[1].id,
    factorChanged: "recovery",
    kind: "controlled-simulation",
    order: "A/B",
    startingStateRef: "state",
    seedRef: "1",
    controllerRef: "policy1",
    outcomeNotes: "Fixture",
    createdAt: now(),
  });
  assert.throws(() => checked(d));
});
test("session deletion cascades to observations and related records", () => {
  const d = deleteSession(demoDataset(), "demo-session-1");
  assert.equal(d.sessions.length, 1);
  assert.equal(d.events.length, 1);
  assert.equal(d.feedback.length, 0);
  checked(d);
});
test("duplicate event warnings do not silently remove raw observations", () => {
  const d = demoDataset();
  d.events.push({ ...d.events[0], id: "duplicate-content" });
  checked(d);
  assert.ok(warnings(d).some((w) => w.includes("potential duplicate")));
});
test("connected grouping keeps shared players and comparison pairs together", () => {
  const d = demoDataset();
  assert.equal(new Set(splitGroups(d).map((g) => g.leakageGroup)).size, 1);
  d.sessions[1].participantId = "different-player";
  d.sessions[1].groupId = "different-episode";
  assert.equal(new Set(splitGroups(d).map((g) => g.leakageGroup)).size, 2);
  d.comparisons.push({
    id: "pair",
    sessionA: d.sessions[0].id,
    sessionB: d.sessions[1].id,
    factorChanged: "equipment",
    kind: "observational-human",
    order: "A then B",
    startingStateRef: "",
    seedRef: "",
    controllerRef: "",
    outcomeNotes: "Observational only",
    createdAt: now(),
  });
  assert.equal(
    new Set(splitGroups(checked(d)).map((g) => g.leakageGroup)).size,
    1,
  );
});
test("JSON export roundtrip preserves every relationship and detects tampering", async () => {
  const d = demoDataset(),
    envelope = await exportEnvelope(d);
  assert.deepEqual(
    await importEnvelope(JSON.stringify(envelope), "synthetic"),
    { ...d, studies: d.studies.map((s) => ({ ...s, contact: "" })) },
  );
  envelope.dataset.events[0].label = "changed";
  await assert.rejects(
    () => importEnvelope(JSON.stringify(envelope), "synthetic"),
    /checksum/,
  );
});
test("export ZIP contains related CSVs, dictionary, grouping and no recording bytes", async () => {
  const files = unzipSync(await exportZip(demoDataset()));
  for (const name of [
    "dataset.json",
    "studies.csv",
    "configurations.csv",
    "sessions.csv",
    "events.csv",
    "feedback.csv",
    "comparisons.csv",
    "reviews.csv",
    "predictions.csv",
    "split_groups.csv",
    "manifest.json",
    "data-dictionary.json",
  ])
    assert.ok(files[name], name);
  assert.ok(!Object.keys(files).some((name) => /mp4|webm/.test(name)));
  assert.ok(
    strFromU8(files["data-dictionary.json"]).includes(
      "not a validated train/test split",
    ),
  );
});
test("CSV escapes formulas, embedded quotes and newlines", () => {
  const output = csv([
    { note: "=SUM(1,2)", quote: 'a"b', lines: "a\nb", value: -3 },
  ]);
  assert.ok(output.includes("'=SUM"));
  assert.ok(output.includes('a""b'));
  assert.ok(output.includes('"a\nb"'));
  assert.ok(output.includes('"-3"'));
});
test("oversized imports are rejected before parsing", () =>
  assert.throws(() => parseDataset(" ".repeat(2_000_001)), /2 MB/));
test("configuration filter retains matching relationships and missingness without altering the source", () => {
  const d = demoDataset(),
    filtered = filterConfiguration(d, "demo-b");
  assert.equal(filtered.sessions.length, 1);
  assert.equal(filtered.events.length, 1);
  assert.equal(filtered.feedback.length, 0);
  assert.equal(d.sessions.length, 2);
  checked(filtered);
});
test("study contact is removed from JSON and CSV exports without mutating local records", async () => {
  const d = demoDataset();
  d.studies[0].contact = "DO_NOT_EXPORT_STUDY_CONTACT";
  const json = await exportEnvelope(d);
  assert.equal(json.dataset.studies[0].contact, "");
  assert.equal(d.studies[0].contact, "DO_NOT_EXPORT_STUDY_CONTACT");
  const zip = unzipSync(await exportZip(d));
  assert.ok(
    !strFromU8(zip["studies.csv"]).includes("DO_NOT_EXPORT_STUDY_CONTACT"),
  );
});
test("a used study protocol cannot silently rewrite information already shown", () => {
  const d = demoDataset();
  assert.throws(
    () =>
      assertStudyRevision(d, {
        ...d.studies[0],
        informationText: "different information",
      }),
    /already linked/,
  );
  assert.doesNotThrow(() =>
    assertStudyRevision(d, {
      ...d.studies[0],
      contact: "Updated operational contact",
    }),
  );
});
test("public build configuration rejects secret-like variables and admin-role keys", () => {
  assert.throws(
    () => validatePublicEnvironment({ VITE_ADMIN_TOKEN: "disposable-fake" }),
    /secret-like/,
  );
  const key = `e30.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.fake`;
  assert.throws(
    () => validatePublicEnvironment({ VITE_SUPABASE_PUBLISHABLE_KEY: key }),
    /not a publishable/,
  );
  assert.doesNotThrow(() =>
    validatePublicEnvironment({ VITE_COLLECTION_ENABLED: "false" }),
  );
});

test("coverage unions nested, touching and overlapping intervals without mutating originals", () => {
  const rows = [
    { startSeconds: 5, endSeconds: 9 },
    { startSeconds: 1, endSeconds: 6 },
    { startSeconds: 2, endSeconds: 3 },
    { startSeconds: 9, endSeconds: 10 },
  ];
  const before = structuredClone(rows);
  assert.equal(intervalUnion(rows), 9);
  assert.equal(intervalUnion([]), 0);
  assert.deepEqual(rows, before);
});

test("analysis keeps empty denominators unavailable and ordinal missingness explicit", () => {
  const d = demoDataset();
  const summary = describeDataset(d);
  assert.equal(summary.coverage.sessionSeconds, 240);
  assert.ok(Math.abs(summary.coverage.annotatedSeconds - 6.4) < 1e-10);
  assert.deepEqual(summary.reviewCounts, {
    pending: 2,
    verified: 0,
    uncertain: 0,
    excluded: 0,
  });
  assert.equal(summary.ratings[0].bins[1].count, 1);
  assert.equal(summary.ratings[2].missing, 1);
  assert.equal(
    summary.ratings[2].bins.reduce((sum, row) => sum + row.count, 0),
    0,
  );
  const empty = deleteSession(
    deleteSession(d, d.sessions[0].id),
    d.sessions[1].id,
  );
  assert.equal(describeDataset(empty).coverage.fraction, null);
});

test("latest human review determines descriptive decision while raw labels survive", () => {
  const d = demoDataset();
  for (const [index, status] of (["verified", "excluded"] as const).entries())
    d.reviews.push({
      id: `review-${index}`,
      eventId: d.events[0].id,
      reviewerId: "pilot-reviewer",
      originalLabel: d.events[0].label,
      correctedLabel: "Reviewed action",
      status,
      notes: "Pilot review",
      annotationVersion: index + 2,
      createdAt: now(),
    });
  const result = describeDataset(d);
  assert.equal(result.reviewCounts.excluded, 1);
  assert.equal(result.reviewCounts.verified, 0);
  assert.equal(result.eventRows[0].rawLabel, "Attack interrupted");
  assert.equal(result.eventRows[0].annotationVersion, 3);
  assert.equal(result.eventRows[0].reviewedLabel, "Reviewed action");
});

test("ZIP summaries reproduce the checked full dataset and have empty-table headers", async () => {
  const d = demoDataset(),
    zip = unzipSync(await exportZip(d));
  const { sourceDatasetSHA256, scope, ...summary } = JSON.parse(
    strFromU8(zip["descriptive-summary.json"]),
  );
  assert.deepEqual(summary, describeDataset(d));
  assert.equal(scope, "whole-exported-workspace");
  assert.equal(
    sourceDatasetSHA256,
    JSON.parse(strFromU8(zip["manifest.json"])).datasetSHA256,
  );
  assert.match(
    strFromU8(zip["event_review_status.csv"]),
    /rawLabel.*reviewedLabel/,
  );
  const empty = deleteSession(
    deleteSession(d, d.sessions[0].id),
    d.sessions[1].id,
  );
  const emptyZip = unzipSync(await exportZip(empty));
  assert.match(
    strFromU8(emptyZip["session_coverage.csv"]),
    /sessionId.*annotatedSeconds/,
  );
});

test("clip duration rejects mismatches and distinguishes unknown metadata from matches", () => {
  assert.equal(checkRecordingDuration(10.03, 10), "matched");
  assert.equal(checkRecordingDuration(Infinity, 10), "unknown");
  assert.throws(() => checkRecordingDuration(2, 10), /Nothing was attached/);
  assert.throws(() => checkRecordingDuration(0, 10), /Nothing was attached/);
});

test("stale local snapshots cannot overwrite or erase newer saved records", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  try {
    const first = loadLocal().data;
    saveLocal(first);
    const later = { ...first, createdAt: "2026-10-18T01:00:00.000Z" };
    storage.set(LOCAL_KEY, JSON.stringify(later));
    assert.throws(() => saveLocal(first), /another tab/);
    assert.throws(() => eraseLocal(), /another tab/);
    assert.equal(storage.get(LOCAL_KEY), JSON.stringify(later));
    assert.deepEqual(loadLocal().data, later);
    saveLocal(later);
    storage.set(LOCAL_KEY, "damaged raw data");
    assert.ok(loadLocal().error);
    assert.equal(storage.get(LOCAL_KEY), "damaged raw data");
    eraseLocal();
    assert.equal(storage.get(LOCAL_KEY), undefined);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
