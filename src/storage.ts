import { checked, emptyDataset, parseDataset, type Dataset } from "./domain";
export const LOCAL_KEY = "gameplay-evidence-lab:local:v1";
let baseline: string | null | undefined;
export function assertLocalUnchanged() {
  if (baseline === undefined || localStorage.getItem(LOCAL_KEY) !== baseline)
    throw new Error(
      "Local records changed in another tab. Export this tab’s snapshot if needed, then reload saved local records before saving. No data was overwritten.",
    );
}
export function loadLocal(): { data: Dataset; error?: string } {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    baseline = raw;
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
  assertLocalUnchanged();
  const raw = JSON.stringify(data);
  localStorage.setItem(LOCAL_KEY, raw);
  baseline = raw;
}
export function eraseLocal() {
  assertLocalUnchanged();
  localStorage.removeItem(LOCAL_KEY);
  baseline = null;
}
