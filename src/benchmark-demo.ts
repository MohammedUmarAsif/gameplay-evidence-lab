import { demoDataset } from "./demo";
import { checked, TABLES } from "./domain";
export function benchmarkDemo() {
  const data = demoDataset();
  data.datasetId = "synthetic-baseline-fixture-v1";
  data.sessions = [];
  data.events = [];
  data.reviews = [];
  data.feedback = [];
  for (let g = 0; g < 4; g++) {
    const id = `fixture-session-${g}`;
    data.sessions.push({
      ...demoDataset().sessions[0],
      id,
      participantId: `fictional-player-${g}`,
      groupId: `fictional-source-${g}`,
      consent: { ...demoDataset().sessions[0].consent, mlProcessing: true },
    });
    for (let i = 0; i < 6; i++) {
      const eventId = `${id}-event-${i}`,
        interrupted = i % 2 === 0;
      const label = interrupted ? "Interrupted action" : "Completed action";
      data.events.push({
        ...demoDataset().events[0],
        id: eventId,
        sessionId: id,
        startSeconds: i * 10,
        endSeconds: i * 10 + 2,
        label,
        components: [
          "weapon:fictional-training-blade",
          interrupted ? "condition:incoming-strike" : "condition:clear-window",
        ],
        outcome: label,
        source:
          "Deliberately constructed synthetic fixture; not Monster Hunter mechanics",
        note: "Artificially separable labels for pipeline verification only.",
      });
      data.reviews.push({
        id: `${eventId}-review`,
        eventId,
        reviewerId: "synthetic-reviewer",
        originalLabel: label,
        correctedLabel: label,
        status: "verified",
        notes: "Synthetic review fixture, not independent human agreement.",
        annotationVersion: 2,
        createdAt: data.createdAt,
      });
    }
  }
  // Fixed fictional metadata makes the fixture reproducible, not a collected timestamp.
  const timestamp = "2026-10-22T00:00:00.000Z";
  data.createdAt = timestamp;
  for (const table of TABLES)
    for (const row of data[table]) row.createdAt = timestamp;
  for (const session of data.sessions) session.consent.recordedAt = timestamp;
  return checked(data);
}
