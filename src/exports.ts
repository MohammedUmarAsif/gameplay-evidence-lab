import { zipSync, strToU8 } from "fflate";
import {
  checked,
  parseDataset,
  splitGroups,
  TABLES,
  datasetShape,
  type Dataset,
} from "./domain";

export const DICTIONARY = {
  schemaVersion: "1.0.0",
  units: {
    "sessions.durationSeconds": "seconds",
    "events.startSeconds": "seconds from clip/session start",
    "events.endSeconds": "seconds, exclusive interval end",
    "configurations.properties.value":
      "numeric or null; unit required per property",
    "feedback.control": "1 very little to 5 very much; null = not answered",
    "feedback.difficulty":
      "1 very easy to 5 very difficult; null = not answered",
    "feedback.enjoyment": "1 not at all to 5 very much; null = not answered",
    "predictions.confidence":
      "0 to 1 model-reported score, NOT calibrated probability",
  },
  tables: {
    studies:
      "id PK; protocolVersion and consentVersion identify information shown; publicRecruitment is always false.",
    configurations:
      "id PK; studyId FK studies.id; equipment is raw description; properties contain units, source and observation status.",
    sessions:
      "id PK; studyId FK; configurationId FK; participantId pseudonym; groupId episode/source grouping; consent is the recorded choice, not proof of institutional approval. mediaId is a local opaque reference, never video bytes.",
    events:
      "id PK; sessionId FK; label/outcome/note are original observations; components are researcher-supplied typed strings. Intervals must lie inside sessions. annotationVersion stays 1.",
    feedback:
      "id PK; sessionId FK; optional eventId FK within that session. Custom pilot questions, not a validated psychological scale. Raw text is never paraphrased.",
    comparisons:
      "id PK; sessionA/sessionB FK. Human observations do not establish identical states or causal effects. Controlled simulations require state/seed/controller references.",
    reviews:
      "id PK; eventId FK; append-only originalLabel/correctedLabel, decision, notes, timestamp and consecutive annotationVersion. Latest version is a reviewed label, not a replacement raw report.",
    predictions:
      "id PK; eventId FK; separate imported machine suggestion with model/version/prompt/interval/limitations. Always unreviewed; ML permission required.",
    split_groups:
      "Connected sessions sharing a participant, source group or comparison pair. Keep entire leakageGroup together. Partition is intentionally unassigned; this is not a validated train/test split.",
  },
  limitations: [
    "No hidden engine telemetry is inferred.",
    "Own-play and convenience samples do not represent a population.",
    "Synthetic data are never empirical findings.",
    "Exports contain free text and may contain private evidence references. Review them before sharing. No contact/account fields or video bytes are included.",
  ],
};
export function csv(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  const keys =
    columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (value: unknown) => {
    let s =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    if (typeof value === "string" && /^[\s]*[=+@\-]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n")
  );
}
export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function exportEnvelope(data: Dataset) {
  const validated = checked({
    ...data,
    studies: data.studies.map((study) => ({ ...study, contact: "" })),
  });
  return {
    exportMetadata: {
      format: "gameplay-evidence-export",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      datasetSHA256: await digest(JSON.stringify(validated)),
      counts: Object.fromEntries(TABLES.map((t) => [t, validated[t].length])),
      origin: validated.origin,
      containsVideo: false,
      containsAccountIdentity: false,
      redactions: ["studies.contact"],
    },
    dataset: validated,
  };
}
export async function importEnvelope(
  raw: string,
  origin: Dataset["origin"],
): Promise<Dataset> {
  if (new TextEncoder().encode(raw).length > 2_000_000)
    throw new Error("Dataset exceeds the 2 MB import limit.");
  const envelope = JSON.parse(raw);
  if (
    !envelope?.exportMetadata ||
    envelope.exportMetadata.format !== "gameplay-evidence-export" ||
    envelope.exportMetadata.formatVersion !== 1
  )
    throw new Error("Choose a version 1 Gameplay Evidence JSON export.");
  const data = parseDataset(JSON.stringify(envelope.dataset), origin);
  if (
    envelope.exportMetadata.datasetSHA256 !==
    (await digest(JSON.stringify(data)))
  )
    throw new Error(
      "Dataset checksum differs. The file may have been modified or damaged.",
    );
  for (const table of TABLES)
    if (envelope.exportMetadata.counts?.[table] !== data[table].length)
      throw new Error("Export manifest record counts do not match.");
  if (envelope.exportMetadata.origin !== origin)
    throw new Error("Export origin does not match this workspace.");
  return data;
}
export async function exportZip(data: Dataset): Promise<Uint8Array> {
  const envelope = await exportEnvelope(data);
  const exported = envelope.dataset;
  const files: Record<string, Uint8Array> = {
    "dataset.json": strToU8(JSON.stringify(envelope, null, 2)),
    "data-dictionary.json": strToU8(JSON.stringify(DICTIONARY, null, 2)),
    "manifest.json": strToU8(JSON.stringify(envelope.exportMetadata, null, 2)),
    "README.txt": strToU8(
      `Gameplay Evidence Lab\nOrigin: ${data.origin}\nReimport dataset.json. CSVs are analysis views, not the reimport format. Nested fields are JSON cells. Spreadsheet-formula prefixes are escaped. Videos and account identity are excluded. Study contact fields are blanked by default; restore the researcher-issued protocol before any central submission. Free text and evidence references may still be identifying. Keep raw and reviewed labels separate. Split groups are connected components, not assigned train/test partitions.\n`,
    ),
  };
  for (const table of TABLES) {
    const columns = Object.keys(datasetShape.shape[table].element.shape);
    files[`${table}.csv`] = strToU8(
      csv(exported[table] as unknown as Record<string, unknown>[], columns),
    );
  }
  files["split_groups.csv"] = strToU8(csv(splitGroups(data)));
  return zipSync(files);
}
export function download(
  name: string,
  value: string | Uint8Array,
  type: string,
) {
  const blob = new Blob(
    [typeof value === "string" ? value : new Uint8Array(value).buffer],
    { type },
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
