import { checked, emptyDataset, parseDataset, type Dataset } from "./domain";
export const LOCAL_KEY = "gameplay-evidence-lab:local:v1";
export function loadLocal(): { data: Dataset; error?: string } {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return { data: raw ? parseDataset(raw, "local") : emptyDataset() };
  } catch {
    return {
      data: emptyDataset(),
      error:
        "Saved data could not be read. The original storage entry has been preserved. Export/recover it before replacing it.",
    };
  }
}
export function saveLocal(data: Dataset) {
  checked(data);
  if (data.origin !== "local")
    throw new Error("Only local records may enter local pilot storage.");
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}
