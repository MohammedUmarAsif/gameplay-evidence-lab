import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

async function localStudy(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await page.getByRole("link", { name: "Study protocol", exact: true }).click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Study saved");
}
async function newSession(page: Page, duration = "10") {
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await page
    .getByLabel("Game title", { exact: true })
    .fill("Personal test game");
  await page
    .getByLabel("New configuration label", { exact: true })
    .fill("Pilot configuration A");
  await page
    .getByLabel("Recording / session duration in seconds")
    .fill(duration);
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Adult confirmation");
  await page.getByLabel("I am 18 or older", { exact: false }).check();
  await page
    .getByLabel("I have read this study information", { exact: false })
    .check();
  await expect(
    page.getByLabel("Optional: permit recording/media reuse", { exact: false }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Optional: permit ML-assisted processing", {
      exact: false,
    }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Session saved");
}
test("complete local workflow: study, session, annotation, feedback, review, export, reimport and deletion", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (!new URL(req.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(req.url());
  });
  await localStudy(page);
  await newSession(page);
  await page.getByRole("button", { name: "Annotate", exact: true }).click();
  await page.getByLabel("Start (seconds)", { exact: true }).fill("2");
  await page.getByLabel("End (seconds)", { exact: true }).fill("1");
  await page.getByLabel("Action / event label").fill("Attack attempted");
  await page
    .getByLabel("Observed outcome", { exact: true })
    .fill("Action interrupted");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("after its start");
  await page.getByLabel("End (seconds)", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Event saved");
  await page
    .getByRole("link", { name: "Player feedback", exact: true })
    .click();
  await page
    .getByLabel("What were you trying to do?", { exact: true })
    .fill("Complete an attack");
  await page
    .getByLabel("What happened?", { exact: true })
    .fill("The attack was interrupted");
  await page
    .getByLabel("How much control did you feel you had?", { exact: true })
    .selectOption("2");
  await page
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Raw feedback saved");
  await page
    .getByRole("link", { name: "Researcher review", exact: true })
    .click();
  await page
    .getByLabel("Reviewed label", { exact: true })
    .fill("Attack interrupted");
  await page.getByLabel("Verification decision").selectOption("uncertain");
  await page
    .getByLabel("Reason / adjudication note")
    .fill("Visible interruption; hidden cause unknown");
  await page
    .getByRole("button", { name: "Append review", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Original annotation preserved",
  );
  await expect(
    page.getByRole("heading", { name: "Attack attempted", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("v2 · Attack interrupted", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const file = await downloadEvent;
  const path = await file.path();
  expect(path).toBeTruthy();
  const envelope = JSON.parse(await readFile(path!, "utf8"));
  expect(envelope.dataset.origin).toBe("local");
  expect(envelope.dataset.events[0].label).toBe("Attack attempted");
  expect(envelope.dataset.reviews[0].correctedLabel).toBe("Attack interrupted");
  expect(envelope.dataset.feedback[0].enjoyment).toBeNull();
  page.on("dialog", (d) => d.accept());
  await page.locator("#import-file").setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText(
    "relationships and checksum validated",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(
    page
      .getByText("Personal test game", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "linked records deleted",
  );
  await page
    .getByRole("link", { name: "Researcher review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No events to review" }),
  ).toBeVisible();
  expect(external).toEqual([]);
});
test("synthetic isolation, unavailable collection and export tamper rejection", async ({
  page,
}) => {
  await page.goto("/#collection");
  await expect(
    page.getByRole("button", { name: "Submit centrally (unavailable)" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Central submission unavailable.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  await page
    .getByLabel("Analysis configuration", { exact: true })
    .selectOption("demo-b");
  await expect(
    page.getByText("0 of 0 feedback records in this view", { exact: false }),
  ).toBeVisible();
  const de = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const downloaded = await de;
  const path = (await downloaded.path())!;
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await page.locator("#import-file").setInputFiles(path);
  await expect(page.getByRole("alert")).toContainText("local records only");
  await page
    .getByRole("button", { name: "Synthetic demo", exact: true })
    .click();
  await page.getByRole("link", { name: "Workspace", exact: true }).click();
  await expect(
    page
      .getByText("Example RPG (fictional)", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(2);
});
test("mobile/desktop accessible layouts, keyboard navigation and hash direct navigation", async ({
  page,
}, testInfo) => {
  for (const route of [
    "workspace",
    "study",
    "sessions",
    "annotate",
    "feedback",
    "comparisons",
    "review",
    "dataset",
    "collection",
    "method",
    "explorer",
    "learning",
    "roadmap",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      `overflow on ${route}`,
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, `${route} accessibility violations`).toEqual([]);
  }
  await page.goto("/");
  await page.screenshot({
    path: `docs/screenshots/field-workspace-${testInfo.project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to working area" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toBeFocused();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-workspace.png`,
    fullPage: true,
  });
});
test("local video selection and marking never send recording bytes", async ({
  page,
}) => {
  await localStudy(page);
  await newSession(page);
  await page.getByRole("button", { name: "Annotate", exact: true }).click();
  // Generate a disposable synthetic recording inside the test browser. No game assets or personal video.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#214a42";
    ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px sans-serif";
    ctx.fillText("Synthetic playback fixture", 35, 90);
    const stream = canvas.captureStream(10),
      recorder = new MediaRecorder(stream, { mimeType: "video/webm" }),
      chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const result = new Promise<number[]>((resolve) => {
      recorder.onstop = async () =>
        resolve(
          Array.from(
            new Uint8Array(
              await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
            ),
          ),
        );
    });
    recorder.start();
    let frame = 0;
    const drawing = setInterval(() => {
      ctx.fillStyle = frame++ % 2 ? "#214a42" : "#315a52";
      ctx.fillRect(0, 0, 320, 180);
    }, 50);
    await new Promise((resolve) => setTimeout(resolve, 600));
    clearInterval(drawing);
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    return result;
  });
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") posts.push(r.url());
  });
  await page.locator("#video-file").setInputFiles({
    name: "synthetic-playback.webm",
    mimeType: "video/webm",
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByRole("alert")).toContainText("Nothing was attached");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("gameplay-evidence-lab:local:v1")!)
          .sessions[0].evidenceKind,
    ),
  ).toBe("none");
  await newSession(page, "0.6");
  await page
    .getByRole("button", { name: "Annotate", exact: true })
    .filter({ visible: true })
    .last()
    .click();
  await page.locator("#video-file").setInputFiles({
    name: "synthetic-playback.webm",
    mimeType: "video/webm",
    buffer: Buffer.from(bytes),
  });
  await expect(page.locator("video")).toBeVisible();
  await expect(
    page.getByText("synthetic-playback.webm · never uploaded"),
  ).toBeVisible();
  await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
    await video.play();
  });
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Mark start [", exact: true }).click();
  expect(
    await page.getByLabel("Start (seconds)", { exact: true }).inputValue(),
  ).toMatch(/^\d/);
  expect(posts).toEqual([]);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dataset and exports", exact: true }),
  ).toBeVisible();
});
test("production assets and direct navigation work under a GitHub Pages repository subpath", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await page.goto("http://127.0.0.1:4174/test-repository/#review");
  await expect(
    page.getByRole("heading", { name: "Researcher review", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Researcher review", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dataset and exports" }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});
test("320px workspace and dataset do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of [
    "workspace",
    "dataset",
    "sessions",
    "annotate",
    "review",
    "explorer",
    "learning",
    "roadmap",
  ]) {
    await page.goto(`/#${route}`);
    const size = await page.evaluate(() => ({
      width: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
      wraps: Array.from(document.querySelectorAll(".table-wrap")).map((e) => ({
        width: e.clientWidth,
        scroll: e.scrollWidth,
        overflow: getComputedStyle(e).overflowX,
      })),
      overflow: Array.from(document.querySelectorAll("*"))
        .filter(
          (e) =>
            e.getBoundingClientRect().right > window.innerWidth + 1 &&
            !e.closest(".table-wrap"),
        )
        .map((e) => ({
          tag: e.tagName,
          class: e.className,
          right: e.getBoundingClientRect().right,
        }))
        .slice(0, 10),
    }));
    expect(
      size.scroll <= size.width + 1,
      `${route}: ${JSON.stringify(size)}`,
    ).toBe(true);
  }
});

test("baseline lab refuses sparse evidence, runs synthetic grouped evaluation and exports its provenance", async ({
  page,
}, testInfo) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") writes.push(r.url());
  });
  await page.goto("/#learning");
  await page
    .getByRole("button", { name: "Run fixed baseline", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("3 independent");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Load synthetic benchmark", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run fixed baseline", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Experiment readout" }),
  ).toBeVisible();
  await expect(
    page.getByText("18 train / 6 test events", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "100.0%", exact: true }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: `docs/screenshots/field-lab-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export experiment JSON" }).click();
  const file = await downloading,
    report = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(report.origin).toBe("synthetic");
  expect(report.sourceDatasetSHA256).toMatch(/^[a-f0-9]{64}$/);
  expect(
    report.split.trainGroups.some((g: string) =>
      report.split.testGroups.includes(g),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No experiment run" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load synthetic benchmark" }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("interaction atlas filters evidence and preserves a route to review", async ({
  page,
}) => {
  await page.goto("/#explorer");
  await page
    .getByLabel("Search components, labels or outcomes")
    .fill("committed-attack");
  await page
    .getByRole("button", { name: "Explore evidence", exact: true })
    .click();
  await expect(page.locator(".event-list article")).toHaveCount(1);
  await expect(page.locator(".event-list")).toContainText("Attack interrupted");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Researcher review", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Interaction atlas", exact: true })
    .click();
  await page.getByLabel("Latest human review must be verified").check();
  await page
    .getByRole("button", { name: "Explore evidence", exact: true })
    .click();
  await expect(page.locator(".event-list article")).toHaveCount(0);
});

test("Wilds pilot starter creates only an editable local draft and leaves optional consent unselected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Plan a Wilds pilot" }).click();
  await expect(page.locator(".origin-bar strong")).toHaveText(
    "Private local pilot",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("gameplay-evidence-lab:local:v1") ??
            '{"studies":[]}',
        ).studies.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(page.getByLabel("Game title", { exact: true })).toHaveValue(
    "Monster Hunter Wilds",
  );
  await expect(
    page.getByLabel("Optional: permit ML-assisted processing", {
      exact: false,
    }),
  ).not.toBeChecked();
});

test("descriptive charts keep origins, denominators, missing ratings and filtered scope explicit", async ({
  page,
}, testInfo) => {
  await page.goto("/#dataset");
  await expect(
    page.getByRole("heading", { name: "Human review status" }),
  ).toBeVisible();
  const reviews = page.getByRole("region", { name: "Human review status" });
  await expect(reviews).toContainText("Review pending");
  await expect(reviews).toContainText("2 / 2");
  const ratings = page.getByRole("region", {
    name: "Feedback response distributions",
  });
  await expect(ratings).toContainText("0 answered / 1 records · 1 missing");
  await expect(
    page.getByText("6.4 / 240 recorded seconds", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/synthetic-analytics-${testInfo.project.name}.png`,
    fullPage: true,
  });
  if (testInfo.project.name === "desktop")
    await page.screenshot({
      path: "docs/screenshots/synthetic-analytics-overview.png",
    });
  await page.getByLabel("Analysis configuration").selectOption("demo-b");
  await expect(
    page.getByText("3 / 120 recorded seconds", { exact: true }),
  ).toBeVisible();
  await expect(ratings).toContainText("0 answered / 0 records · 0 missing");
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await expect(
    page.getByText("0 / 0 recorded seconds", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("not available (no sessions)", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("3 / 120 recorded seconds", { exact: true }),
  ).toHaveCount(0);
});

test("a stale tab cannot overwrite newer local records and can explicitly reload them", async ({
  page,
  context,
}) => {
  await localStudy(page);
  const other = await context.newPage();
  await other.goto("/#study");
  await other
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await newSession(page);
  await expect(other.getByRole("alert")).toContainText("another tab");
  await other.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(other.getByRole("alert")).toContainText(
    "No data was overwritten",
  );
  expect(
    await other.evaluate(
      () =>
        JSON.parse(localStorage.getItem("gameplay-evidence-lab:local:v1")!)
          .sessions.length,
    ),
  ).toBe(1);
  await other
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Reload saved local records", exact: true })
    .click();
  await expect(other.getByRole("status")).toContainText("reloaded");
  await other.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(
    other
      .getByRole("button", { name: "Annotate", exact: true })
      .filter({ visible: true }),
  ).toHaveCount(1);
  await other.close();
});

test("unplayable video does not attach an evidence reference", async ({
  page,
}) => {
  await localStudy(page);
  await newSession(page);
  await page.getByRole("button", { name: "Annotate", exact: true }).click();
  await page.locator("#video-file").setInputFiles({
    name: "invalid.webm",
    mimeType: "video/webm",
    buffer: Buffer.from("deliberately invalid synthetic fixture"),
  });
  await expect(page.getByRole("alert")).toContainText("Nothing was attached");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("gameplay-evidence-lab:local:v1")!)
          .sessions[0].evidenceKind,
    ),
  ).toBe("none");
  await expect(page.locator("video")).toHaveCount(0);
});

test("corrupt saved storage is preserved, recoverable and never silently overwritten", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "gameplay-evidence-lab:local:v1",
      "DAMAGED_SYNTHETIC_RECOVERY_FIXTURE",
    ),
  );
  await page
    .getByRole("button", { name: "Private local pilot", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("preserved");
  await page
    .getByRole("link", { name: "Dataset & exports", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download raw storage for recovery" })
    .click();
  const download = await downloading;
  expect(await readFile((await download.path())!, "utf8")).toBe(
    "DAMAGED_SYNTHETIC_RECOVERY_FIXTURE",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("gameplay-evidence-lab:local:v1"),
    ),
  ).toBe("DAMAGED_SYNTHETIC_RECOVERY_FIXTURE");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Erase all local pilot records" })
    .click();
  await expect(page.getByRole("status")).toContainText("erased");
});
