import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checked, reviewSchema } from "../../../src/domain.ts";
import { validateSubmission } from "../../../backend/validation.ts";

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error("Backend configuration missing");
  return value;
};
const admin = createClient(
  env("SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const allowedOrigins = env("ALLOWED_ORIGINS")
  .split(",")
  .map((v) => v.trim());
const uuid = z.uuid();
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function limitedJSON(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 550_000) {
      await reader.cancel();
      throw new Error("Request exceeds 550 KB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
  };
  const reply = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (!allowedOrigins.includes(origin))
    return new Response("Origin not allowed", { status: 403 });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST")
    return reply({ error: "Method not allowed" }, 405);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    return reply({ error: "Authenticated invited account required" }, 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user)
    return reply({ error: "Session expired or invalid" }, 401);
  const userId = auth.user.id;
  try {
    const body = await limitedJSON(request);
    if (body.action === "submit") {
      const submissionId = uuid.parse(body.submissionId),
        withdrawalCode = uuid.parse(body.withdrawalCode);
      const dataset = checked(body.dataset),
        studyId = dataset.studies[0]?.id;
      const { data: membership } = await admin
        .from("evidence_memberships")
        .select("role")
        .eq("study_id", studyId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership)
        return reply({ error: "Account is not invited to this study" }, 403);
      const { data: study } = await admin
        .from("evidence_studies")
        .select("*")
        .eq("id", studyId)
        .maybeSingle();
      if (!study) return reply({ error: "Study not available" }, 403);
      const validated = validateSubmission(dataset, {
        active: study.active,
        study: study.document,
        allowedOrigin: origin,
      });
      const contentHash = await hash(JSON.stringify(validated)),
        withdrawalHash = await hash(withdrawalCode);
      const submitted = checked({ ...validated, origin: "submitted" });
      const { data: id, error } = await admin.rpc("evidence_submit", {
        p_id: submissionId,
        p_study: studyId,
        p_owner: userId,
        p_dataset: submitted,
        p_hash: contentHash,
        p_withdrawal: withdrawalHash,
      });
      if (error)
        return reply(
          {
            error:
              "Submission rejected: study status, rate limit or retry conflict. No success confirmed.",
          },
          409,
        );
      return reply({ submissionId: id, persisted: true });
    }
    if (body.action === "list") {
      // Use the authenticated user's RLS context. Never list using service-role visibility.
      const scoped = createClient(
        env("SUPABASE_URL"),
        env("SUPABASE_ANON_KEY"),
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const { data: rows, error } = await scoped
        .from("evidence_submissions")
        .select("id,dataset,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error)
        return reply({ error: "Authorised records could not be loaded" }, 403);
      return reply({ submissions: rows ?? [], limit: 50 });
    }
    if (body.action === "withdraw") {
      const { data: removed, error } = await admin.rpc("evidence_withdraw", {
        p_id: uuid.parse(body.submissionId),
        p_owner: userId,
        p_withdrawal: await hash(uuid.parse(body.withdrawalCode)),
      });
      if (error || !removed)
        return reply(
          { error: "No matching owned submission and withdrawal code" },
          403,
        );
      return reply({ deleted: true });
    }
    if (body.action === "review") {
      const review = reviewSchema.parse(body.review);
      const { data: ok, error } = await admin.rpc("evidence_review", {
        p_id: uuid.parse(body.submissionId),
        p_researcher: userId,
        p_review: {
          ...review,
          reviewerId: `reviewer-${(await hash(userId)).slice(0, 16)}`,
          createdAt: new Date().toISOString(),
        },
      });
      if (error || !ok)
        return reply(
          { error: "Researcher authorisation or review version rejected" },
          403,
        );
      return reply({ reviewed: true });
    }
    return reply({ error: "Unknown action" }, 400);
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Invalid request",
      },
      400,
    );
  }
});
