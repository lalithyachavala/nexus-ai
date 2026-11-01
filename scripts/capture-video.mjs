// Records a ~45s product walkthrough of Nexus AI (mock mode) and encodes an MP4.
import { chromium } from "playwright";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readdirSync, renameSync, existsSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO = resolve(__dirname, "../demo");
const RAW = resolve(DEMO, "raw");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
if (!existsSync(RAW)) mkdirSync(RAW, { recursive: true });

const wait = (p, ms) => p.waitForTimeout(ms);

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: RAW, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  console.log("Recording walkthrough…");

  // Overview (0–5s)
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await wait(page, 4500);

  // Support (5–18s)
  await page.goto(`${BASE}/support`, { waitUntil: "domcontentloaded" });
  await page.getByText("AI pipeline").waitFor();
  await wait(page, 2500);
  const composer = page.getByPlaceholder(/Type a customer message/i);
  await composer.click();
  await composer.type("This is the third outage this week and no updates — really frustrated.", { delay: 32 });
  await wait(page, 600);
  await page.getByRole("button", { name: "Send message" }).click();
  await wait(page, 4200); // watch the AI stream + pipeline panel route to handoff
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await wait(page, 3000);

  // Sales (18–30s)
  await page.goto(`${BASE}/sales`, { waitUntil: "domcontentloaded" });
  await page.getByText("Why this score").waitFor();
  await wait(page, 2500);
  await page.getByRole("button", { name: "Re-score" }).click();
  await wait(page, 2200);
  await page.getByRole("button", { name: "Pipeline analytics" }).click();
  await wait(page, 3000);

  // WhatsApp (30–37s)
  await page.goto(`${BASE}/whatsapp`, { waitUntil: "domcontentloaded" });
  await page.getByText("Message templates").waitFor();
  await wait(page, 4000);

  // Automation + approval (37–45s)
  await page.goto(`${BASE}/automation`, { waitUntil: "domcontentloaded" });
  await page.getByText("Human approval required").waitFor();
  await wait(page, 2500);
  await page.getByRole("button", { name: "Approve" }).click();
  await wait(page, 2500);

  await context.close(); // flush video
  await browser.close();

  // Find the produced webm (most recent in RAW) and encode MP4.
  const webm = readdirSync(RAW).filter((f) => f.endsWith(".webm")).map((f) => resolve(RAW, f)).sort().pop();
  const named = resolve(RAW, "walkthrough.webm");
  renameSync(webm, named);
  const mp4 = resolve(DEMO, "nexus-ai-walkthrough.mp4");
  console.log("Encoding MP4 with ffmpeg…");
  execSync(`ffmpeg -y -i "${named}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "${mp4}"`, { stdio: "inherit" });
  console.log("Done →", mp4);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
