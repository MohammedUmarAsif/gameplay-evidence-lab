import { checked, type Dataset } from "./domain";

export type BackendConfig = {
  url: string;
  publicKey: string;
  enabled: boolean;
};
export function backendConfig(): BackendConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL,
    publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (import.meta.env.VITE_COLLECTION_ENABLED !== "true" || !url || !publicKey)
    return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, publicKey, enabled: true };
}
export class PrivateCollection {
  constructor(
    private config: BackendConfig,
    private accessToken: string,
  ) {
    if (!config.enabled) throw new Error("Collection is unavailable.");
    // Tokens remain in memory. This is an invited technical pilot, not a public login flow.
    try {
      const claims = JSON.parse(
        atob(
          accessToken.split(".")[1].replaceAll("-", "+").replaceAll("_", "/"),
        ),
      );
      if (
        claims.role !== "authenticated" ||
        !claims.sub ||
        claims.exp * 1000 < Date.now()
      )
        throw new Error();
    } catch {
      throw new Error(
        "Use an unexpired authenticated-user session token. Service/admin keys are never accepted here.",
      );
    }
  }
  async request(action: string, body: unknown) {
    let response: Response;
    try {
      response = await fetch(`${this.config.url}/functions/v1/evidence-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.config.publicKey,
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ action, ...(body as object) }),
      });
    } catch {
      throw new Error(
        "Private collection could not be reached. Submission was not confirmed. Keep your local draft and retry with the same receipt.",
      );
    }
    const result = await response
      .json()
      .catch(() => ({ error: "The server did not return a valid response." }));
    if (!response.ok)
      throw new Error(
        result.error ??
          `Request failed (${response.status}). No success was confirmed.`,
      );
    return result;
  }
  async submit(dataset: Dataset, submissionId: string, withdrawalCode: string) {
    checked(dataset);
    if (dataset.origin !== "local")
      throw new Error("Only real local pilot records can be submitted.");
    const result = await this.request("submit", {
      dataset,
      submissionId,
      withdrawalCode,
    });
    if (result.persisted !== true || result.submissionId !== submissionId)
      throw new Error(
        "A matching persistence receipt was not returned. Submission is not confirmed.",
      );
    return result;
  }
  async list() {
    return this.request("list", {});
  }
  async withdraw(submissionId: string, withdrawalCode: string) {
    return this.request("withdraw", { submissionId, withdrawalCode });
  }
  async review(submissionId: string, review: unknown) {
    return this.request("review", { submissionId, review });
  }
}
