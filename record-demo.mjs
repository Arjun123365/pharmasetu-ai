import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
// Records only a disposable browser profile against a running local preview.
const output = "demo-video";
const scenes = [
  {
    title: "PharmaSetu AI · NESFIC 2026",
    text: "Welcome to Pharma Setu A I. Predict demand. Prevent stock outs. Reduce expiry. This working prototype demonstrates pharmaceutical supply chain intelligence across six locations in Assam. Every medicine, distributor and transaction is synthetic. This is a local preview of the revised application, not a connection to live G R D systems.",
  },
  {
    title: "01 · Clear, consistent inventory metrics",
    text: "The dashboard separates thirty distinct medicines from one hundred and eighty medicine and location positions. Each position has exactly one status: healthy, low stock, critical, or out of stock. Expired batches are counted separately from future expiry risks. Availability measures positions with usable inventory. It does not claim to measure order fulfilment. The calculation guide explains every denominator.",
  },
  {
    title: "02 · Transparent demand intelligence",
    text: "Demand intelligence displays twelve weeks of synthetic sales and a four week illustrative outlook. We can filter by medicine and distributor location. The projection uses the average of the final four weeks, with an explicitly simulated seasonal uplift. This is an understandable rule, not a trained machine learning model, and no forecast accuracy is claimed.",
  },
  {
    title: "03 · Record and validate a stock movement",
    text: "Inventory management tracks batches, locations, pack units and expiry dates. Here we select a medicine in Guwahati and record a demonstration receipt. A mandatory reason is required, and an adjustment cannot create a negative balance. Saving twenty five packs updates the ledger, records an audit event and persists the change in this browser.",
  },
  {
    title: "04 · Explain stock-out risk",
    text: "The stock coverage monitor uses daily demand from the last four weeks. Zero usable packs means out of stock. Positive stock that cannot cover lead time is critical. The next seven days form the low stock buffer. Healthy inventory exceeds this threshold. With zero recent demand, coverage is not estimated as a finite number.",
  },
  {
    title: "05 · Monitor expiry and support FEFO review",
    text: "Expiry monitoring keeps expired stock separate from the next thirty, thirty one to sixty, and sixty one to ninety day bands. These summary bands do not overlap. The window filters are cumulative and clearly labelled. Expired packs never contribute to usable inventory. First expiry, first out recommendations are advisory. Disposal and redistribution always require authorised human review.",
  },
  {
    title: "06 · Calculate and review replenishment",
    text: "Smart replenishment shows its arithmetic. Target stock equals daily demand multiplied by lead time plus safety days. The recommendation subtracts usable stock and outstanding confirmed incoming quantities, and never becomes negative. We adjust lead time, create a draft, submit it for review and simulate approval. This is a local workflow demonstration. It does not issue a pharmaceutical purchase order.",
  },
  {
    title: "07 · Export management evidence",
    text: "Reports bring inventory health, shortage risk, expiry exposure, replenishment and distributor summaries together. The C S V export reflects the selected scope and opens in a spreadsheet. A printable management summary supports review. Existing saved transactions are preserved when this revised application loads. Fresh synthetic scenarios are available only through a confirmed reset.",
  },
  {
    title: "Predict Demand. Prevent Stock-Outs. Reduce Expiry.",
    text: "Pharma Setu A I connects demand visibility, batch inventory, early warnings and explainable replenishment in one browser based prototype. The next step is a supervised pilot with validated data, secure shared storage and role based approval. Built for N E S F I C twenty twenty six. Synthetic demonstration only.",
  },
];
await mkdir(output, { recursive: true });
for (let i = 0; i < scenes.length; i++) {
  const txt = `${output}/scene-${i}.txt`,
    wav = `${output}/scene-${i}.wav`;
  await writeFile(txt, scenes[i].text);
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `flite=textfile=${txt}:voice=rms`,
    "-af",
    "atempo=1.3,apad=pad_dur=2",
    "-ar",
    "48000",
    wav,
  ]);
  scenes[i].duration = Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        wav,
      ],
      { encoding: "utf8" },
    ),
  );
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: `${output}/raw`, size: { width: 1600, height: 900 } },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const clock = performance.now();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const nav = async (name) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: false })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
};
const label = async (text) =>
  page.evaluate((text) => {
    let el = document.getElementById("recording-label");
    if (!el) {
      el = document.createElement("div");
      el.id = "recording-label";
      el.style.cssText =
        "position:fixed;bottom:0;left:244px;right:0;background:#102952f5;color:white;border-top:2px solid #6ca3ff;padding:13px 26px;z-index:999;font-family:system-ui;font-size:20px;font-weight:600;box-shadow:0 -8px 40px #12294d30;";
      document.body.append(el);
    }
    el.replaceChildren();
    const title = document.createElement("div");
    title.textContent = text;
    el.append(title);
    const small = document.createElement("div");
    small.style.cssText =
      "font-size:10px;color:#aec6ec;letter-spacing:1.5px;margin-top:5px;";
    small.textContent = "LOCAL PREVIEW  •  SYNTHETIC DATA ONLY  •  NESFIC 2026";
    el.append(small);
  }, text);
const sceneActions = [
  async () => {
    await wait(7000);
    await page.locator(".grid-main").scrollIntoViewIfNeeded();
    await wait(6000);
    await page.evaluate(() => window.scrollTo(0, 0));
  },
  async () => {
    await wait(6000);
    await page
      .getByText("How these metrics are calculated", { exact: true })
      .click();
    await page.locator(".metric-guide").scrollIntoViewIfNeeded();
    await wait(11000);
    await page
      .getByText("How these metrics are calculated", { exact: true })
      .click();
  },
  async () => {
    await nav("Demand intelligence");
    await wait(4000);
    await page.getByLabel("Filter product").selectOption("PS-001");
    await page.getByLabel("Filter distributor location").selectOption("L1");
    await wait(3500);
    await page
      .getByText("Simulated seasonal uplift (%)", { exact: false })
      .locator("input")
      .fill("20");
    await page
      .getByRole("heading", { name: "Historical demand & four-week outlook" })
      .scrollIntoViewIfNeeded();
  },
  async () => {
    await nav("Inventory management");
    await wait(3000);
    await page
      .getByRole("button", { name: "Receive / adjust", exact: true })
      .nth(1)
      .click();
    await wait(2000);
    await page.getByLabel("Change in packs").fill("-9999");
    await page
      .getByLabel("Mandatory movement reason")
      .fill("Synthetic demo receipt — judge walkthrough");
    await page.getByRole("button", { name: "Save movement" }).click();
    await wait(2500);
    await page.getByLabel("Change in packs").fill("25");
    await wait(2500);
    await page.getByRole("button", { name: "Save movement" }).click();
    await wait(2000);
    await page
      .getByRole("heading", { name: "Audit history" })
      .scrollIntoViewIfNeeded();
  },
  async () => {
    await nav("Stock-out warnings");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await wait(4000);
    await page.getByRole("button", { name: /Out of Stock \d/ }).click();
    await wait(4500);
    await page.getByRole("button", { name: /Low Stock \d/ }).click();
    await wait(4500);
    await page.getByRole("button", { name: /Healthy \d/ }).click();
  },
  async () => {
    await nav("Expiry monitoring");
    await wait(5000);
    await page.getByRole("combobox").nth(2).selectOption("expired");
    await wait(6000);
    await page.getByRole("combobox").nth(2).selectOption("30");
    await wait(5000);
    await page.getByRole("combobox").nth(2).selectOption("90");
  },
  async () => {
    await nav("Smart replenishment");
    await page.getByLabel("Filter product").selectOption("PS-001");
    await page.getByLabel("Filter distributor location").selectOption("L1");
    await wait(4000);
    await page.getByLabel("Assumed lead time").fill("30");
    await wait(5000);
    await page
      .getByRole("button", { name: "Create draft", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Demo request queue" })
      .scrollIntoViewIfNeeded();
    await wait(4000);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await wait(3500);
    await page.getByRole("button", { name: "Simulate approval" }).click();
  },
  async () => {
    await nav("Reports & analytics");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await wait(5000);
    await page.getByRole("combobox").nth(2).selectOption("Distributor summary");
    await wait(4500);
    const d = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    await (await d).saveAs(`${output}/demo-distributor-summary.csv`);
    await wait(3000);
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await wait(4000);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  },
  async () => {
    await nav("Overview");
    await page.locator(".grid-main").scrollIntoViewIfNeeded();
    await wait(7000);
    await page.evaluate(() => window.scrollTo(0, 0));
  },
];
let origin;
try {
  await page.goto(process.env.APP_URL || "http://localhost:4180");
  await page
    .getByRole("heading", { name: "Every medicine. Every location. In view." })
    .waitFor();
  await wait(500);
  origin = (performance.now() - clock) / 1000;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    await label(scene.title);
    scene.start = (performance.now() - clock) / 1000 - origin;
    const began = performance.now();
    console.log(
      `Recording ${i + 1}/${scenes.length}: ${scene.title} (${scene.duration.toFixed(1)}s narration)`,
    );
    await sceneActions[i]();
    await wait(
      Math.max(0, scene.duration * 1000 - (performance.now() - began)),
    );
    scene.end = (performance.now() - clock) / 1000 - origin;
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await context.close();
  const video = await page.video().path();
  await writeFile(
    `${output}/timing.json`,
    JSON.stringify({ origin, video, scenes }, null, 2),
  );
  // Mix scene narration at its measured browser-recording offset.
  const inputs = scenes.flatMap((_, i) => ["-i", `${output}/scene-${i}.wav`]);
  const filters = scenes.map(
    (s, i) => `[${i}:a]adelay=${Math.round(s.start * 1000)}:all=1[a${i}]`,
  );
  filters.push(
    scenes.map((_, i) => `[a${i}]`).join("") +
      `amix=inputs=${scenes.length}:normalize=0,alimiter=limit=0.92[a]`,
  );
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[a]",
    "-c:a",
    "pcm_s16le",
    `${output}/narration.wav`,
  ]);
  const stamp = (n) => {
    const ms = Math.round(n * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  const subs = [];
  let seq = 1;
  for (const scene of scenes) {
    const sentences = scene.text.match(/[^.!?]+[.!?]+/g) || [scene.text];
    const total = sentences.reduce((n, t) => n + t.length, 0);
    let t = scene.start;
    for (const sentence of sentences) {
      const end = t + ((scene.duration - 2) * sentence.length) / total;
      subs.push(
        `${seq++}\n${stamp(t)} --> ${stamp(end)}\n${sentence.trim()}\n`,
      );
      t = end;
    }
  }
  await writeFile(`${output}/captions.srt`, subs.join("\n"));
  await writeFile(
    `${output}/transcript.txt`,
    scenes.map((s) => `${s.title}\n${s.text}`).join("\n\n"),
  );
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(origin),
    "-i",
    video,
    "-i",
    `${output}/narration.wav`,
    "-i",
    `${output}/captions.srt`,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-map",
    "2:s:0",
    "-t",
    String(scenes.at(-1).end),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-c:s",
    "mov_text",
    "-metadata",
    "title=PharmaSetu AI — NESFIC 2026 demo",
    "-metadata",
    "comment=Local revised-app preview; synthetic data; offline male RMS voice; no live GRD integration.",
    "-disposition:s:0",
    "default",
    "-movflags",
    "+faststart",
    `${output}/PharmaSetu-AI-Demo.mp4`,
  ]);
  console.log(
    `Saved ${output}/PharmaSetu-AI-Demo.mp4 (${scenes.at(-1).end.toFixed(1)} seconds), male synthetic narration and captions.`,
  );
} finally {
  await browser.close();
}
