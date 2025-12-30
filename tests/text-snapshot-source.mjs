import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { parse } from "node-html-parser";

const ROOT = process.cwd();
const SNAP_PATH = path.join(ROOT, "tests", "text.snapshot.txt");
const CURR_PATH = path.join(ROOT, "tests", "text.current.txt");

function normalizeText(s) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTextFromHtml(html) {
  const doc = parse(html, { comment: false });

  // 設計上、テキスト検知の対象外にする要素（装飾追加を許容）
  doc.querySelectorAll("script,style,noscript,template,svg").forEach((n) => n.remove());

  // body が無い場合でも全体から抽出
  const text = doc.text ?? "";
  return normalizeText(text);
}

function main() {
  const update = process.argv.includes("--update");

  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[NG] index.html not found at repo root: ${indexPath}`);
    process.exit(2);
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const text = extractTextFromHtml(html);

  fs.mkdirSync(path.dirname(CURR_PATH), { recursive: true });
  fs.writeFileSync(CURR_PATH, text, "utf8");

  if (update) {
    fs.writeFileSync(SNAP_PATH, text, "utf8");
    console.log(`[OK] snapshot updated: ${SNAP_PATH}`);
    return;
  }

  if (!fs.existsSync(SNAP_PATH)) {
    console.error(`[NG] snapshot not found. Run: npm run text:snapshot`);
    process.exit(2);
  }

  const base = fs.readFileSync(SNAP_PATH, "utf8");
  if (base === text) {
    console.log("[OK] source-derived visible text unchanged.");
    return;
  }

  console.error("[NG] source-derived visible text changed. diff:");
  try {
    execSync(`diff -u "${SNAP_PATH}" "${CURR_PATH}"`, { stdio: "inherit" });
  } catch {
    // diff 非0は差分ありのため正常
  }
  process.exit(1);
}

main();
