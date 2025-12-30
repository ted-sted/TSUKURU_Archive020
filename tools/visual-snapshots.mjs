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

async function warmScroll(page) {
  // スクロール連動の表示/アニメを確実にトリガーする
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  const step = Math.max(240, Math.floor(viewport.height * 0.85));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  const maxY = await page.evaluate(() => Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  ));

  for (let y = 0; y < maxY; y += step) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function shot(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);

  await warmScroll(page);

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
