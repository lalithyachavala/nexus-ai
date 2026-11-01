// Captures 8 high-quality screenshots of meaningful Nexus AI states.
// Drives the running mock-mode app at http://localhost:3000.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const wait = (p, ms) => p.waitForTimeout(ms);

async function shot(page, name) {
  await page.screenshot({ path: resolve(OUT, name) });
  console.log("  ✓", name);
}

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  console.log("Capturing screenshots →", OUT);

  // 1. Overview
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.getByText("Operations Overview").waitFor();
  await wait(page, 2000); // let charts animate in
  await shot(page, "01-overview-dashboard.png");

  // 2. Support inbox (auto-selects first conversation + pipeline panel)
  await page.goto(`${BASE}/support`, { waitUntil: "domcontentloaded" });
  await page.getByText("AI pipeline").waitFor();
  await wait(page, 1600);
  await shot(page, "02-support-inbox-pipeline.png");

  // 3. Support — send a message and capture the streamed AI reply
  const composer = page.getByPlaceholder(/Type a customer message/i);
  await composer.click();
  await composer.fill("Our team was double-charged on the latest invoice — can you fix this?");
  await page.getByRole("button", { name: "Send message" }).click();
  await wait(page, 3200); // stream completes + pipeline panel updates
  await shot(page, "03-support-ai-streamed-reply.png");

  // 4. Support analytics
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await wait(page, 2000);
  await shot(page, "04-support-analytics.png");

  // 5. Sales leads + explainable scoring
  await page.goto(`${BASE}/sales`, { waitUntil: "domcontentloaded" });
  await page.getByText("Why this score").waitFor();
  await wait(page, 1400);
  await shot(page, "05-sales-lead-scoring.png");

  // 6. Sales pipeline analytics
  await page.getByRole("button", { name: "Pipeline analytics" }).click();
  await wait(page, 2000);
  await shot(page, "06-sales-pipeline-analytics.png");

  // 7. WhatsApp automation + templates
  await page.goto(`${BASE}/whatsapp`, { waitUntil: "domcontentloaded" });
  await page.getByText("Message templates").waitFor();
  await wait(page, 1600);
  await shot(page, "07-whatsapp-automation.png");

  // 8. Automation dashboard with approval gate
  await page.goto(`${BASE}/automation`, { waitUntil: "domcontentloaded" });
  await page.getByText("Human approval required").waitFor();
  await wait(page, 1400);
  await shot(page, "08-automation-approval-gate.png");

  await browser.close();
  console.log("Done — 8 screenshots written.");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
