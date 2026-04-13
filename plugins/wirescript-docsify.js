/**
 * WireScript — Docsify Plugin
 * Renderiza bloques ```wire en tu documentación como wireframes interactivos.
 *
 * INSTALACIÓN:
 *   <script src="wirescript-docsify.js"></script>
 *   En docsify config:
 *     plugins: [WireScriptDocsify]
 *
 * USO en Markdown:
 *   ```wire
 *   @Login
 *     # Welcome
 *     field Email
 *     btn Enter > Dashboard
 *   ```
 */

(function () {
  "use strict";

  // ── Themes ─────────────────────────────────────────────────────────
  const THEMES = {
    paper:     { bg:"#f8f7f4", surface:"#fff",     border:"#d6d3cc", ink:"#1a1916", inkMid:"#6b6760", inkFaint:"#a8a49e", fill:"#eceae5", blue:"#3b5bdb" },
    blueprint: { bg:"#0d1f3c", surface:"#112348",  border:"#1e4080", ink:"#a8cfff", inkMid:"#5a8fd4", inkFaint:"#2a5090", fill:"#0a1830", blue:"#60a5fa" },
    sketch:    { bg:"#ffffff", surface:"#fafafa",  border:"#222",    ink:"#111",    inkMid:"#444",    inkFaint:"#999",    fill:"#f0f0f0", blue:"#1a56db" },
    noir:      { bg:"#141414", surface:"#1e1e1e",  border:"#333",    ink:"#f0f0f0", inkMid:"#aaa",    inkFaint:"#555",    fill:"#252525", blue:"#60a5fa" },
  };

  // ── Parser (same as main app) ───────────────────────────────────────
  function parseDSL(src) {
    const lines = src.split("\n");
    const pages = {}; let cur = null; let stack = [];
    const indent   = l => l.match(/^(\s*)/)[1].length;
    const unquote  = s => s.replace(/^["']|["']$/g,"").trim();
    const splitDot = s => s.split("·").map(x=>x.trim()).filter(Boolean);
    const arrowTarget = s => { const m = s.match(/>\s*(\w+)\s*$/); return m?m[1]:null; };
    const stripArrow  = s => s.replace(/>\s*\w+\s*$/,"").trim();
    let theme = "paper";

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim() || line.trim().startsWith("//")) continue;
      const ind = indent(line); const t = line.trim();

      if (t.startsWith("theme ")) { theme = t.slice(6).trim(); continue; }
      if (t.startsWith("@")) {
        cur = { name: t.slice(1).trim(), children: [] };
        pages[cur.name] = cur; stack = []; continue;
      }
      if (!cur) continue;
      while (stack.length && stack[stack.length-1].indent >= ind) stack.pop();
      const parent = stack.length ? stack[stack.length-1].node : cur;
      const rest = t.replace(/^[^\s]+\s*/,"");
      let node = null;

      if (t==="---")                 node={type:"divider"};
      else if (t.startsWith("# "))   node={type:"h1",text:t.slice(2).trim()};
      else if (t.startsWith("## "))  node={type:"h2",text:t.slice(3).trim()};
      else if (t.startsWith("p "))   node={type:"para",text:unquote(rest)};
      else if (t.startsWith("note "))node={type:"note",text:unquote(rest)};
      else if (t.startsWith("nav ")) node={type:"nav",items:splitDot(rest)};
      else if (t.startsWith("tabs "))node={type:"tabs",items:splitDot(rest)};
      else if (t.startsWith("field ")){const pw=rest.trimEnd().endsWith("*");node={type:"field",label:unquote(stripArrow(rest).replace(/[*?]$/,"").trim()),password:pw};}
      else if (t.startsWith("area "))node={type:"area",label:unquote(rest)};
      else if (t.startsWith("pick ")){const [l,...o]=rest.split(">");node={type:"pick",label:unquote(l.trim()),options:o.join(">").trim().split(/\s+/).filter(Boolean)};}
      else if (t.startsWith("check "))node={type:"check",label:unquote(rest)};
      else if (t.startsWith("btn "))  node={type:"btn",label:unquote(stripArrow(rest)),target:arrowTarget(rest)};
      else if (t.startsWith("ghost "))node={type:"ghost",label:unquote(stripArrow(rest)),target:arrowTarget(rest)};
      else if (t.startsWith("link ")) node={type:"link",label:unquote(stripArrow(rest)),target:arrowTarget(rest)};
      else if (t.startsWith("img ")) node={type:"img",label:unquote(rest)};
      else if (t.startsWith("kpi ")) {const [v,...r]=rest.split(/\s+/);node={type:"kpi",value:v,label:r.join(" ")};}
      else if (t.startsWith("grid "))node={type:"grid",cols:splitDot(rest)};
      else if (t.startsWith("list "))node={type:"list",items:splitDot(rest)};
      else if (t==="row")  node={type:"row",children:[]};
      else if (t==="card"||t.startsWith("card "))node={type:"card",title:t.startsWith("card ")&&t.length>5?unquote(rest):"",children:[]};

      if (node) {
        parent.children.push(node);
        if (["row","card"].includes(node.type)) stack.push({indent:ind,node});
      }
    }
    return { pages, theme };
  }

  // ── Renderer (HTML string) ─────────────────────────────────────────
  function renderNode(node, T) {
    const ch = (arr) => (arr||[]).map(n=>renderNode(n,T)).join("");
    const r = 6;
    switch(node.type) {
      case "nav": return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1.5px solid ${T.border};background:${T.surface};margin:-14px -14px 4px">
        <strong style="font-size:13px;color:${T.ink}">${node.items[0]||""}</strong>
        <div style="display:flex;gap:14px">${node.items.slice(1).map(x=>`<span style="font-size:11px;color:${T.inkMid}">${x}</span>`).join("")}</div></div>`;
      case "h1": return `<div style="font-size:20px;font-weight:700;color:${T.ink};letter-spacing:-0.4px;margin:4px 0 2px">${node.text}</div>`;
      case "h2": return `<div style="font-size:15px;font-weight:600;color:${T.ink};margin:3px 0 2px">${node.text}</div>`;
      case "para": return `<div style="font-size:12px;color:${T.inkMid};line-height:1.6">${node.text}</div>`;
      case "note": return `<div style="font-size:11px;color:${T.inkFaint};font-style:italic">${node.text}</div>`;
      case "divider": return `<hr style="border:none;border-top:1.5px dashed ${T.border};margin:8px 0">`;
      case "field": return `<div style="margin:4px 0"><div style="font-size:10px;font-weight:700;color:${T.inkMid};text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">${node.label}</div>
        <div style="height:32px;background:${T.bg};border:1.5px solid ${T.border};border-radius:${r}px;display:flex;align-items:center;padding:0 10px">
        <span style="font-size:11px;color:${T.inkFaint}">${node.password?"••••••••":node.label.toLowerCase()+"..."}</span></div></div>`;
      case "area": return `<div style="margin:4px 0"><div style="font-size:10px;font-weight:700;color:${T.inkMid};text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">${node.label}</div>
        <div style="height:70px;background:${T.bg};border:1.5px solid ${T.border};border-radius:${r}px;padding:8px 10px">
        <span style="font-size:11px;color:${T.inkFaint}">${node.label.toLowerCase()}...</span></div></div>`;
      case "pick": return `<div style="margin:4px 0"><div style="font-size:10px;font-weight:700;color:${T.inkMid};text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">${node.label}</div>
        <div style="height:32px;background:${T.bg};border:1.5px solid ${T.border};border-radius:${r}px;display:flex;align-items:center;justify-content:space-between;padding:0 10px">
        <span style="font-size:11px;color:${T.inkFaint}">${node.options[0]||"Seleccionar…"}</span><span style="color:${T.inkFaint};font-size:9px">▾</span></div></div>`;
      case "check": return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
        <div style="width:14px;height:14px;border:1.5px solid ${T.border};border-radius:3px;background:${T.bg}"></div>
        <span style="font-size:12px;color:${T.inkMid}">${node.label}</span></div>`;
      case "btn": return `<button style="height:34px;padding:0 16px;background:${T.ink};color:${T.bg};border:none;border-radius:${r}px;font-size:12px;font-weight:600;cursor:pointer;margin:2px 0">${node.label}${node.target?" →":""}</button>`;
      case "ghost": return `<button style="height:34px;padding:0 16px;background:transparent;color:${T.ink};border:1.5px solid ${T.border};border-radius:${r}px;font-size:12px;font-weight:500;cursor:pointer;margin:2px 0">${node.label}</button>`;
      case "link": return `<span style="font-size:12px;color:${T.blue};text-decoration:underline;cursor:pointer">${node.label}</span>`;
      case "img": return `<div style="width:100%;height:100px;background:${T.fill};border:1.5px dashed ${T.border};border-radius:${r}px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;margin:4px 0">
        <span style="font-size:18px;color:${T.inkFaint}">⬚</span>
        <span style="font-size:10px;color:${T.inkFaint}">${node.label}</span></div>`;
      case "kpi": return `<div style="flex:1;min-width:60px"><div style="font-size:22px;font-weight:700;color:${T.ink};letter-spacing:-0.4px;line-height:1">${node.value}</div>
        <div style="font-size:10px;color:${T.inkFaint};margin-top:2px">${node.label}</div></div>`;
      case "row": return `<div style="display:flex;gap:10px;width:100%;flex-wrap:wrap;margin:4px 0">${ch(node.children)}</div>`;
      case "card": return `<div style="background:${T.surface};border:1.5px solid ${T.border};border-radius:${r+2}px;padding:12px 14px;margin:4px 0;width:100%">
        ${node.title?`<div style="font-size:10px;font-weight:700;color:${T.inkMid};text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${node.title}</div>`:""}
        <div style="display:flex;flex-direction:column;gap:8px">${ch(node.children)}</div></div>`;
      case "grid": return `<div style="width:100%;overflow-x:auto;margin:4px 0"><table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr>${node.cols.map(c=>`<th style="padding:6px 9px;background:${T.fill};border:1px solid ${T.border};text-align:left;color:${T.inkMid};font-size:10px;text-transform:uppercase;letter-spacing:.06em">${c}</th>`).join("")}</tr></thead>
        <tbody>${[0,1,2].map(r=>`<tr>${node.cols.map((_,c)=>`<td style="padding:7px 9px;border:1px solid ${T.border}"><div style="height:8px;background:${T.fill};border-radius:3px;width:${50+Math.sin(r*3+c)*25}%"></div></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      case "list": return `<div style="width:100%">${node.items.map((item,i)=>`<div style="display:flex;align-items:center;gap:9px;padding:7px 0;${i<node.items.length-1?`border-bottom:1px solid ${T.border}`:""}">
        <div style="width:5px;height:5px;border-radius:50%;background:${T.border};flex-shrink:0"></div>
        <span style="font-size:12px;color:${T.inkMid}">${item}</span></div>`).join("")}</div>`;
      default: return "";
    }
  }

  function renderPage(page, T) {
    return `<div style="padding:14px;display:flex;flex-direction:column;gap:9px">
      ${(page.children||[]).map(n=>renderNode(n,T)).join("")}</div>`;
  }

  // ── Widget HTML ─────────────────────────────────────────────────────
  function buildWidget(src, id) {
    const { pages, theme } = parseDSL(src);
    const T = THEMES[theme] || THEMES.paper;
    const names = Object.keys(pages);
    if (!names.length) return `<div style="color:#999;font-style:italic">No screens defined.</div>`;

    const tabs = names.map((n,i)=>
      `<button onclick="wsNav('${id}','${n}')" id="${id}-tab-${n}" style="padding:3px 9px;border-radius:5px;border:1px solid #ddd;background:${i===0?"#eee":"none"};font-size:10px;cursor:pointer">${n}</button>`
    ).join("");

    const screens = names.map(n=>
      `<div id="${id}-screen-${n}" style="display:${names[0]===n?"block":"none"};background:${T.bg};border-radius:10px;border:1.5px solid ${T.border}">
        ${renderPage(pages[n], T)}</div>`
    ).join("");

    return `<div id="${id}" style="font-family:'Inter',system-ui,sans-serif;max-width:400px;margin:16px 0">
      <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
        <span style="font-size:10px;color:#999;font-family:monospace;margin-right:4px">wire</span>
        ${tabs}
        <span style="margin-left:auto;font-size:9px;padding:2px 7px;background:#f0f0f5;border-radius:20px;color:#aaa;border:1px solid #e0e0ea">theme:${theme}</span>
      </div>
      ${screens}
    </div>`;
  }

  // ── Global nav helper ───────────────────────────────────────────────
  window.wsNav = function(id, name) {
    const widget = document.getElementById(id);
    if (!widget) return;
    widget.querySelectorAll('[id^="'+id+'-screen-"]').forEach(el => el.style.display="none");
    widget.querySelectorAll('[id^="'+id+'-tab-"]').forEach(el => { el.style.background="none"; el.style.borderColor="#ddd"; });
    const screen = document.getElementById(id+"-screen-"+name);
    const tab    = document.getElementById(id+"-tab-"+name);
    if (screen) screen.style.display="block";
    if (tab)    { tab.style.background="#eee"; tab.style.borderColor="#aaa"; }
  };

  // ── Docsify plugin hook ─────────────────────────────────────────────
  let _counter = 0;
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(

    // 1. Markdown: replace ```wire blocks with widget HTML
    function wireAfterEach(hook) {
      hook.afterEach(function(html) {
        return html.replace(
          /<pre[^>]*><code class="lang-wire">([\s\S]*?)<\/code><\/pre>/g,
          function(_, encoded) {
            const src = encoded
              .replace(/&amp;/g,"&").replace(/&lt;/g,"<")
              .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
            const id = "ws-widget-" + (++_counter);
            return buildWidget(src, id);
          }
        );
      });
    }
  );

  // ── Standalone init (non-Docsify pages) ────────────────────────────
  document.addEventListener("DOMContentLoaded", function() {
    if (window.$docsify) return; // Docsify handles it
    document.querySelectorAll("pre code.language-wire, pre code.lang-wire").forEach(function(el) {
      const src = el.textContent;
      const id = "ws-widget-" + (++_counter);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = buildWidget(src, id);
      el.closest("pre").replaceWith(wrapper.firstElementChild);
    });
  });

})();
