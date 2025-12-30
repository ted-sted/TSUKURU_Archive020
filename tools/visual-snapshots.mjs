import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "screenshots");
const PORT = process.env.PORT || "4173";
const URL = `http://127.0.0.1:${PORT}/`;

function startServer() {
  const p = spawn("npx", ["http-server", ".", "-p", PORT, "-c-1", "--silent"], {
    stdio: "inherit",
    shell: true,
  });
  return p;
}

async function shot(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200); // アニメ/描画安定待ち（安全側）
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = startServer();
  let browser;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    await shot(page, "desktop.png", 1440, 900);
    await shot(page, "mobile.png", 390, 844);

    console.log(`[OK] screenshots saved: ${OUT_DIR}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
