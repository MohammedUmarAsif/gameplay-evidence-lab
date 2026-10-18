import test from "node:test";
import assert from "node:assert/strict";
import { emptyDataset, checked, now, uid, type Study } from "../src/domain";

// Operator-provided variables only. Never commit tokens or use a real participant study.
const url = process.env.TEST_SUPABASE_URL,
  key = process.env.TEST_SUPABASE_PUBLIC_KEY;
const a = process.env.TEST_USER_A_TOKEN,
  b = process.env.TEST_USER_B_TOKEN,
  r = process.env.TEST_RESEARCHER_TOKEN;
const studyId = process.env.TEST_STUDY_ID,
  origin = process.env.TEST_ALLOWED_ORIGIN;
const configured = Boolean(url && key && a && b && r && studyId && origin);
test(
  "disposable hosted backend: auth, persistence, owner isolation, review, retry and withdrawal",
  {
    skip: configured
      ? false
      : "No disposable hosted backend/test accounts configured.",
  },
  async () => {
    const api = async (
      token: string,
      body: unknown,
      requestOrigin = origin!,
    ) => {
      const response = await fetch(`${url}/functions/v1/evidence-api`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: key!,
          "Content-Type": "application/json",
          Origin: requestOrigin,
        },
        body: JSON.stringify(body),
      });
      return {
        status: response.status,
        body: await response.json().catch(() => ({})),
      };
    };
    const response = await fetch(
      `${url}/rest/v1/evidence_studies?id=eq.${encodeURIComponent(studyId!)}&select=document`,
      { headers: { Authorization: `Bearer ${a}`, apikey: key! } },
    );
    assert.equal(response.status, 200);
    const studies = (await response.json()) as { document: Study }[];
    assert.equal(studies.length, 1);
    const study = studies[0].document;
    assert.ok(
      study.title.startsWith("TEST ONLY"),
      "Refusing to write to a study not explicitly marked TEST ONLY.",
    );
    const d = emptyDataset();
    d.studies = [study];
    d.configurations = [
      {
        id: uid(),
        studyId: study.id,
        label: "TEST ONLY configuration",
        equipment: "Disposable infrastructure fixture",
        properties: [],
        createdAt: now(),
      },
    ];
    d.sessions = [
      {
        id: uid(),
        studyId: study.id,
        configurationId: d.configurations[0].id,
        participantId: "infrastructure-test-not-human",
        groupId: uid(),
        game: "TEST ONLY fictional input",
        gameVersion: "test",
        platform: "PC",
        experience: "not-applicable",
        encounter: "TEST ONLY",
        conditions: "Synthetic infrastructure test; not research observations",
        durationSeconds: 10,
        source: "own-play",
        evidenceKind: "none",
        evidenceRef: "",
        mediaId: "",
        createdAt: now(),
        consent: {
          adultConfirmed: true,
          participation: true,
          mediaReuse: false,
          mlProcessing: false,
          version: study.consentVersion,
          recordedAt: now(),
        },
      },
    ];
    d.events = [
      {
        id: uid(),
        sessionId: d.sessions[0].id,
        startSeconds: 1,
        endSeconds: 2,
        label: "TEST ONLY event",
        components: ["action:test"],
        outcome: "TEST ONLY",
        note: "Disposable infrastructure fixture; not a real observation",
        provenance: "unknown",
        verification: "unreviewed",
        source: "Infrastructure test",
        annotationVersion: 1,
        createdAt: now(),
      },
    ];
    checked(d);
    const submissionId = uid(),
      withdrawalCode = uid(),
      body = { action: "submit", dataset: d, submissionId, withdrawalCode };
    let persisted = false;
    try {
      assert.equal((await api("invalid-token", body)).status, 401);
      assert.equal(
        (await api(a!, body, "https://not-allowed.invalid")).status,
        403,
      );
      const result = await api(a!, body);
      assert.equal(result.status, 200);
      assert.equal(result.body.submissionId, submissionId);
      persisted = true;
      assert.equal((await api(a!, body)).body.submissionId, submissionId);
      const other = await api(b!, { action: "list" });
      assert.equal(other.status, 200);
      assert.ok(
        !other.body.submissions.some(
          (row: { id: string }) => row.id === submissionId,
        ),
      );
      const researcher = await api(r!, { action: "list" });
      assert.ok(
        researcher.body.submissions.some(
          (row: { id: string }) => row.id === submissionId,
        ),
      );
      const review = {
        id: uid(),
        eventId: d.events[0].id,
        reviewerId: "test-reviewer",
        originalLabel: d.events[0].label,
        correctedLabel: "TEST ONLY checked",
        status: "uncertain",
        notes: "Disposable test",
        annotationVersion: 2,
        createdAt: now(),
      };
      assert.equal(
        (await api(b!, { action: "review", submissionId, review })).status,
        403,
      );
      assert.equal(
        (await api(r!, { action: "review", submissionId, review })).status,
        200,
      );
      assert.equal(
        (await api(b!, { action: "withdraw", submissionId, withdrawalCode }))
          .status,
        403,
      );
      assert.equal(
        (
          await api(a!, {
            action: "withdraw",
            submissionId,
            withdrawalCode: uid(),
          })
        ).status,
        403,
      );
      assert.equal(
        (await api(a!, { action: "withdraw", submissionId, withdrawalCode }))
          .status,
        200,
      );
      persisted = false;
      const anon = await fetch(
        `${url}/rest/v1/evidence_submissions?select=id`,
        { headers: { apikey: key! } },
      );
      assert.ok(!anon.ok, "Anonymous table read must be rejected.");
    } finally {
      if (persisted)
        await api(a!, { action: "withdraw", submissionId, withdrawalCode });
    }
  },
);
