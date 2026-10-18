import { checked, emptyDataset, studyTemplate, type Dataset } from "./domain";
export function demoDataset(): Dataset {
  const data = emptyDataset("synthetic");
  const study = {
    ...studyTemplate(),
    id: "demo-study",
    title: "Action commitment observation",
    contact: "No study contact: synthetic demonstration only.",
  };
  data.studies = [study];
  data.configurations = [
    {
      id: "demo-a",
      studyId: study.id,
      label: "Configuration A",
      equipment: "Fictional training blade; standard recovery",
      properties: [
        {
          name: "Recovery duration",
          value: null,
          unit: "seconds",
          status: "unknown",
          source: "Synthetic example; not a game statistic",
        },
      ],
      createdAt: data.createdAt,
    },
    {
      id: "demo-b",
      studyId: study.id,
      label: "Configuration B",
      equipment: "Fictional training blade; alternate recovery",
      properties: [],
      createdAt: data.createdAt,
    },
  ];
  data.sessions = [0, 1].map((n) => ({
    id: `demo-session-${n + 1}`,
    studyId: study.id,
    configurationId: n ? "demo-b" : "demo-a",
    participantId: "synthetic-person",
    groupId: "synthetic-group",
    game: "Example RPG (fictional)",
    gameVersion: "synthetic-1",
    platform: "PC",
    experience: n ? "unknown" : "some",
    encounter: "Training encounter",
    conditions: "Illustrative observation; no real gameplay measurement",
    durationSeconds: 120,
    source: "synthetic-example",
    evidenceKind: "none",
    evidenceRef: "",
    mediaId: "",
    createdAt: data.createdAt,
    consent: {
      adultConfirmed: true,
      participation: true,
      mediaReuse: false,
      mlProcessing: false,
      version: study.consentVersion,
      recordedAt: data.createdAt,
    },
  }));
  data.events = [
    {
      id: "demo-event-1",
      sessionId: "demo-session-1",
      startSeconds: 12.4,
      endSeconds: 15.8,
      label: "Attack interrupted",
      components: ["action:committed-attack", "encounter:incoming-attack"],
      outcome: "Action did not complete",
      note: "Synthetic annotation for exploring the review workflow. No clip or result was collected.",
      provenance: "observed",
      verification: "unreviewed",
      source: "Synthetic example",
      annotationVersion: 1,
      createdAt: data.createdAt,
    },
    {
      id: "demo-event-2",
      sessionId: "demo-session-2",
      startSeconds: 21,
      endSeconds: 24,
      label: "Recovery followed by dodge",
      components: ["action:recovery", "action:dodge"],
      outcome: "Outcome unknown",
      note: "Deliberately incomplete synthetic example.",
      provenance: "unknown",
      verification: "uncertain",
      source: "Synthetic example",
      annotationVersion: 1,
      createdAt: data.createdAt,
    },
  ];
  data.feedback = [
    {
      id: "demo-feedback",
      sessionId: "demo-session-1",
      eventId: "demo-event-1",
      intendedAction: "Complete the attack then move away",
      occurred: "The action was interrupted",
      control: 2,
      difficulty: 4,
      enjoyment: null,
      suggestion: "I would like a clearer recovery cue.",
      instrument: "custom-pilot-v1",
      createdAt: data.createdAt,
    },
  ];
  return checked(data);
}
