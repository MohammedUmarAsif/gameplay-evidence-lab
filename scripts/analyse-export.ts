import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pilotInput } from "./pilot-input";
const envelope = await pilotInput(process.argv[2]);
const db = new PGlite();
try {
  await db.exec("CREATE TABLE pilot_dataset(payload jsonb NOT NULL)");
  await db.query("INSERT INTO pilot_dataset VALUES ($1::jsonb)", [
    JSON.stringify(envelope.dataset),
  ]);
  const query = await readFile(
    new URL("../analysis/pilot-summary.sql", import.meta.url),
    "utf8",
  );
  const result = await db.query(query);
  console.log(
    JSON.stringify(
      {
        origin: envelope.dataset.origin,
        sourceDatasetSHA256: envelope.exportMetadata.datasetSHA256,
        queryVersion: "pilot-summary-v1",
        notes:
          "Descriptive configuration aggregates. Missing enjoyment is per feedback response; sessions without feedback are separate. Counts are not independent participants.",
        rows: result.rows,
      },
      null,
      2,
    ),
  );
} finally {
  await db.close();
}
