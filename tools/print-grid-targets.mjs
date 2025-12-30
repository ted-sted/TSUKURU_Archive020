import fs from "node:fs";
import { parse } from "node-html-parser";

const html = fs.readFileSync("index.html", "utf8");
const doc = parse(html, { comment: false });

function cls(el) {
  const c = (el.getAttribute("class") || "").trim();
  return c ? c.split(/\s+/).filter(Boolean) : [];
}
function id(el) {
  return (el.getAttribute("id") || "").trim();
}
function tag(el) {
  return (el.tagName || "").toLowerCase();
}

function baseSelector(el) {
  const elId = id(el);
  if (elId) return `#${cssEscape(elId)}`;
  const classes = cls(el).slice(0, 4); // 先頭の主要クラスだけ
  if (classes.length) return `${tag(el)}.${classes.map(cssEscape).join(".")}`;
  return tag(el);
}

function cssEscape(s) {
  // 簡易エスケープ（クラス/ID向け）
  return s.replace(/[^a-zA-Z0-9_-]/g, (m) => `\\${m}`);
}

function isUnique(selector) {
  try {
    return doc.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function withinSection(secId, selector) {
  return `section#${cssEscape(secId)} ${selector}`;
}

function scoreContainer(el) {
  const matches = el.querySelectorAll(
    '[class*="card"], .card, article, [class*="tile"], .tile, [class*="bento"], .bento'
  );
  return matches.length;
}

function headingOf(sec) {
  const h = sec.querySelector("h1,h2,h3");
  return (h?.text || "").replace(/\s+/g, " ").trim() || "(no-heading)";
}

const sections = doc.querySelectorAll("section");
let out = [];
out.push(`GRID TARGETS (for BENTO)\n`);

for (const sec of sections) {
  const sid = id(sec) || "(no-id)";
  out.push(`== section#${sid} ==`);
  out.push(`heading: ${headingOf(sec)}`);

  const all = sec.querySelectorAll("*");
  const candidates = [];
  for (const el of all) {
    const c = scoreContainer(el);
    if (c >= 2) candidates.push({ el, c });
  }
  candidates.sort((a, b) => b.c - a.c);

  if (!candidates.length) {
    out.push(`(no grid candidates)\n`);
    continue;
  }

  const top = candidates.slice(0, 3);
  top.forEach(({ el, c }, i) => {
    const bs = baseSelector(el);
    let sel = bs;

    // 一意でなければ section を前置して一意化
    if (!isUnique(sel) && sid !== "(no-id)") {
      const scoped = withinSection(sid, bs);
      if (isUnique(scoped)) sel = scoped;
    }

    // それでもダメなら、親に寄せてさらに限定（最大2階層）
    if (!isUnique(sel) && sid !== "(no-id)") {
      const p = el.parentNode;
      if (p && p.tagName) {
        const ps = baseSelector(p);
        const scoped2 = withinSection(sid, `${ps} > ${bs}`);
        if (isUnique(scoped2)) sel = scoped2;
      }
    }

    out.push(`  ${i + 1}) ${tag(el)}  card-like descendants: ${c}`);
    out.push(`     suggest: ${sel}`);
    const kids = el.childNodes
      .filter((n) => n.nodeType === 1)
      .slice(0, 10)
      .map((n) => `${(n.tagName || "").toLowerCase()}${id(n) ? "#" + id(n) : ""}${cls(n).length ? "." + cls(n).slice(0, 3).join(".") : ""}`)
      .join(", ");
    out.push(`     children: ${kids || "(no element children)"}`);
  });

  out.push("");
}

console.log(out.join("\n"));
