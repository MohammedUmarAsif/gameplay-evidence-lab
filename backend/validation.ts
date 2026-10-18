import {
  checked,
  studySchema,
  type Dataset,
  type Study,
} from "../src/domain.ts";
export type StudyGate = {
  active: boolean;
  study: Study;
  allowedOrigin: string;
};
export function validateSubmission(input: unknown, gate: StudyGate): Dataset {
  const data = checked(input);
  if (!gate.active)
    throw new Error("Study collection is disabled on the server.");
  if (data.origin !== "local")
    throw new Error("Only real local pilot records can be submitted.");
  if (
    data.studies.length !== 1 ||
    JSON.stringify(data.studies[0]) !==
      JSON.stringify(studySchema.parse(gate.study))
  )
    throw new Error("Use the exact researcher-issued study configuration.");
  const study = data.studies[0];
  if (
    !study.contact.trim() ||
    !study.informationText.trim() ||
    study.reviewStatus !== "researcher-configured"
  )
    throw new Error(
      "Study contact, information and researcher configuration are required.",
    );
  if (
    data.sessions.length < 1 ||
    data.sessions.length > 20 ||
    data.events.length > 200 ||
    data.reviews.length ||
    data.predictions.length
  )
    throw new Error(
      "Submit 1–20 sessions, at most 200 events, and no researcher reviews or model suggestions.",
    );
  if (
    data.sessions.some(
      (s) => !["own-play", "participant-play"].includes(s.source),
    )
  )
    throw new Error(
      "This private human pilot accepts own or invited participant play only.",
    );
  if (
    data.sessions.some(
      (s) => s.evidenceKind === "private-reference" && !s.consent.mediaReuse,
    )
  )
    throw new Error(
      "Private reference sharing requires optional media-reuse permission.",
    );
  if (new TextEncoder().encode(JSON.stringify(data)).length > 500_000)
    throw new Error(
      "Submission exceeds 500 KB. No media uploads are supported.",
    );
  return data;
}
