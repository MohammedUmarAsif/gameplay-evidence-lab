import "@primer/css/dist/primitives.css";
import "@primer/css/dist/base.css";
import "@primer/css/dist/buttons.css";
import "@primer/css/dist/forms.css";
import "./styles.css";
import { z } from "zod";
import {
  checked,
  emptyDataset,
  studyTemplate,
  studySchema,
  assertStudyRevision,
  uid,
  now,
  warnings,
  latestReview,
  deleteSession,
  splitGroups,
  filterConfiguration,
  type Dataset,
  type Study,
  type Session,
} from "./domain";
import { demoDataset } from "./demo";
import { loadLocal, saveLocal, eraseLocal, LOCAL_KEY } from "./storage";
import { analysisView } from "./analysis-view";
import { prepareLocalVideo } from "./media";
import {
  exportEnvelope,
  exportZip,
  importEnvelope,
  download,
  DICTIONARY,
} from "./exports";
import { backendConfig, PrivateCollection } from "./backend";

type Mode = "demo" | "local";
let mode: Mode = "demo",
  demo = demoDataset(),
  local = loadLocal(),
  data = demo;
let page = location.hash.slice(1) || "workspace",
  selectedSession = "",
  selectedEvent = "",
  draftStudy: Study | null = null;
let status = "",
  error = "",
  dirty = false,
  mediaURL = "",
  mediaName = "",
  mediaSession = "",
  startMark = 0,
  endMark = 0;
let collection: PrivateCollection | null = null,
  serverRows: { id: string; dataset: Dataset; created_at: string }[] = [];
let pendingReceipt: { submissionId: string; withdrawalCode: string } | null =
  null;
let analysisConfiguration = "all";
const config = backendConfig();
const app = document.querySelector<HTMLDivElement>("#app")!;
const esc = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const shortId = (id: string) => id.slice(0, 8);
const option = (value: string, label = value, selected = "") =>
  `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
const button = (label: string, action: string, cls = "") =>
  `<button type="button" class="btn ${cls}" data-action="${action}">${label}</button>`;
const input = (name: string, label: string, value = "", opts = "") =>
  `<label class="field">${label}<input class="form-control" name="${name}" value="${esc(value)}" maxlength="300" ${opts}></label>`;
const area = (name: string, label: string, value = "", required = false) =>
  `<label class="field full">${label}<textarea class="form-control" name="${name}" maxlength="4000" rows="3" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
let controlSerial = 0;
const select = (
  name: string,
  label: string,
  items: (string | readonly string[])[],
  value = "",
) => {
  const controlId = `control-${++controlSerial}`;
  return `<div class="field"><label for="${controlId}">${label}</label><select class="form-select" id="${controlId}" name="${name}" ${["control", "difficulty", "enjoyment", "eventId"].includes(name) ? "" : "required"}>${items.map((item) => (typeof item === "string" ? option(item, item, value) : option(item[0], item[1], value))).join("")}</select></div>`;
};
const check = (name: string, label: string) =>
  `<label class="check"><input type="checkbox" name="${name}"> <span>${label}</span></label>`;
const submit = (label: string) =>
  `<div class="form-actions"><button class="btn btn-primary" type="submit">${label}</button><span class="muted">${mode === "demo" ? "Synthetic workspace only" : "Saved on this device only"}</span></div>`;
const originLabel = () =>
  mode === "demo" ? "Synthetic demonstration" : "Private local pilot";
const activeSession = () =>
  data.sessions.find((s) => s.id === selectedSession) ?? data.sessions[0];
function clearMedia() {
  if (mediaURL) URL.revokeObjectURL(mediaURL);
  mediaURL = mediaName = mediaSession = "";
  startMark = endMark = 0;
}
const sessionOptions = () =>
  data.sessions.map(
    (s) =>
      [
        s.id,
        `${s.game} · ${data.configurations.find((c) => c.id === s.configurationId)?.label ?? "Unknown"} · ${shortId(s.id)}`,
      ] as [string, string],
  );
const sessionSelect = () =>
  select("sessionId", "Session", sessionOptions(), activeSession()?.id);
const title = (heading: string, description: string, action = "") =>
  `<header class="page-heading"><div><h1>${heading}</h1><p>${description}</p></div>${action}</header>`;
const empty = (heading: string, description: string, action = "") =>
  `<div class="empty"><h2>${heading}</h2><p>${description}</p>${action}</div>`;
const note = (content: string, cls = "") =>
  `<div class="notice ${cls}">${content}</div>`;
function setStatus(message: string) {
  status = message;
  error = "";
}
function save(next: Dataset, message: string) {
  const validated = checked(next);
  if (mode === "local") {
    if (local.error)
      throw new Error(
        "Recover or explicitly clear the unreadable local storage before saving.",
      );
    saveLocal(validated);
    local = { data: validated };
  } else demo = validated;
  data = validated;
  dirty = false;
  pendingReceipt = null;
  setStatus(message);
}
function showError(e: unknown) {
  status = "";
  document.querySelector("#status-message")?.setAttribute("hidden", "");
  error =
    e instanceof z.ZodError
      ? e.issues
          .slice(0, 7)
          .map((i) => `${i.path.join(".") || "Record"}: ${i.message}`)
          .join("\n")
      : e instanceof Error
        ? e.message
        : String(e);
  const existing = document.querySelector("#error-summary");
  if (existing) {
    existing.textContent = error;
    existing.removeAttribute("hidden");
    (existing as HTMLElement).focus();
  } else render();
}
function navigate(next: string) {
  if (dirty && !confirm("Discard the unsaved form changes?")) return;
  dirty = false;
  page = next;
  location.hash = next;
  render();
  document.querySelector<HTMLElement>("h1")?.focus();
}
function switchMode(next: Mode) {
  if (next === mode) return;
  if (dirty && !confirm("Discard the unsaved form changes?")) return;
  clearMedia();
  selectedSession = "";
  selectedEvent = "";
  draftStudy = null;
  dirty = false;
  pendingReceipt = null;
  mode = next;
  analysisConfiguration = "all";
  if (next === "local") {
    local = loadLocal();
    data = local.data;
  } else data = demo;
  status = "";
  error = local.error && next === "local" ? local.error : "";
  render();
}

function workspace() {
  const issues = warnings(data),
    reviewed = data.events.filter((e) => latestReview(data, e.id)).length;
  return (
    title(
      "Evidence workspace",
      "A traceable path from a gameplay moment to a reviewed record.",
      button("New session", "new-session", "btn-primary"),
    ) +
    `<div class="metrics"><div><strong>${data.sessions.length}</strong><span>sessions recorded</span></div><div><strong>${data.events.length}</strong><span>timestamped events</span></div><div><strong>${reviewed}<small> / ${data.events.length}</small></strong><span>events with review</span></div></div>` +
    `<div class="work-grid"><section class="panel"><div class="panel-heading"><h2>Session notebook</h2><a href="#sessions">View all sessions</a></div>${sessionTable()}<div class="panel-foot">${mode === "demo" ? "Fictional RPG examples. No participant observations or measured findings." : "Local drafts are not centrally submitted. Export a backup after each session."}</div></section>
    <aside class="panel next-panel"><span class="section-kicker">Research workflow</span><h2>Keep the evidence connected.</h2><ol class="workflow-list"><li><a href="#study">Define a study</a><span>Question, measures and information</span></li><li><a href="#sessions">Record configuration</a><span>Context and explicit unknowns</span></li><li><a href="#annotate">Annotate a moment</a><span>Interval, action and outcome</span></li><li><a href="#review">Review, then export</a><span>Original and corrected labels</span></li></ol><a href="#method">Read the method and limitations →</a></aside></div>` +
    `<section class="panel"><div class="panel-heading"><h2>Quality queue</h2><span>${issues.length} checks to inspect</span></div>${
      issues.length
        ? `<ul class="quality-list">${issues
            .slice(0, 5)
            .map((w) => `<li>${esc(w)}</li>`)
            .join("")}</ul>`
        : '<p class="panel-body">No recorded warnings. This does not establish scientific validity.</p>'
    }</section>`
  );
}
function sessionTable() {
  if (!data.sessions.length)
    return empty(
      "Your first session starts here",
      "Create a study, then record the configuration and a short gameplay session.",
      button("Create a study", "go-study"),
    );
  return (
    `<div class="table-wrap session-table"><table><thead><tr><th>Session / game</th><th>Configuration</th><th>Evidence</th><th>Events</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${data.sessions.map((s) => `<tr><td><strong>${esc(s.game)}</strong><span class="subline">${shortId(s.id)} · ${esc(s.platform)} · ${s.durationSeconds}s</span></td><td>${esc(data.configurations.find((c) => c.id === s.configurationId)?.label)}</td><td><span class="badge neutral">${esc(s.evidenceKind === "local-file" ? "Local file reference" : s.evidenceKind === "none" ? "Not attached" : "Private reference")}</span></td><td>${data.events.filter((e) => e.sessionId === s.id).length}</td><td><button type="button" class="btn btn-sm" data-session="${esc(s.id)}">Annotate</button> <button type="button" class="text-button danger" data-delete-session="${esc(s.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>` +
    mobileSessionCards()
  );
}
function mobileSessionCards() {
  return `<div class="mobile-session-list">${data.sessions.map((s) => `<article><h3>${esc(s.game)}</h3><p class="muted">${shortId(s.id)} · ${esc(s.platform)} · ${s.durationSeconds}s</p><dl><dt>Configuration</dt><dd>${esc(data.configurations.find((c) => c.id === s.configurationId)?.label)}</dd><dt>Evidence</dt><dd>${esc(s.evidenceKind === "none" ? "Not attached" : s.evidenceKind === "local-file" ? "Local file reference" : "Private reference")}</dd><dt>Events</dt><dd>${data.events.filter((e) => e.sessionId === s.id).length}</dd></dl><div class="mobile-session-actions"><button class="btn" data-session="${esc(s.id)}">Annotate</button><button class="btn btn-danger" data-delete-session="${esc(s.id)}">Delete</button></div></article>`).join("")}</div>`;
}
function studyView() {
  const s = draftStudy ?? data.studies[0] ?? studyTemplate();
  draftStudy = s;
  return (
    title(
      "Study protocol",
      "Define the question and handling of evidence before collecting it.",
      `<div class="actions">${button("New study", "new-study")}${mode === "local" ? '<label class="btn file-button">Import study configuration<input id="study-import" type="file" accept=".json,application/json"></label>' : ""}</div>`,
    ) +
    note(
      "Personal pilot template. No ethics approval or collaboration is claimed. Public participant recruitment is disabled.",
    ) +
    `<form id="study-form" class="panel form-panel"><div class="panel-heading"><h2>Study configuration</h2><span class="mono">${shortId(s.id)}</span></div><div class="form-grid">
    ${input("title", "Study title", s.title, "required")}${input("protocolVersion", "Protocol version", s.protocolVersion, "required")}${input("consentVersion", "Information / consent version", s.consentVersion, "required")}
    ${area("question", "Research question", s.question, true)}${area("inclusion", "Inclusion criteria", s.inclusion, true)}${area("measures", "Measures", s.measures, true)}${area("permittedMediaUse", "Permitted media use", s.permittedMediaUse, true)}${area("retention", "Retention policy", s.retention, true)}${area("deletion", "Deletion and withdrawal instructions", s.deletion, true)}${area("contact", "Study contact (leave blank for your personal local pilot)", s.contact)}${area("informationText", "Information shown before recording consent", s.informationText, true)}
    </div>${submit("Save study")}</form><section class="panel panel-body"><h2>Saved studies</h2>${data.studies.length ? data.studies.map((row) => `<p><button class="text-button" data-study="${esc(row.id)}">${esc(row.title)}</button> <span class="mono">${esc(row.protocolVersion)}</span></p>`).join("") : "<p>No study saved yet.</p>"}<p class="muted">Changing a consent version after sessions exist is rejected. Create a new study/protocol instead.</p></section>`
  );
}
function sessionsView() {
  if (!data.studies.length)
    return (
      title("Sessions", "Record context without inventing hidden game state.") +
      empty(
        "Define your study first",
        "A session needs a protocol and information version.",
        button("Create a study", "go-study", "btn-primary"),
      )
    );
  const s = data.studies[0];
  return (
    title(
      "Sessions",
      "Record what was played, under which configuration, and where the evidence lives.",
    ) +
    `<section class="panel">${sessionTable()}</section><form id="session-form" class="panel form-panel"><div class="panel-heading"><h2>New session</h2><span>Configuration + session record</span></div>
    <div class="form-grid">${select(
      "studyId",
      "Study",
      data.studies.map((s) => [s.id, s.title]),
      s.id,
    )}${input("game", "Game title", "", "required")}${input("gameVersion", "Game version", "unknown", "required")}${select("platform", "Platform", ["PC", "PlayStation", "Xbox", "Switch", "Other", "unknown"])}
    ${select("experience", "Experience with this game", [
      ["unknown", "Unknown / prefer not to answer"],
      ["new", "New"],
      ["some", "Some experience"],
      ["experienced", "Experienced"],
      ["not-applicable", "Not applicable"],
    ])}
    ${select("configurationId", "Configuration", [["new", "Create a new configuration"], ...data.configurations.filter((c) => c.studyId === s.id).map((c) => [c.id, c.label] as [string, string])])}
    ${input("configurationLabel", "New configuration label", "", "required")}${input("equipment", "Equipment / build (unknown is allowed)", "unknown", "required")}
    ${input("propertyName", "Optional known property name")}${input("propertyValue", "Property value (leave blank if unknown)", "", 'type="number" step="any"')}${input("propertyUnit", "Property unit", "not-applicable")}${select("propertyStatus", "Property evidence", ["unknown", "observed", "self-reported"])}
    ${input("propertySource", "Property source", "unknown")}${input("encounter", "Encounter", "unknown", "required")}${input("conditions", "Relevant conditions", "unknown", "required")}${input("durationSeconds", "Recording / session duration in seconds", "", 'type="number" min="0.01" max="86400" step="0.01" required')}
    ${select(
      "source",
      "Source",
      mode === "demo"
        ? [["synthetic-example", "Synthetic example"]]
        : [
            ["own-play", "My own gameplay"],
            ["participant-play", "Invited participant play"],
            ["simulation", "Simulation"],
            ["authorised-external", "Authorised external dataset"],
          ],
    )}
    ${input("participantId", "Pseudonymous player/controller ID", data.sessions[0]?.participantId ?? `player-${uid().slice(0, 8)}`, 'required pattern="[a-zA-Z0-9_-]+"')}
    ${input("groupId", "Episode / source grouping ID", `episode-${uid().slice(0, 8)}`, 'required pattern="[a-zA-Z0-9_-]+"')}
    ${input("evidenceRef", "Optional private evidence reference (HTTPS, no signed links)", "", 'type="url"')}
    </div><div class="information"><h3>Information and choices</h3><p>Protocol ${esc(s.protocolVersion)} · Information ${esc(s.consentVersion)}</p><p id="study-info">${esc(s.informationText)}</p><p><strong>Permitted media use:</strong> ${esc(s.permittedMediaUse)}</p><p><strong>Study contact:</strong> ${esc(s.contact) || "No central study contact configured; personal local pilot only."}</p><p><strong>Withdrawal:</strong> ${esc(s.deletion)}</p><p>${esc(s.retention)}</p><p>Media reuse and ML processing are separate optional choices. Local clips are not uploaded. Do not include another person's identity without permission.</p>
    ${check("adultConfirmed", "I am 18 or older (or the recorded controller is simulated and I am an adult researcher).")}${check("participation", "I have read this study information and agree to record this pilot session.")}${check("mediaReuse", "Optional: permit recording/media reuse under this study’s stated permitted use.")}${check("mlProcessing", "Optional: permit ML-assisted processing under this study’s stated permitted use. No model is called by this prototype.")}
    </div>${submit("Save session")}</form>`
  );
}
function annotateView() {
  const session = activeSession();
  if (!session)
    return (
      title("Annotate evidence", "Anchor observations to a specific moment.") +
      empty(
        "No session selected",
        "Record a session before annotating.",
        button("Record a session", "new-session", "btn-primary"),
      )
    );
  selectedSession = session.id;
  const events = data.events.filter((e) => e.sessionId === session.id);
  return (
    title(
      "Annotate evidence",
      "Select a local recording, mark an interval, and describe only what the evidence supports.",
    ) +
    `<div class="session-switch">${sessionSelect()}<span class="mono">${esc(session.gameVersion)} · ${session.durationSeconds}s</span></div>
    <div class="annotation-grid"><section class="panel media-panel"><div class="panel-heading"><h2>Recording</h2><span>Local playback only</span></div>
    ${mediaURL && mediaSession === session.id ? `<video id="player" controls preload="metadata" src="${esc(mediaURL)}" aria-label="Local gameplay recording"></video><p class="media-name">${esc(mediaName)} · never uploaded</p>` : `<div class="media-empty"><span class="media-symbol" aria-hidden="true">▷</span><h3>No recording attached</h3><p>${mode === "demo" ? "This example is synthetic. No real clip exists." : "Choose your clip. Its bytes stay on this device and are not stored in browser drafts."}</p></div>`}
    <div class="media-tools"><label class="btn file-button">Choose local video<input id="video-file" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime"></label>${button("Mark start [", "mark-start")}${button("Mark end ]", "mark-end")}</div>
    <p class="helper">Use the player controls to seek. [ and ] mark the current time outside form fields. Reattach local files after a reload. Intervals are relative to this recording. Give sessions from the same recording the same source grouping ID. Reattach the same original clip: file identity is not verified. Use a new session for a different recording.</p>
    ${session.evidenceRef ? `<p class="panel-body"><a href="${esc(session.evidenceRef)}" target="_blank" rel="noopener noreferrer">Open evidence reference</a>. Nothing is fetched until you open it.</p>` : ""}
    </section><form id="event-form" class="panel form-panel"><div class="panel-heading"><h2>New event</h2><span>Raw annotation</span></div><div class="form-grid">
    ${input("startSeconds", "Start (seconds)", String(startMark), 'type="number" min="0" step="0.001" required')}${input("endSeconds", "End (seconds)", String(endMark), 'type="number" min="0" step="0.001" required')}
    ${input("label", "Action / event label", "", "required")}${input("components", "Involved components (comma separated)", "action:unknown, encounter:unknown", "required")}
    ${input("outcome", "Observed outcome", "", "required")}${select("provenance", "Evidence category", ["observed", "self-reported", "unknown", "model-inferred"])}${input("source", "Source / reference", "Manual video annotation", "required")}${area("note", "Observation note")}
    </div>${submit("Save event")}</form></div>
    <section class="panel"><div class="panel-heading"><h2>Timestamped events</h2><span>${events.length} in this session</span></div>${events.length ? `<div class="event-list">${events.map((e) => `<article><button class="time-button" data-seek="${e.startSeconds}" data-event-session="${e.sessionId}">${e.startSeconds.toFixed(2)}–${e.endSeconds.toFixed(2)}s</button><div><strong>${esc(e.label)}</strong><p>${esc(e.outcome)}</p><span class="muted">${esc(e.provenance)} · ${latestReview(data, e.id) ? "review recorded" : "review pending"}</span></div><button class="btn btn-sm" data-review="${e.id}">Review</button></article>`).join("")}</div>` : empty("No events yet", "Mark an interval and add your first observation.")}</section>`
  );
}
function feedbackView() {
  const s = activeSession();
  if (!s)
    return (
      title(
        "Player feedback",
        "Keep reported experience separate from mechanical outcomes.",
      ) +
      empty(
        "Record a session first",
        "Feedback is linked to a session.",
        button("Record a session", "new-session"),
      )
    );
  selectedSession = s.id;
  const ratings = (name: string, label: string, low: string, high: string) =>
    select(name, label, [
      ["", "Not answered"],
      ...Array.from(
        { length: 5 },
        (_, i) =>
          [
            String(i + 1),
            `${i + 1}${i === 0 ? " · " + low : i === 4 ? " · " + high : ""}`,
          ] as [string, string],
      ),
    ]);
  return (
    title(
      "Player feedback",
      "Describe the experience in your own words. There is no preferred answer.",
    ) +
    note(
      "Custom pilot questions, not a validated psychological scale. Any question may be skipped where an empty option is provided.",
    ) +
    `<div class="session-switch">${sessionSelect()}</div><form id="feedback-form" class="panel form-panel"><div class="panel-heading"><h2>Experience record</h2><span>Raw self-report</span></div><div class="form-grid">
    ${select("eventId", "Related event (optional)", [["", "Whole session"], ...data.events.filter((e) => e.sessionId === s.id).map((e) => [e.id, e.label] as [string, string])])}
    ${area("intendedAction", "What were you trying to do?", "", true)}${area("occurred", "What happened?", "", true)}
    ${ratings("control", "How much control did you feel you had?", "Very little", "Very much")}${ratings("difficulty", "How difficult did this feel?", "Very easy", "Very difficult")}${ratings("enjoyment", "How much did you enjoy this moment/session?", "Not at all", "Very much")}
    ${area("suggestion", "Is there anything you would change? (optional)")}</div>${submit("Save feedback")}</form>
    <section class="panel panel-body"><h2>Recorded feedback</h2>${
      data.feedback
        .filter((f) => f.sessionId === s.id)
        .map(
          (f) =>
            `<blockquote><p>${esc(f.occurred)}</p><span class="muted">Control ${f.control ?? "not answered"} / 5 · Difficulty ${f.difficulty ?? "not answered"} / 5 · Enjoyment ${f.enjoyment ?? "not answered"} / 5</span></blockquote>`,
        )
        .join("") || "<p>No feedback recorded for this session.</p>"
    }</section>`
  );
}
function comparisonView() {
  return (
    title(
      "Configuration comparisons",
      "Link observations without claiming an identical-state counterfactual.",
    ) +
    note(
      "Human A/B sessions are observational comparisons. Learning, fatigue and tactical adaptation may differ. A simulator pair requires documented reset, seed and controller references.",
    ) +
    (data.sessions.length < 2
      ? empty(
          "Two sessions are needed",
          "Record both configurations before creating a comparison.",
          button("Record a session", "new-session"),
        )
      : `<form id="comparison-form" class="panel form-panel"><div class="form-grid">${select("sessionA", "Session A", sessionOptions())}${select("sessionB", "Session B", sessionOptions(), data.sessions[1]?.id)}${input("factorChanged", "Factor changed", "", "required")}${select("kind", "Comparison type", ["observational-human", "controlled-simulation"])}${input("order", "Order / counterbalancing description", "A then B", "required")}${input("startingStateRef", "Simulator starting-state reference")}${input("seedRef", "Simulator seed reference")}${input("controllerRef", "Simulator controller/policy reference")}${area("outcomeNotes", "Outcomes and limitations", "", true)}</div>${submit("Save comparison")}</form>`) +
    `<section class="panel panel-body"><h2>Comparison records</h2>${data.comparisons.map((p) => `<p><strong>${esc(p.factorChanged)}</strong> · ${esc(p.kind)} · ${shortId(p.sessionA)} / ${shortId(p.sessionB)}<br>${esc(p.outcomeNotes)}</p>`).join("") || "<p>No comparisons saved.</p>"}</section>`
  );
}
function reviewView() {
  const event =
    data.events.find((e) => e.id === selectedEvent) ?? data.events[0];
  if (!event)
    return (
      title(
        "Researcher review",
        "Retain the raw report and record a separate correction.",
      ) +
      empty(
        "No events to review",
        "Annotate a session before review.",
        button("Annotate evidence", "go-annotate"),
      )
    );
  selectedEvent = event.id;
  const latest = latestReview(data, event.id),
    reviews = data.reviews.filter((r) => r.eventId === event.id),
    predictions = data.predictions.filter((p) => p.eventId === event.id);
  return (
    title(
      "Researcher review",
      "Corrections are append-only. A review never rewrites the original annotation.",
    ) +
    `<div class="session-switch">${select(
      "eventId",
      "Event to review",
      data.events.map((e) => [
        e.id,
        `${shortId(e.sessionId)} · ${e.startSeconds}s · ${e.label}`,
      ]),
      event.id,
    )}</div>
    <div class="review-grid"><section class="panel panel-body"><span class="section-kicker">Original annotation · v1</span><h2>${esc(event.label)}</h2><p>${esc(event.outcome)}</p><p>${esc(event.note) || "No note recorded."}</p><dl class="facts"><dt>Interval</dt><dd>${event.startSeconds}–${event.endSeconds}s</dd><dt>Evidence</dt><dd>${esc(event.provenance)}</dd><dt>Source</dt><dd>${esc(event.source)}</dd><dt>Session</dt><dd class="mono">${esc(event.sessionId)}</dd></dl>${button("Open session evidence", "review-evidence")}
    </section><form id="review-form" class="panel form-panel"><div class="panel-heading"><h2>Review decision</h2><span>Next version ${latest ? latest.annotationVersion + 1 : 2}</span></div><div class="form-grid">
    ${input("reviewerId", "Reviewer pseudonym", "researcher-local", 'required pattern="[a-zA-Z0-9_-]+"')}${input("correctedLabel", "Reviewed label", latest?.correctedLabel ?? event.label, "required")}${select(
      "status",
      "Verification decision",
      [
        ["", "Choose a decision"],
        ["verified", "Verified against evidence"],
        ["uncertain", "Uncertain"],
        ["excluded", "Exclude from analysis"],
      ],
    )}${area("notes", "Reason / adjudication note", "", true)}</div>${submit("Append review")}</form></div>
    <section class="panel panel-body"><h2>Review history</h2>${reviews.map((r) => `<article class="review-entry"><strong>v${r.annotationVersion} · ${esc(r.correctedLabel)}</strong><span class="badge neutral">${r.status}</span><p>${esc(r.notes)}</p><span class="muted">${esc(r.reviewerId)} · ${esc(r.createdAt)}</span></article>`).join("") || "<p>No review yet. The original label remains unreviewed.</p>"}</section>
    <details class="panel panel-body"><summary>Machine-suggestion import (optional extension)</summary><p>No hosted AI calls are made. Import an array of prediction records only after the linked session has ML-processing permission. Suggestions remain unreviewed and never replace observations. Self-reported model scores are not calibrated probabilities.</p><form id="prediction-form">${area("predictions", "Prediction JSON array", "[]", true)}<button class="btn" type="submit">Validate and import suggestions</button></form>${predictions.map((p) => `<p>${esc(p.model)} ${esc(p.modelVersion)}: ${esc(p.proposedLabel)} · unreviewed</p>`).join("")}</details>`
  );
}
function datasetView() {
  const analysis = filterConfiguration(data, analysisConfiguration),
    issues = warnings(analysis),
    s = analysis.sessions,
    total = s.length;
  const unknownVersion = s.filter(
      (row) => row.gameVersion === "unknown",
    ).length,
    missingFeedback = s.filter(
      (row) => !analysis.feedback.some((f) => f.sessionId === row.id),
    ).length;
  const breakdown = (key: "experience" | "configurationId") =>
    Array.from(new Set(s.map((row) => row[key])))
      .map(
        (value) =>
          `<tr><td>${esc(key === "configurationId" ? data.configurations.find((c) => c.id === value)?.label : value)}</td><td>${s.filter((row) => row[key] === value).length} / ${total}</td></tr>`,
      )
      .join("");
  const suggestions = analysis.feedback.filter((f) => f.suggestion.trim()),
    groups = splitGroups(analysis);
  return (
    title(
      "Dataset and exports",
      "Validate relationships, inspect missingness, then export a documented snapshot.",
    ) +
    `<div class="session-switch">${select("analysisConfiguration", "Analysis configuration", [["all", "All configurations"], ...data.configurations.map((c) => [c.id, c.label])], analysisConfiguration)}</div><div class="metrics"><div><strong>${total}</strong><span>sessions in this view</span></div><div><strong>${analysis.events.length}</strong><span>raw events in this view</span></div><div><strong>${new Set(groups.map((g) => g.leakageGroup)).size}</strong><span>connected split groups</span></div></div>` +
    note(
      `${mode === "demo" ? "Synthetic examples only." : "Personal/convenience sample only."} Counts describe this workspace, not the player population. No causal effect or research finding is established.`,
    ) +
    analysisView(analysis) +
    `<section class="panel panel-body"><h2>Validated export</h2><p>Exports contain the whole workspace, independent of the analysis filter. JSON preserves all relationships and original/reviewed labels. The ZIP adds related CSV tables, dictionary, split-group suggestions and a SHA-256 manifest. Study contact fields are blanked. No video bytes or account identity are exported. Free text and private references may still identify people: inspect before sharing.</p><div class="actions">${button("Export JSON", "export-json", "btn-primary")}${button("Export dataset ZIP", "export-zip")}<label class="btn file-button">Reimport JSON<input type="file" id="import-file" accept=".json,application/json"></label>${button("Download data dictionary", "dictionary")}</div><p class="helper">Reimport replaces this workspace after confirmation; it does not merge datasets or relabel their origin. Maximum 2 MB. CSV is an analysis view; use dataset.json for reimport.</p></section>
    <div class="work-grid"><section class="panel"><div class="panel-heading"><h2>Missingness</h2><span>Explicit denominators</span></div><table><thead><tr><th>Measure</th><th>Missing / sessions</th></tr></thead><tbody><tr><td>Known game version</td><td>${unknownVersion} / ${total}</td></tr><tr><td>Session feedback</td><td>${missingFeedback} / ${total}</td></tr><tr><td>Attached evidence</td><td>${s.filter((r) => r.evidenceKind === "none").length} / ${total}</td></tr></tbody></table></section><section class="panel"><div class="panel-heading"><h2>Experience breakdown</h2><span>Sessions, not unique people</span></div><table><thead><tr><th>Experience</th><th>Sessions / total</th></tr></thead><tbody>${breakdown("experience") || '<tr><td colspan="2">No sessions</td></tr>'}</tbody></table></section></div>
    <section class="panel"><div class="panel-heading"><h2>Configuration breakdown</h2></div><table><thead><tr><th>Configuration</th><th>Sessions / total</th></tr></thead><tbody>${breakdown("configurationId") || '<tr><td colspan="2">No sessions</td></tr>'}</tbody></table></section>
    <section class="panel panel-body"><h2>Suggestions in the collected sample</h2><p>${suggestions.length} of ${analysis.feedback.length} feedback records in this view contain an optional suggestion. This is not a population preference estimate; repeated responses from one person are not independent participants.</p>${suggestions.map((f) => `<blockquote>${esc(f.suggestion)}</blockquote>`).join("")}</section>
    <details class="panel panel-body"><summary>Inspect ${issues.length} quality warnings</summary><ul>${issues.map((w) => `<li>${esc(w)}</li>`).join("") || "<li>No recorded warnings.</li>"}</ul></details>
    ${mode === "local" ? `<section class="panel panel-body"><h2>Local data controls</h2><p>Browser storage is not encrypted, synced or guaranteed permanent. Anyone using this browser profile may access it. Export backups under your control.</p><div class="actions">${button("Reload saved local records", "reload-local")}${button("Download raw storage for recovery", "recover-local")}${button("Erase all local pilot records", "erase-local", "btn-danger")}</div></section>` : ""}`
  );
}
function collectionView() {
  return (
    title(
      "Private research collection",
      "Central storage is separate from this static website.",
    ) +
    note(
      config
        ? "Backend configured. Collection still requires an authenticated invited account and an active server-side study. Public recruitment remains disabled."
        : "Central submission unavailable. No private backend is configured. Your local drafts have not been submitted.",
      "warning",
    ) +
    `<section class="panel panel-body"><h2>Collection readiness</h2><ul class="readiness"><li>Private backend and server-side validation: ${config ? "client configuration present; server must be verified" : "not configured"}</li><li>Study contact, information version, retention and permission: required on the server</li><li>Access: invited accounts only; researcher role enforced on the server</li><li>Video upload: not supported; local files remain local</li><li>Public participant recruitment: disabled</li></ul><p>Do not enter personal records into the synthetic demonstration. No advertising trackers or AI services are connected. Hosting and backend providers may log requests; GitHub Pages logs visitor IP addresses.</p></section>
    ${config ? `<section class="panel panel-body"><h2>Invited technical pilot access</h2><p>Use an authenticated-user session token obtained from the researcher-managed sign-in flow. It stays in memory, never in drafts/exports. Do not use a service/admin key. This prototype does not collect passwords or send invitations.</p><form id="connect-form">${input("accessToken", "Authenticated-user access token", "", 'type="password" autocomplete="off" required')}<button class="btn" type="submit">Connect private session</button></form>${collection ? `<div class="actions">${button("Submit current local dataset", "central-submit", "btn-primary")}${button("Load authorised submissions", "central-list")}${button("Disconnect", "disconnect")}</div>` : ""}</section>` : `<section class="panel panel-body"><h2>What is missing?</h2><p>A Supabase project URL and public publishable key; deployed evidence-api function and database migration; server-managed study and invited membership; approved operational information; and successful access-control tests. No paid service has been provisioned.</p><button class="btn" disabled>Submit centrally (unavailable)</button></section>`}
    ${pendingReceipt ? `<section class="panel panel-body"><h2>Submission / withdrawal receipt</h2><p>Save both identifiers before submitting. Retrying the same request uses the same submission ID. Keep this receipt private.</p><dl class="facts"><dt>Submission</dt><dd class="mono">${pendingReceipt.submissionId}</dd><dt>Withdrawal code</dt><dd class="mono">${pendingReceipt.withdrawalCode}</dd></dl>${button("Download receipt", "receipt")}</section>` : ""}
    ${
      collection
        ? `<section class="panel panel-body"><h2>Withdraw a central submission</h2><form id="withdraw-form"><div class="form-grid">${input("submissionId", "Submission ID", "", "required")}${input("withdrawalCode", "Withdrawal code", "", "required")}</div><button class="btn btn-danger" type="submit">Delete my central submission</button></form><p>Requires the owning authenticated account and receipt. Local records and exported backups are separate.</p></section><section class="panel panel-body"><h2>Authorised central records</h2>${
            serverRows.length
              ? serverRows
                  .map(
                    (r) =>
                      `<article><span class="badge submitted">Centrally submitted</span> <span class="mono">${esc(r.id)}</span><p>${r.dataset.sessions.length} sessions · ${esc(r.created_at)}</p><button class="btn" data-central-export="${esc(r.id)}">Export this submitted record</button><details><summary>Server-authorised researcher review</summary><form class="central-review-form" data-submission-id="${esc(r.id)}">${select(
                        "eventId",
                        "Event",
                        r.dataset.events.map((e) => [e.id, e.label]),
                      )}${input("correctedLabel", "Reviewed label", "", "required")}${select("status", "Decision", ["verified", "uncertain", "excluded"])}${input("notes", "Review reason", "", "required")}<button class="btn" type="submit">Append server review</button></form><p>Only the server’s researcher allowlist can authorise this action.</p></details></article>`,
                  )
                  .join("")
              : "<p>No central records loaded. This list never uses local or demo data.</p>"
          }</section>`
        : ""
    }`
  );
}
function methodView() {
  return (
    title(
      "Method and limitations",
      "A collection instrument for a proposed research programme.",
    ) +
    `<article class="panel prose"><h2>From observation to evidence</h2><p>This instrument supports <em>Multimodal Learning of RPG System Interactions for Evidence-Based Game Design</em>. It collects configurations, timestamped observations and feedback, preserves provenance and supports researcher review. It does not implement the proposed relational predictor or establish novelty.</p><h2>Three distinct data modes</h2><dl><dt>Synthetic demonstration</dt><dd>Fictional examples in memory. They are not empirical observations and never become local or centrally submitted data.</dd><dt>Private local pilot</dt><dd>Records persist in this browser profile. No recording bytes are uploaded or stored. Browser clearing, quotas or device loss may remove drafts. Export a backup. Use a private device.</dd><dt>Private research collection</dt><dd>Available only with a configured backend, invited authentication and an active study. The server controls access; hiding a page is not authorisation. Public recruitment is disabled.</dd></dl><h2>What is and is not measured</h2><p>Annotations describe observable events, self-reports, machine suggestions or explicit unknowns. Video does not establish hidden hitboxes, invulnerability frames or causal engine rules. Custom 1–5 feedback items are not a validated scale. More playtime is not interpreted as enjoyment.</p><h2>Comparisons and later learning</h2><p>Ordinary human comparisons may include learning, fatigue and adaptation. Only properly documented simulator interventions can support their stated controlled interpretation. Keep entire players, sessions, source groups and comparison pairs together in later splits. The export provides grouping aids, not a ready-made experimental benchmark.</p><h2>Review and model boundaries</h2><p>Raw labels and feedback are never overwritten by corrections or AI text. Reviews append a new version. Imported VLM suggestions record model, version, prompt, interval and limitations; they require recorded ML permission and remain unreviewed. No hosted AI calls or model training run here.</p><h2>Privacy and withdrawal</h2><p>A local recording is opened through a temporary device URL. Reattach it after reload. Evidence links are not embedded or fetched automatically; opening a public link may disclose viewing metadata. Do not use links containing access tokens. Exports contain free text and may include references, so inspect them before sharing. Delete local sessions here, central submissions through the owning account, and exported backups separately. No anonymity guarantee is made; GitHub Pages logs visitor IPs.</p><h2>Affiliation and study status</h2><p>Independent prototype. No Capcom involvement, university ethics approval, research results, funding or admission is implied. Do not recruit participants until the applicable institutional review and operational requirements are settled.</p><h2>First personal pilot</h2><ol><li>Switch to Private local pilot and save a study.</li><li>Record a short clip on your device using your preferred capture tool.</li><li>Save a session with its configuration and exact recording duration.</li><li>Choose the local video, seek and mark one event.</li><li>Record neutral feedback, review the event, and export JSON plus ZIP.</li><li>Reimport the JSON in a cleared local workspace to verify your backup.</li></ol></article>`
  );
}

const routes: Record<
  string,
  { label: string; description: string; view: () => string }
> = {
  workspace: {
    label: "Workspace",
    description: "Overview and next steps",
    view: workspace,
  },
  study: {
    label: "Study protocol",
    description: "Question and information",
    view: studyView,
  },
  sessions: {
    label: "Sessions",
    description: "Context and configurations",
    view: sessionsView,
  },
  annotate: {
    label: "Annotate evidence",
    description: "Timestamped observations",
    view: annotateView,
  },
  feedback: {
    label: "Player feedback",
    description: "Neutral experience reports",
    view: feedbackView,
  },
  comparisons: {
    label: "Comparisons",
    description: "Configuration pairs",
    view: comparisonView,
  },
  review: {
    label: "Researcher review",
    description: "Labels and adjudication",
    view: reviewView,
  },
  dataset: {
    label: "Dataset & exports",
    description: "Quality and documented files",
    view: datasetView,
  },
  collection: {
    label: "Private collection",
    description: config ? "Invited access" : "Unavailable",
    view: collectionView,
  },
  method: {
    label: "Method & privacy",
    description: "Purpose and boundaries",
    view: methodView,
  },
};
function render() {
  if (!routes[page]) page = "workspace";
  app.innerHTML = `<a class="skip-link" href="#main-content">Skip to working area</a><div class="app-shell"><aside class="sidebar"><a href="#workspace" class="brand"><span class="brand-mark" aria-hidden="true">g<span>e</span></span><span>Gameplay<br><strong>Evidence Lab</strong></span></a><div class="sidebar-label">RESEARCH WORKBENCH</div><nav aria-label="Primary">${Object.entries(
    routes,
  )
    .map(
      ([key, r]) =>
        `<a href="#${key}" ${key === page ? 'aria-current="page"' : ""}><span>${r.label}</span>${key === "collection" ? `<span class="nav-state">${config ? "PRIVATE" : "OFF"}</span>` : ""}</a>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-foot"><strong>Evidence before inference.</strong><p>Independent prototype.<br>No participant recruitment.</p></div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumb">Research instruments <span>/</span> ${routes[page].label}</div><a href="#method">Protocol & privacy</a></header><div class="origin-bar ${mode}"><div><span class="origin-indicator" aria-hidden="true"></span><strong>${originLabel()}</strong><span>${mode === "demo" ? "Fictional records. No research findings." : "This device only. Not centrally submitted."}</span></div><div class="mode-switch" role="group" aria-label="Data mode"><button type="button" data-mode="demo" aria-pressed="${mode === "demo"}">Synthetic demo</button><button type="button" data-mode="local" aria-pressed="${mode === "local"}">Private local pilot</button></div></div><main id="main-content"><div id="error-summary" role="alert" tabindex="-1" ${!error ? "hidden" : ""}>${esc(error)}</div><div id="status-message" role="status" aria-live="polite" ${!status ? "hidden" : ""}>${esc(status)}</div>${routes[page].view()}</main><footer class="app-footer"><span>No recordings leave this device automatically.</span><span>Instrument 0.1 · Schema 1.0</span></footer></div></div>`;
  document.querySelector("h1")?.setAttribute("tabindex", "-1");
  wire();
}
function dataForm(form: HTMLFormElement) {
  const f = new FormData(form);
  return {
    get: (key: string) => String(f.get(key) ?? "").trim(),
    number: (key: string) => Number(f.get(key)),
    bool: (key: string) => f.has(key),
  };
}
function wire() {
  const studyImport = document.querySelector<HTMLInputElement>("#study-import");
  if (studyImport)
    studyImport.onchange = async () => {
      const file = studyImport.files?.[0];
      if (!file) return;
      try {
        if (file.size > 64000)
          throw new Error("Study configuration exceeds 64 KB.");
        const study = studySchema.parse(JSON.parse(await file.text()));
        if (data.studies.some((s) => s.id === study.id))
          throw new Error(
            "This study ID already exists. Use the saved study rather than replacing its history.",
          );
        const next = structuredClone(data);
        next.studies.push(study);
        save(
          next,
          "Study configuration imported locally. Central activation is still controlled by the server.",
        );
        draftStudy = study;
        render();
      } catch (e) {
        showError(e);
      }
    };
  document.querySelector<HTMLAnchorElement>(".skip-link")!.onclick = (e) => {
    e.preventDefault();
    document.querySelector<HTMLElement>("h1")?.focus();
  };
  document
    .querySelectorAll<HTMLAnchorElement>('nav a, .brand, a[href^="#"]')
    .forEach((a) =>
      a.addEventListener("click", (e) => {
        const next = a.hash.slice(1);
        if (routes[next]) {
          e.preventDefault();
          navigate(next);
        }
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((b) => (b.onclick = () => switchMode(b.dataset.mode as Mode)));
  document
    .querySelectorAll<HTMLButtonElement>("[data-action]")
    .forEach((b) => (b.onclick = () => void action(b.dataset.action!)));
  document.querySelectorAll<HTMLButtonElement>("[data-session]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedSession = b.dataset.session!;
        navigate("annotate");
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedEvent = b.dataset.review!;
        navigate("review");
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-study]").forEach(
    (b) =>
      (b.onclick = () => {
        draftStudy = data.studies.find((s) => s.id === b.dataset.study)!;
        render();
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-delete-session]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          confirm(
            "Delete this session and all linked events, feedback, reviews, predictions and comparisons? Exported backups are unaffected.",
          )
        ) {
          try {
            save(
              deleteSession(data, b.dataset.deleteSession!),
              "Session and linked records deleted.",
            );
            if (mediaSession === b.dataset.deleteSession) clearMedia();
            render();
          } catch (e) {
            showError(e);
          }
        }
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-seek]").forEach(
    (b) =>
      (b.onclick = () => {
        const player = document.querySelector<HTMLVideoElement>("#player");
        if (player && mediaSession === b.dataset.eventSession) {
          player.currentTime = Number(b.dataset.seek);
          player.focus();
        } else
          showError(
            new Error(
              "Reattach the recording for this session to seek to its evidence.",
            ),
          );
      }),
  );
  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    form.oninput = () => {
      dirty = true;
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      void handleForm(form);
    };
  });
  document
    .querySelectorAll<HTMLSelectElement>(".session-switch select")
    .forEach(
      (s) =>
        (s.onchange = () => {
          if (dirty && !confirm("Discard the unsaved form changes?")) {
            s.value = s.name === "sessionId" ? selectedSession : selectedEvent;
            return;
          }
          dirty = false;
          if (s.name === "analysisConfiguration")
            analysisConfiguration = s.value;
          else if (s.name === "sessionId") selectedSession = s.value;
          else selectedEvent = s.value;
          startMark = 0;
          endMark = 0;
          render();
        }),
    );
  const studySelect = document.querySelector<HTMLSelectElement>(
    '#session-form [name="studyId"]',
  );
  if (studySelect)
    studySelect.onchange = () => {
      const study = data.studies.find((s) => s.id === studySelect.value)!;
      const info = document.querySelector<HTMLElement>(".information")!;
      info.innerHTML = `<h3>Information and choices</h3><p>Protocol ${esc(study.protocolVersion)} · Information ${esc(study.consentVersion)}</p><p id="study-info">${esc(study.informationText)}</p><p><strong>Permitted media use:</strong> ${esc(study.permittedMediaUse)}</p><p><strong>Study contact:</strong> ${esc(study.contact) || "No central study contact configured; personal local pilot only."}</p><p><strong>Withdrawal:</strong> ${esc(study.deletion)}</p><p>${esc(study.retention)}</p><p>Media reuse and ML processing are optional and separate. Your choices have been reset for this study.</p>${check("adultConfirmed", "I am 18 or older (or the recorded controller is simulated and I am an adult researcher).")}${check("participation", "I have read this study information and agree to record this pilot session.")}${check("mediaReuse", "Optional: permit recording/media reuse under this study’s stated permitted use.")}${check("mlProcessing", "Optional: permit ML-assisted processing under this study’s stated permitted use. No model is called by this prototype.")}`;
      const configurations = document.querySelector<HTMLSelectElement>(
        '#session-form [name="configurationId"]',
      )!;
      configurations.innerHTML =
        option("new", "Create a new configuration") +
        data.configurations
          .filter((c) => c.studyId === study.id)
          .map((c) => option(c.id, c.label))
          .join("");
      for (const name of ["configurationLabel", "equipment"]) {
        const field = document.querySelector<HTMLInputElement>(
          `#session-form [name="${name}"]`,
        )!;
        field.required = true;
        field.disabled = false;
      }
      dirty = true;
    };
  const configurationSelect = document.querySelector<HTMLSelectElement>(
    '#session-form [name="configurationId"]',
  );
  if (configurationSelect)
    configurationSelect.onchange = () => {
      for (const name of ["configurationLabel", "equipment"]) {
        const field = document.querySelector<HTMLInputElement>(
          `#session-form [name="${name}"]`,
        )!;
        field.required = configurationSelect.value === "new";
        field.disabled = configurationSelect.value !== "new";
      }
    };
  const videoFile = document.querySelector<HTMLInputElement>("#video-file");
  if (videoFile)
    videoFile.onchange = async () => {
      const file = videoFile.files?.[0];
      if (!file) return;
      if (
        dirty &&
        !confirm(
          "Discard unsaved annotation form changes to attach this recording?",
        )
      )
        return;
      const snapshot = data,
        session = activeSession()!,
        activeMode = mode;
      let preparedURL = "";
      videoFile.disabled = true;
      try {
        const prepared = await prepareLocalVideo(file, session.durationSeconds);
        preparedURL = prepared.url;
        if (
          data !== snapshot ||
          mode !== activeMode ||
          activeSession()?.id !== session.id
        )
          throw new Error(
            "The workspace changed while the recording was checked. Select the recording again.",
          );
        const next = structuredClone(data),
          s = next.sessions.find((s) => s.id === session.id)!;
        s.evidenceKind = "local-file";
        s.evidenceRef = "";
        s.mediaId = s.mediaId || uid();
        save(
          next,
          prepared.durationStatus === "matched"
            ? "Recording attached locally after duration validation. No video bytes were saved or uploaded."
            : "Recording attached locally. This clip has no finite duration metadata; verify the stated session duration manually. No video bytes were saved or uploaded.",
        );
        if (mediaURL) URL.revokeObjectURL(mediaURL);
        mediaURL = preparedURL;
        preparedURL = "";
        mediaName = file.name;
        mediaSession = session.id;
        render();
      } catch (e) {
        showError(e);
      } finally {
        if (preparedURL) URL.revokeObjectURL(preparedURL);
        videoFile.disabled = false;
        videoFile.value = "";
      }
    };
  const player = document.querySelector<HTMLVideoElement>("#player");
  if (player)
    player.onerror = () =>
      showError(
        new Error(
          "Recording playback failed. Try a supported MP4 or WebM codec. Check the evidence before annotating.",
        ),
      );
  const importFile = document.querySelector<HTMLInputElement>("#import-file");
  if (importFile)
    importFile.onchange = async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2_000_000) throw new Error("Dataset exceeds 2 MB.");
        const next = await importEnvelope(
          await file.text(),
          mode === "demo" ? "synthetic" : "local",
        );
        if (
          !confirm(
            "Replace this workspace with the validated import? Export a backup first if needed.",
          )
        )
          return;
        save(
          next,
          "Dataset imported; relationships and checksum validated. Local clips must be reattached.",
        );
        selectedSession = "";
        selectedEvent = "";
        draftStudy = null;
        analysisConfiguration = "all";
        clearMedia();
        render();
      } catch (e) {
        showError(e);
      }
    };
  document.querySelectorAll<HTMLButtonElement>("[data-central-export]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          const row = serverRows.find((r) => r.id === b.dataset.centralExport)!;
          download(
            `submitted-${row.id}.json`,
            JSON.stringify(await exportEnvelope(checked(row.dataset)), null, 2),
            "application/json",
          );
        } catch (e) {
          showError(e);
        }
      }),
  );
}
async function handleForm(form: HTMLFormElement) {
  const f = dataForm(form),
    next = structuredClone(data);
  try {
    if (form.id === "study-form") {
      const current = draftStudy ?? studyTemplate();
      const s = {
        ...current,
        ...Object.fromEntries(
          [
            "title",
            "protocolVersion",
            "consentVersion",
            "question",
            "inclusion",
            "measures",
            "permittedMediaUse",
            "retention",
            "deletion",
            "contact",
            "informationText",
          ].map((k) => [k, f.get(k)]),
        ),
      };
      assertStudyRevision(data, s);
      const index = next.studies.findIndex((r) => r.id === s.id);
      if (index < 0) next.studies.push(s);
      else next.studies[index] = s;
      save(next, "Study saved locally. Recruitment remains disabled.");
      draftStudy = s;
    } else if (form.id === "session-form") {
      if (!f.bool("adultConfirmed") || !f.bool("participation"))
        throw new Error(
          "Adult confirmation and agreement to the study information are required. Optional permissions remain optional.",
        );
      const study = next.studies.find((s) => s.id === f.get("studyId"))!;
      let configurationId = f.get("configurationId");
      if (configurationId === "new") {
        configurationId = uid();
        next.configurations.push({
          id: configurationId,
          studyId: study.id,
          label: f.get("configurationLabel"),
          equipment: f.get("equipment"),
          properties: f.get("propertyName")
            ? [
                {
                  name: f.get("propertyName"),
                  value: f.get("propertyValue")
                    ? f.number("propertyValue")
                    : null,
                  unit: f.get("propertyUnit"),
                  status: f.get("propertyStatus") as "unknown",
                  source: f.get("propertySource"),
                },
              ]
            : [],
          createdAt: now(),
        });
      }
      const id = uid();
      next.sessions.push({
        id,
        studyId: study.id,
        configurationId,
        participantId: f.get("participantId"),
        groupId: f.get("groupId"),
        game: f.get("game"),
        gameVersion: f.get("gameVersion"),
        platform: f.get("platform"),
        experience: f.get("experience") as Session["experience"],
        encounter: f.get("encounter"),
        conditions: f.get("conditions"),
        durationSeconds: f.number("durationSeconds"),
        source: f.get("source") as Session["source"],
        evidenceKind: f.get("evidenceRef") ? "private-reference" : "none",
        evidenceRef: f.get("evidenceRef"),
        mediaId: "",
        createdAt: now(),
        consent: {
          adultConfirmed: true,
          participation: true,
          mediaReuse: f.bool("mediaReuse"),
          mlProcessing: f.bool("mlProcessing"),
          version: study.consentVersion,
          recordedAt: now(),
        },
      });
      save(
        next,
        "Session saved on this device. It has not been centrally submitted.",
      );
      selectedSession = id;
    } else if (form.id === "event-form") {
      const session = activeSession()!;
      next.events.push({
        id: uid(),
        sessionId: session.id,
        startSeconds: f.number("startSeconds"),
        endSeconds: f.number("endSeconds"),
        label: f.get("label"),
        components: f
          .get("components")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        outcome: f.get("outcome"),
        note: f.get("note"),
        provenance: f.get("provenance") as "observed",
        verification: "unreviewed",
        source: f.get("source"),
        annotationVersion: 1,
        createdAt: now(),
      });
      save(
        next,
        "Event saved as an original annotation. Researcher review is separate.",
      );
    } else if (form.id === "feedback-form") {
      next.feedback.push({
        id: uid(),
        sessionId: activeSession()!.id,
        eventId: f.get("eventId") || null,
        intendedAction: f.get("intendedAction"),
        occurred: f.get("occurred"),
        control: f.get("control") ? f.number("control") : null,
        difficulty: f.get("difficulty") ? f.number("difficulty") : null,
        enjoyment: f.get("enjoyment") ? f.number("enjoyment") : null,
        suggestion: f.get("suggestion"),
        instrument: "custom-pilot-v1",
        createdAt: now(),
      });
      save(
        next,
        "Raw feedback saved. No paraphrase or preference inference was made.",
      );
    } else if (form.id === "comparison-form") {
      next.comparisons.push({
        id: uid(),
        sessionA: f.get("sessionA"),
        sessionB: f.get("sessionB"),
        factorChanged: f.get("factorChanged"),
        kind: f.get("kind") as "observational-human",
        order: f.get("order"),
        startingStateRef: f.get("startingStateRef"),
        seedRef: f.get("seedRef"),
        controllerRef: f.get("controllerRef"),
        outcomeNotes: f.get("outcomeNotes"),
        createdAt: now(),
      });
      save(next, "Comparison saved with its stated limitations.");
    } else if (form.id === "review-form") {
      const event = data.events.find((e) => e.id === selectedEvent)!;
      next.reviews.push({
        id: uid(),
        eventId: event.id,
        reviewerId: f.get("reviewerId"),
        originalLabel: event.label,
        correctedLabel: f.get("correctedLabel"),
        status: f.get("status") as "verified",
        notes: f.get("notes"),
        annotationVersion:
          (latestReview(data, event.id)?.annotationVersion ?? 1) + 1,
        createdAt: now(),
      });
      save(next, "Review appended. Original annotation preserved.");
    } else if (form.id === "prediction-form") {
      if (f.get("predictions").length > 200_000)
        throw new Error("Prediction import exceeds 200 KB.");
      const rows = JSON.parse(f.get("predictions"));
      if (!Array.isArray(rows)) throw new Error("Import a JSON array.");
      next.predictions.push(...rows);
      save(
        next,
        "Machine suggestions imported separately and left unreviewed.",
      );
    } else if (form.id === "connect-form") {
      collection = new PrivateCollection(config!, f.get("accessToken"));
      dirty = false;
      setStatus(
        "Session token loaded in memory. Server authorisation is checked on each request.",
      );
    } else if (form.id === "withdraw-form") {
      await collection!.withdraw(
        f.get("submissionId"),
        f.get("withdrawalCode"),
      );
      serverRows = [];
      dirty = false;
      setStatus(
        "Server confirmed central deletion. Local copies and exported backups are unaffected.",
      );
    } else if (form.classList.contains("central-review-form")) {
      const row = serverRows.find((r) => r.id === form.dataset.submissionId)!;
      const event = row.dataset.events.find((e) => e.id === f.get("eventId"))!;
      await collection!.review(row.id, {
        id: uid(),
        eventId: event.id,
        reviewerId: "server-researcher",
        originalLabel: event.label,
        correctedLabel: f.get("correctedLabel"),
        status: f.get("status"),
        notes: f.get("notes"),
        annotationVersion:
          (latestReview(row.dataset, event.id)?.annotationVersion ?? 1) + 1,
        createdAt: now(),
      });
      dirty = false;
      serverRows = [];
      setStatus(
        "Server confirmed researcher review. Reload authorised submissions to inspect it.",
      );
    }
    render();
  } catch (e) {
    showError(e);
  }
}
async function action(name: string) {
  try {
    if (name === "new-session") navigate("sessions");
    else if (name === "go-study") navigate("study");
    else if (name === "go-annotate") navigate("annotate");
    else if (name === "new-study") {
      draftStudy = studyTemplate();
      navigate("study");
    } else if (name === "review-evidence") {
      selectedSession = data.events.find(
        (e) => e.id === selectedEvent,
      )!.sessionId;
      navigate("annotate");
    } else if (name === "mark-start" || name === "mark-end") {
      const player = document.querySelector<HTMLVideoElement>("#player");
      if (!player)
        throw new Error("Choose a local recording before marking an interval.");
      const field = document.querySelector<HTMLInputElement>(
        `[name="${name === "mark-start" ? "startSeconds" : "endSeconds"}"]`,
      )!;
      field.value = player.currentTime.toFixed(3);
      if (name === "mark-start") startMark = player.currentTime;
      else endMark = player.currentTime;
      dirty = true;
    } else if (name === "export-json") {
      download(
        `${data.origin}-evidence.json`,
        JSON.stringify(await exportEnvelope(data), null, 2),
        "application/json",
      );
      setStatus(
        "Validated JSON exported. Inspect free text and references before sharing.",
      );
      render();
    } else if (name === "export-zip") {
      download(
        `${data.origin}-evidence.zip`,
        await exportZip(data),
        "application/zip",
      );
      setStatus(
        "Dataset ZIP exported with tables, dictionary, grouping and manifest.",
      );
      render();
    } else if (name === "dictionary")
      download(
        "data-dictionary.json",
        JSON.stringify(DICTIONARY, null, 2),
        "application/json",
      );
    else if (name === "erase-local") {
      if (
        confirm(
          "Erase all local pilot records from this browser? Exported backups and original video files are unaffected.",
        )
      ) {
        eraseLocal();
        clearMedia();
        local = loadLocal();
        data = local.data;
        draftStudy = null;
        dirty = false;
        pendingReceipt = null;
        selectedSession = selectedEvent = "";
        analysisConfiguration = "all";
        setStatus("All local pilot records erased.");
        render();
      }
    } else if (name === "recover-local") {
      download(
        "private-local-storage-recovery.txt",
        localStorage.getItem(LOCAL_KEY) ?? "",
        "text/plain",
      );
      setStatus(
        "Raw saved storage downloaded for private recovery. It may contain sensitive text and is not a validated export.",
      );
      render();
    } else if (name === "reload-local") {
      if (
        dirty &&
        !confirm(
          "Discard this tab’s unsaved form changes and reload saved records?",
        )
      )
        return;
      clearMedia();
      local = loadLocal();
      data = local.data;
      draftStudy = null;
      selectedEvent = selectedSession = "";
      dirty = false;
      pendingReceipt = null;
      analysisConfiguration = "all";
      if (local.error) showError(new Error(local.error));
      else
        setStatus(
          "Saved local records reloaded. Other tabs may still hold older snapshots.",
        );
      render();
    } else if (name === "disconnect") {
      collection = null;
      serverRows = [];
      pendingReceipt = null;
      setStatus("Private session disconnected. No token was persisted.");
      render();
    } else if (name === "central-list") {
      const result = await collection!.list();
      serverRows = result.submissions.map(
        (row: { id: string; dataset: unknown; created_at: string }) => ({
          ...row,
          dataset: checked(row.dataset),
        }),
      );
      setStatus("Authorised central records loaded from the server.");
      render();
    } else if (name === "central-submit") {
      if (mode !== "local")
        throw new Error(
          "Synthetic examples cannot be submitted. Switch to the private local pilot.",
        );
      if (!pendingReceipt) {
        pendingReceipt = { submissionId: uid(), withdrawalCode: uid() };
        setStatus(
          "Receipt prepared. Save it, then click Submit current local dataset again to confirm transfer. No request sent yet.",
        );
        render();
        return;
      }
      const result = await collection!.submit(
        data,
        pendingReceipt.submissionId,
        pendingReceipt.withdrawalCode,
      );
      if (result.submissionId !== pendingReceipt.submissionId)
        throw new Error(
          "Server receipt did not match. Persistence is not confirmed.",
        );
      setStatus(
        `Server confirmed private persistence: ${result.submissionId}. Keep your withdrawal receipt. Local data remains local until you change it.`,
      );
      render();
    } else if (name === "receipt")
      download(
        "private-withdrawal-receipt.json",
        JSON.stringify(pendingReceipt, null, 2),
        "application/json",
      );
  } catch (e) {
    showError(e);
  }
}
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1);
  if (next !== page) {
    if (dirty && !confirm("Discard unsaved form changes?")) {
      location.hash = page;
      return;
    }
    dirty = false;
    page = next;
    render();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("storage", (event) => {
  if (mode === "local" && (event.key === LOCAL_KEY || event.key === null))
    showError(
      new Error(
        "Local records changed in another tab. This tab has kept its snapshot. Export it if needed, then use Dataset & exports → Reload saved local records before saving.",
      ),
    );
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,textarea,select")) return;
  if (e.key === "[" || e.key === "]") {
    e.preventDefault();
    void action(e.key === "[" ? "mark-start" : "mark-end");
  }
});
render();
