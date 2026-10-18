import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { demoDataset } from "../src/demo";
import { validateSubmission } from "../backend/validation";
import { checked, type Dataset } from "../src/domain";
import { PrivateCollection } from "../src/backend";

function fixture(): Dataset {
  const d = demoDataset();
  d.origin = "local";
  for (const s of d.sessions) s.source = "own-play";
  d.studies[0].contact = "Disposable test operator; not a real study contact";
  d.studies[0].reviewStatus = "researcher-configured";
  return checked(d);
}
test("server gate rejects inactive, synthetic, mismatched and overprivileged submissions", () => {
  const d = fixture(),
    gate = {
      active: true,
      study: d.studies[0],
      allowedOrigin: "https://example.invalid",
    };
  assert.equal(validateSubmission(d, gate).sessions.length, 2);
  assert.throws(
    () => validateSubmission(d, { ...gate, active: false }),
    /disabled/,
  );
  assert.throws(() => validateSubmission(demoDataset(), gate), /real local/);
  assert.throws(
    () =>
      validateSubmission(d, {
        ...gate,
        study: { ...gate.study, protocolVersion: "other" },
      }),
    /exact/,
  );
  const withReview = structuredClone(d);
  withReview.reviews.push({
    id: "r1",
    eventId: d.events[0].id,
    reviewerId: "owner",
    originalLabel: d.events[0].label,
    correctedLabel: "test",
    status: "verified",
    notes: "No privilege escalation",
    annotationVersion: 2,
    createdAt: d.createdAt,
  });
  assert.throws(
    () => validateSubmission(withReview, gate),
    /no researcher reviews/,
  );
});
test("server gate rejects media-reference sharing without separate permission", () => {
  const d = fixture();
  d.sessions[0].evidenceKind = "private-reference";
  d.sessions[0].evidenceRef = "https://example.invalid/private";
  assert.throws(
    () =>
      validateSubmission(d, {
        active: true,
        study: d.studies[0],
        allowedOrigin: "https://example.invalid",
      }),
    /permission/,
  );
});
test("private adapter rejects fake persistence and reports offline uncertainty without success", async () => {
  const originalFetch = globalThis.fetch;
  const token = `e30.${Buffer.from(JSON.stringify({ role: "authenticated", sub: "test-user", exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url")}.fake`;
  const client = new PrivateCollection(
    {
      url: "https://example.invalid",
      publicKey: "public-test-key",
      enabled: true,
    },
    token,
  );
  try {
    globalThis.fetch = async () => {
      throw new TypeError("offline");
    };
    await assert.rejects(
      () => client.submit(fixture(), "submission-id", "withdrawal-code"),
      /not confirmed/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ submissionId: "submission-id", persisted: false }),
        { status: 200 },
      );
    await assert.rejects(
      () => client.submit(fixture(), "submission-id", "withdrawal-code"),
      /not returned/,
    );
    await assert.rejects(
      () => client.submit(demoDataset(), "submission-id", "withdrawal-code"),
      /real local/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("actual PostgreSQL migration enforces anonymous denial, owner isolation, researcher access, idempotency and withdrawal", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610180001_private_evidence.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      r = "00000000-0000-4000-8000-000000000003",
      id = "00000000-0000-4000-8000-000000000004";
    await db.query("insert into auth.users(id) values($1),($2),($3)", [
      a,
      b,
      r,
    ]);
    const d = fixture();
    await db.query(
      "insert into public.evidence_studies(id,document,active) values($1,$2,true)",
      [d.studies[0].id, JSON.stringify(d.studies[0])],
    );
    for (const [user, role] of [
      [a, "participant"],
      [b, "participant"],
      [r, "researcher"],
    ])
      await db.query(
        "insert into public.evidence_memberships values($1,$2,$3)",
        [d.studies[0].id, user, role],
      );
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select id,dataset from public.evidence_submissions"),
      /permission denied/,
    );
    await db.exec("reset role");
    const submitted = checked({ ...d, origin: "submitted" });
    const submit = () =>
      db.query("select public.evidence_submit($1,$2,$3,$4,$5,$6)", [
        id,
        d.studies[0].id,
        a,
        JSON.stringify(submitted),
        "same-content-hash",
        "withdrawal-hash",
      ]);
    await submit();
    await submit();
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.evidence_submissions",
        )
      ).rows[0].count,
      1,
    );
    await assert.rejects(
      () =>
        db.query("select public.evidence_submit($1,$2,$3,$4,$5,$6)", [
          id,
          d.studies[0].id,
          a,
          JSON.stringify(submitted),
          "different-hash",
          "withdrawal-hash",
        ]),
      /conflict/,
    );
    const asUser = async (user: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role authenticated");
    };
    await asUser(a);
    assert.equal(
      (await db.query("select id,dataset from public.evidence_submissions"))
        .rows.length,
      1,
    );
    await assert.rejects(
      () => db.query("select withdrawal_hash from public.evidence_submissions"),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query("insert into public.evidence_submissions(id) values($1)", [
          id,
        ]),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query("select public.evidence_submit($1,$2,$3,$4,$5,$6)", [
          id,
          d.studies[0].id,
          a,
          JSON.stringify(submitted),
          "hash",
          "secret",
        ]),
      /permission denied/,
    );
    await asUser(b);
    assert.equal(
      (await db.query("select id,dataset from public.evidence_submissions"))
        .rows.length,
      0,
    );
    await asUser(r);
    assert.equal(
      (await db.query("select id,dataset from public.evidence_submissions"))
        .rows.length,
      1,
    );
    await db.exec("reset role");
    const review = {
      id: "review-a",
      eventId: d.events[0].id,
      reviewerId: "reviewer",
      originalLabel: d.events[0].label,
      correctedLabel: "Checked label",
      status: "verified",
      notes: "Disposable test",
      annotationVersion: 2,
      createdAt: d.createdAt,
    };
    await assert.rejects(
      () =>
        db.query("select public.evidence_review($1,$2,$3)", [
          id,
          b,
          JSON.stringify(review),
        ]),
      /Researcher required/,
    );
    await db.query("select public.evidence_review($1,$2,$3)", [
      id,
      r,
      JSON.stringify(review),
    ]);
    await assert.rejects(
      () =>
        db.query("select public.evidence_review($1,$2,$3)", [
          id,
          r,
          JSON.stringify(review),
        ]),
      /version conflict/,
    );
    assert.equal(
      (
        await db.query<{ removed: boolean }>(
          "select public.evidence_withdraw($1,$2,$3) as removed",
          [id, b, "withdrawal-hash"],
        )
      ).rows[0].removed,
      false,
    );
    assert.equal(
      (
        await db.query<{ removed: boolean }>(
          "select public.evidence_withdraw($1,$2,$3) as removed",
          [id, a, "wrong-code"],
        )
      ).rows[0].removed,
      false,
    );
    assert.equal(
      (
        await db.query<{ removed: boolean }>(
          "select public.evidence_withdraw($1,$2,$3) as removed",
          [id, a, "withdrawal-hash"],
        )
      ).rows[0].removed,
      true,
    );
    assert.equal(
      (await db.query("select id from public.evidence_submissions")).rows
        .length,
      0,
    );
    await assert.rejects(submit, /Previously withdrawn/);
    for (let i = 0; i < 19; i++)
      await db.query("select public.evidence_submit($1,$2,$3,$4,$5,$6)", [
        crypto.randomUUID(),
        d.studies[0].id,
        a,
        JSON.stringify(submitted),
        `hash-${i}`,
        "withdrawal-hash",
      ]);
    await assert.rejects(
      () =>
        db.query("select public.evidence_submit($1,$2,$3,$4,$5,$6)", [
          crypto.randomUUID(),
          d.studies[0].id,
          a,
          JSON.stringify(submitted),
          "overflow",
          "withdrawal-hash",
        ]),
      /Daily limit/,
    );
    await db.exec(
      "update public.evidence_submissions set expires_at=now()-interval '1 second'",
    );
    await asUser(a);
    assert.equal(
      (await db.query("select id from public.evidence_submissions")).rows
        .length,
      0,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ removed: number }>(
          "select public.evidence_purge_expired() as removed",
        )
      ).rows[0].removed,
      19,
    );
  } finally {
    await db.close();
  }
});
