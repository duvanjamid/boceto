/**
 * WireScript Parser
 * Converts .wire DSL source into a structured page tree.
 *
 * Usage (ESM):
 *   import { parseDSL } from "./src/parser.js";
 *   const { pages, theme } = parseDSL(source);
 *
 * Usage (CJS):
 *   const { parseDSL } = require("wirescript");
 */

export function parseDSL(src) {
  const lines = src.split("\n");
  const pages = {};
  let cur = null, stack = [], theme = "paper";

  const indent   = l => l.match(/^(\s*)/)[1].length;
  const unquote  = s => s.replace(/^["']|["']$/g, "").trim();
  const splitDot = s => s.split("·").map(x => x.trim()).filter(Boolean);
  const arrowT   = s => { const m = s.match(/>\s*(\w+)\s*$/); return m ? m[1] : null; };
  const noArrow  = s => s.replace(/>\s*\w+\s*$/, "").trim();

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith("//")) continue;
    const ind = indent(line), t = line.trim();

    if (t.startsWith("theme ")) { theme = t.slice(6).trim(); continue; }
    if (t.startsWith("@")) {
      cur = { name: t.slice(1).trim(), children: [] };
      pages[cur.name] = cur; stack = []; continue;
    }
    if (!cur) continue;

    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : cur;
    const rest = t.replace(/^[^\s]+\s*/, "");
    let node = null;

    if (t === "---")                    node = { type: "divider" };
    else if (/^#{1,3} /.test(t)) {
      const lvl = t.match(/^(#+)/)[1].length;
      node = { type: `h${lvl}`, text: t.replace(/^#+\s*/, "") };
    }
    else if (t.startsWith("p "))        node = { type: "para",   text: unquote(rest) };
    else if (t.startsWith("note "))     node = { type: "note",   text: unquote(rest) };
    else if (t.startsWith("nav "))      node = { type: "nav",    items: splitDot(rest) };
    else if (t.startsWith("tabs "))     node = { type: "tabs",   items: splitDot(rest) };
    else if (t.startsWith("field ")) {
      const pw = rest.trimEnd().endsWith("*"), op = rest.trimEnd().endsWith("?");
      node = { type: "field", label: unquote(noArrow(rest).replace(/[*?]$/, "").trim()), password: pw, optional: op };
    }
    else if (t.startsWith("area "))     node = { type: "area",   label: unquote(rest) };
    else if (t.startsWith("pick ")) {
      const [l, ...o] = rest.split(">");
      node = { type: "pick", label: unquote(l.trim()), options: o.join(">").trim().split(/\s+/).filter(Boolean) };
    }
    else if (t.startsWith("check "))    node = { type: "check",  label: unquote(rest) };
    else if (t.startsWith("toggle "))   node = { type: "toggle", label: unquote(rest) };
    else if (t.startsWith("btn "))      node = { type: "btn",    label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith("ghost "))    node = { type: "ghost",  label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith("link "))     node = { type: "link",   label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith("img "))      node = { type: "img",    label: unquote(rest) };
    else if (t.startsWith("avatar "))   node = { type: "avatar", name: unquote(rest) };
    else if (t.startsWith("badge "))    node = { type: "badge",  text: unquote(rest) };
    else if (t === "row")               node = { type: "row",    children: [] };
    else if (t === "card" || t.startsWith("card "))
      node = { type: "card", title: t.length > 4 ? unquote(rest) : "", children: [] };
    else if (t === "aside")             node = { type: "aside",  children: [] };
    else if (t.startsWith("kpi ")) {
      const [v, ...r] = rest.split(/\s+/);
      node = { type: "kpi", value: v, label: r.join(" ") };
    }
    else if (t.startsWith("grid "))     node = { type: "grid",   cols: splitDot(rest) };
    else if (t.startsWith("list "))     node = { type: "list",   items: splitDot(rest) };

    if (node) {
      parent.children.push(node);
      if (["row", "card", "aside"].includes(node.type)) stack.push({ indent: ind, node });
    }
  }
  return { pages, theme };
}
