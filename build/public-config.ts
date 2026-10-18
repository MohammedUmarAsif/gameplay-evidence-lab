export function validatePublicEnvironment(env: Record<string, string>) {
  for (const key of Object.keys(env))
    if (
      key.startsWith("VITE_") &&
      /SECRET|PASSWORD|TOKEN|SERVICE_ROLE|ADMIN/.test(key)
    )
      throw new Error(
        "A secret-like VITE variable was found. Client environment variables are public. Remove it before building.",
      );
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key) {
    if (key.startsWith("sb_publishable_")) return;
    try {
      const claims = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (claims.role === "anon") return;
    } catch {
      /* Reject without disclosing the value. */
    }
    throw new Error(
      "The public backend key is not a publishable/anon key. Do not bundle service/admin credentials.",
    );
  }
}
