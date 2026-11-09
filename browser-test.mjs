import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173");
  await page
    .getByRole("heading", { name: "Every medicine. Every location. In view." })
    .waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  const nav = (name) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: false })
      .click();
  await nav("Demand intelligence");
  await page.getByLabel("Filter product").selectOption("PS-001");
  await page.getByLabel("Filter distributor location").selectOption("L1");
  await page.getByText("Moving average:", { exact: false }).waitFor();
  await nav("Inventory management");
  await page
    .getByRole("button", { name: "Receive / adjust", exact: true })
    .nth(1)
    .click();
  await page.getByLabel("Change in packs").fill("-999999");
  await page
    .getByLabel("Mandatory movement reason")
    .fill("Browser test adjustment");
  await page.getByRole("button", { name: "Save movement" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "negative balance" })
    .waitFor();
  await page.getByLabel("Change in packs").fill("25");
  await page.getByRole("button", { name: "Save movement" }).click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pharmasetu-demo-v1")),
  );
  assert.equal(saved.batches[1].quantity, 25);
  assert.equal(saved.audit.length, 1);
  await page.reload();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pharmasetu-demo-v1")),
  );
  assert.equal(saved.batches[1].quantity, 25);
  await nav("Stock-out warnings");
  await page.getByRole("button", { name: /Warning \d/ }).click();
  await nav("Expiry monitoring");
  await page.getByRole("combobox").nth(2).selectOption("expired");
  await page.getByRole("heading", { name: "Batch expiry review" }).waitFor();
  await nav("Smart replenishment");
  await page.getByLabel("Assumed lead time").fill("30");
  await page
    .getByRole("button", { name: "Create draft", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("button", { name: "Simulate approval" }).click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pharmasetu-demo-v1")),
  );
  assert.equal(saved.requests[0].status, "Approved");
  await nav("Reports & analytics");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "inventory-health.csv");
  await download.saveAs("test-results/inventory-health.csv");
  assert.match(
    await readFile("test-results/inventory-health.csv", "utf8"),
    /"SKU","Medicine"/,
  );
  await page.evaluate(() => {
    window.print = () => {
      window.__printCalled = true;
    };
  });
  await page.getByRole("button", { name: "Print summary" }).click();
  assert.equal(await page.evaluate(() => window.__printCalled), true);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "test-results/management-summary.pdf", format: "A4" });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pharmasetu-demo-v1")),
  );
  assert.equal(saved.audit.length, 0);
  assert.equal(saved.requests.length, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await nav("Overview");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Mobile page must not overflow horizontally",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: seven-module navigation, filters, negative-stock validation, stock receipt, persistence, request workflow, CSV content/download, print action/PDF rendering, reset cancel/confirm, mobile viewport, no browser errors.",
  );
} finally {
  await browser.close();
}
