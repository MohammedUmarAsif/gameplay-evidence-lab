import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// Use an isolated browser profile; never read the operator's pilot records.
const url = new URL(
  process.env.SITE_URL ??
    "https://mohammedumarasif.github.io/gameplay-evidence-lab/",
);
assert.equal(url.protocol, "https:");
const browser = await chromium.launch();
const failures = [],
  external = [],
  writes = [],
  runtimeErrors = [];
const checks = [];
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 1000 : 844 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        failures.push(`${response.status()} ${response.url()}`);
    });
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== url.origin)
        external.push(request.url());
      if (request.method() !== "GET")
        writes.push(`${request.method()} ${request.url()}`);
    });
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
    ]) {
      await page.goto(`${url.href}#${route}`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("nav a[aria-current]")).toHaveAttribute(
        "href",
        `#${route}`,
      );
      await expect(page.locator(".origin-bar strong")).toHaveText(
        "Synthetic demonstration",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow: ${width}px #${route}`,
      );
      checks.push(`${width}px #${route}`);
    }
    await page.goto(`${url.href}#collection`);
    await expect(
      page.getByRole("button", {
        name: "Submit centrally (unavailable)",
        exact: true,
      }),
    ).toBeDisabled();
    await page.goto(`${url.href}#review`);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Researcher review", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Private local pilot", exact: true })
      .click();
    await expect(page.locator(".origin-bar strong")).toHaveText(
      "Private local pilot",
    );
    await page
      .getByRole("link", { name: "Dataset & exports", exact: true })
      .click();
    await expect(
      page.getByText("0 / 0 recorded seconds", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Synthetic demo", exact: true })
      .click();
    await expect(
      page.getByText("6.4 / 240 recorded seconds", { exact: true }),
    ).toBeVisible();
    await mkdir("test-results/live", { recursive: true });
    await page.screenshot({
      path: `test-results/live/synthetic-${width}.png`,
      fullPage: width !== 1440,
    });
    await context.close();
  }
  assert.deepEqual(failures, [], "Failed published resources");
  assert.deepEqual(external, [], "Unexpected external requests");
  assert.deepEqual(writes, [], "Unexpected submission requests");
  assert.deepEqual(runtimeErrors, [], "Browser runtime errors");
  const report = {
    checkedAt: new Date().toISOString(),
    url: url.href,
    checks,
    widths: [1440, 390, 320],
    collectionDisabled: true,
    originIsolation: true,
    directReload: true,
    failures,
    external,
    writes,
    runtimeErrors,
  };
  await writeFile(
    "test-results/live/report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    `Live verification passed: ${checks.length} route/viewport checks, direct reload, origin isolation, disabled collection, no external requests or writes.`,
  );
} finally {
  await browser.close();
}
