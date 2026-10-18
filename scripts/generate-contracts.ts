import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { datasetShape, studyTemplate } from "../src/domain";
import { DICTIONARY } from "../src/exports";
await mkdir("public", { recursive: true });
const template = {
  ...studyTemplate(),
  id: "personal-pilot-template",
  createdAt: "2026-10-18T00:00:00.000Z",
};
await writeFile(
  "public/study-template.json",
  JSON.stringify(template, null, 2) + "\n",
);
await writeFile(
  "docs/data-dictionary.json",
  JSON.stringify(DICTIONARY, null, 2) + "\n",
);
await writeFile(
  "docs/dataset.schema.json",
  JSON.stringify(z.toJSONSchema(datasetShape), null, 2) + "\n",
);
console.log(
  "Wrote public study template, dictionary and structural JSON Schema. Cross-record invariants remain in domain.ts.",
);
