import { readFile, stat } from "node:fs/promises";
import { benchmarkDemo } from "../src/benchmark-demo";
import { importEnvelope, exportEnvelope } from "../src/exports";

export async function pilotInput(argument?: string) {
  if (argument === "--synthetic") return exportEnvelope(benchmarkDemo());
  if (!argument)
    throw new Error(
      "Specify --synthetic or a private validated JSON-export path.",
    );
  if ((await stat(argument)).size > 2_000_000)
    throw new Error("Dataset exceeds 2 MB.");
  const raw = await readFile(argument, "utf8"),
    parsed = JSON.parse(raw);
  const origin = parsed?.dataset?.origin;
  if (!["synthetic", "local", "submitted"].includes(origin))
    throw new Error("Unknown export origin.");
  const dataset = await importEnvelope(raw, origin);
  return exportEnvelope(dataset);
}
