import { runBaseline } from "../src/learning";
import { pilotInput } from "./pilot-input";
const envelope = await pilotInput(process.argv[2]);
const studyId =
  process.argv[3] ??
  (envelope.dataset.studies.length === 1 ? envelope.dataset.studies[0].id : "");
if (!studyId) throw new Error("Specify the study ID after the export path.");
console.log(
  JSON.stringify(
    {
      ...runBaseline(envelope.dataset, studyId),
      sourceDatasetSHA256: envelope.exportMetadata.datasetSHA256,
    },
    null,
    2,
  ),
);
