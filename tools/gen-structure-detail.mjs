import fs from "node:fs";
import { parse } from "node-html-parser";

const html = fs.readFileSync("index.html", "utf8");
const doc = parse(html, { comment: false });

function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function idClass(el) {
  const id = el.getAttribute("id");
  const cls = el.getAttribute("class");
  return [
    id ? `#${id}` : "",
    cls ? "." + cls.split(/\s+/).filter(Boolean).join(".") : ""
  ].join("");
}
function scoreContainer(el) {
  // 「カードっぽい要素」が複数まとまる親を探す（粗いが実用）
  const matches = el.querySelectorAll(
    '[class*="card"], .card, article, [class*="tile"], .tile, [class*="bento"], .bento'
  );
  return matches.length;
}

const sections = doc.querySelectorAll("section");
let out = [];
out.push(`# Structure (detail)\n`);
out.push(`- Total sections: ${sections.length}\n`);

sections.forEach((sec, i) => {
  const sid = sec.getAttribute("id") || "(no-id)";
  const h = sec.querySelector("h1,h2,h3");
  const heading = clean(h?.text) || "(no-heading)";
  out.push(`## ${i + 1}. section#${sid}`);
  out.push(`- heading: ${heading}`);

  // セクション内の候補コンテナを走査して、カード集約が多い順に上位を出す
  const all = sec.querySelectorAll("*");
  const candidates = [];
  for (const el of all) {
    const c = scoreContainer(el);
    if (c >= 2) candidates.push({ el, c });
  }
  candidates.sort((a, b) => b.c - a.c);

  const top = candidates.slice(0, 3); // 上位3つで十分
  if (top.length === 0) {
    out.push(`- grid candidates: none`);
    out.push("");
    return;
  }

  out.push(`- grid candidates (top ${top.length}):`);
  top.forEach(({ el, c }, idx) => {
    const tag = el.tagName.toLowerCase();
    const sig = idClass(el) || "";
    // 子要素の頻出（BENTO設計の目安）
    const kids = el.childNodes
      .filter((n) => n.nodeType === 1)
      .slice(0, 12)
      .map((n) => `${n.tagName.toLowerCase()}${idClass(n)}`)
      .join(", ");
    out.push(`  - ${idx + 1}) ${tag}${sig}  (card-like descendants: ${c})`);
    out.push(`     children sample: ${kids || "(no element children)"}`);
  });
  out.push("");
});

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/structure.detail.md", out.join("\n"), "utf8");
console.log("OK: docs/structure.detail.md generated");
