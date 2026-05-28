#!/usr/bin/env node
/**
 * Boceto Wireframe Benchmark Runner
 *
 * Modos:
 *   npm run benchmark              → Boceto via MCP (modo real: Claude usa las tools)
 *   npm run benchmark:compare      → Boceto via MCP + HTML sin tools (comparación de tokens)
 *   npm run benchmark:case B001    → un caso específico
 *   npm run benchmark:category auth
 *
 * Flags:
 *   --cases B001,B002    filtrar por ID
 *   --category auth      filtrar por categoría
 *   --model <id>         modelo (default: claude-sonnet-4-6)
 *   --compare            correr también el modo HTML para comparar tokens
 */

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── Args ──────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const filterIds  = getArg('--cases')?.split(',');
const filterCat  = getArg('--category');
const model      = getArg('--model') ?? 'claude-sonnet-4-6';
const compareMode = args.includes('--compare');
const TIMEOUT_MS  = 90_000;

function getArg(f) { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; }

// ── Dataset ───────────────────────────────────────────────────────────────────
const dataset = JSON.parse(readFileSync(join(__dir, 'dataset.json'), 'utf8'));
let cases = dataset.cases;
if (filterIds) cases = cases.filter(c => filterIds.includes(c.id));
if (filterCat) cases = cases.filter(c => c.category === filterCat);

// ── Parser (local, para scoring) ─────────────────────────────────────────────
let parseDSL;
try {
  const mod = await import(join(ROOT, 'dist/lib/parser.js'));
  parseDSL = mod.parseDSL;
} catch {
  console.error('[benchmark] dist/lib/parser.js not found — run `npm run build:lib` first.');
  process.exit(1);
}

// ── Prompts ───────────────────────────────────────────────────────────────────

// MCP mode: Claude NO recibe el DSL — debe usar boceto_get_reference para aprenderlo
const MCP_SYSTEM = `You are a wireframe designer assistant. Your job is to create Boceto DSL wireframes.

IMPORTANT workflow — always follow these steps:
1. Call boceto_get_reference to learn the DSL syntax before writing any code.
2. Write the Boceto DSL for the requested UI.
3. Call boceto_parse with your DSL to validate it.
4. If boceto_parse returns pageCount: 0 or nodeCount: 0, fix the DSL and parse again.
5. Return the final validated DSL inside a \`\`\`boceto block.`;

// HTML mode: Claude genera HTML sin tools (para comparar tokens)
const HTML_SYSTEM = `You are a wireframe designer. Respond ONLY with a plain HTML snippet (no CSS, no JS, no DOCTYPE, no html/head/body tags). Use only semantic HTML elements to represent the UI structure. No inline styles.`;

// ── Token estimator (~4 chars = 1 token) ─────────────────────────────────────
function estimateTokens(text) {
  return Math.round((text ?? '').length / 4);
}

// ── Call claude CLI ───────────────────────────────────────────────────────────
// useMcp flag kept for API compatibility but no longer adds --mcp-config;
// Boceto MCP must be configured in the user's Claude Code installation.
function callClaude({ prompt, system, useMcp = false }) {
  const cliArgs = [
    '-p', `${system}\n\n---\n\n${prompt}`,
    '--model', model,
    '--output-format', 'json'
  ];

  const result = spawnSync('claude', cliArgs, {
    timeout: TIMEOUT_MS,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) throw new Error(result.stderr || `claude exited with status ${result.status}`);

  return result.stdout ?? '';
}

// ── Parse claude JSON output ──────────────────────────────────────────────────
function parseClaudeOutput(raw) {
  const toolCalls = [];
  let finalText = '';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // JSON output is newline-delimited JSON events
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try { event = JSON.parse(trimmed); } catch { continue; }

    // Collect tool uses
    if (event.type === 'tool_use' || event.type === 'tool_call') {
      toolCalls.push({ name: event.name, input: event.input });
    }
    // Collect text content
    if (event.type === 'text' || (event.type === 'message' && event.role === 'assistant')) {
      const content = Array.isArray(event.content) ? event.content : [];
      for (const block of content) {
        if (block.type === 'text') finalText += block.text;
        if (block.type === 'tool_use') toolCalls.push({ name: block.name, input: block.input });
      }
    }
    // Usage stats
    if (event.usage) {
      totalInputTokens  += event.usage.input_tokens  ?? 0;
      totalOutputTokens += event.usage.output_tokens ?? 0;
    }
    // Sometimes the final message is just the text
    if (typeof event === 'string') finalText += event;
    if (event.result) finalText += event.result;
  }

  // Fallback: treat entire output as text if no events parsed
  if (!finalText && toolCalls.length === 0) finalText = raw;

  return { toolCalls, finalText, totalInputTokens, totalOutputTokens };
}

// ── Extract DSL from text ─────────────────────────────────────────────────────
function extractDsl(text) {
  const m = text.match(/```boceto\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function score(tc, dsl, parsed) {
  const { expected } = tc;
  const allText = (dsl ?? '').toLowerCase();
  const results = {};
  let total = 0;

  const pageNames = Object.keys(parsed?.pages ?? {});
  const nodeCount = pageNames.reduce((s, p) => s + countNodes(parsed.pages[p]), 0);
  const parseOk = pageNames.length > 0 && nodeCount > 0;
  results.parse_success     = { ok: parseOk, pts: parseOk ? 30 : 0, max: 30 };
  total += results.parse_success.pts;

  const pageOk = pageNames.length >= expected.pages;
  results.page_coverage     = { ok: pageOk, pts: pageOk ? 20 : Math.round(20 * pageNames.length / expected.pages), max: 20, found: pageNames.length, expected: expected.pages };
  total += results.page_coverage.pts;

  const required = expected.required_keywords ?? [];
  const found    = required.filter(kw => allText.includes(kw));
  const compPts  = required.length > 0 ? Math.round(30 * found.length / required.length) : 30;
  results.component_coverage = { ok: found.length === required.length, pts: compPts, max: 30, found, missing: required.filter(kw => !allText.includes(kw)) };
  total += compPts;

  const usedForbidden = (expected.forbidden_keywords ?? []).filter(kw => allText.includes(kw));
  results.no_forbidden = { ok: usedForbidden.length === 0, pts: usedForbidden.length === 0 ? 10 : 0, max: 10 };
  total += results.no_forbidden.pts;

  const nodeOk = nodeCount >= (expected.min_nodes ?? 0);
  results.min_nodes = { ok: nodeOk, pts: nodeOk ? 10 : Math.round(10 * nodeCount / (expected.min_nodes ?? 1)), max: 10, found: nodeCount, expected: expected.min_nodes };
  total += results.min_nodes.pts;

  return { total, max: 100, dimensions: results };
}

function countNodes(page) {
  if (!page) return 0;
  const ch = page.children ?? [];
  return ch.length + ch.reduce((s, n) => s + countNodes(n), 0);
}

// ── Run one case ──────────────────────────────────────────────────────────────
async function runCase(tc) {
  const userPrompt = `Create a Boceto DSL wireframe for the following UI:\n\n${tc.prompt}`;
  const start = Date.now();

  // ── Boceto via MCP ──
  let mcpRaw, parsed_output;
  try {
    mcpRaw = callClaude({ prompt: userPrompt, system: MCP_SYSTEM, useMcp: true });
    parsed_output = parseClaudeOutput(mcpRaw);
  } catch (err) {
    return {
      id: tc.id, category: tc.category, difficulty: tc.difficulty,
      error: err.message,
      score: { total: 0, max: 100, dimensions: {} },
      toolCalls: [], dsl: null,
      tokens: { mcp_output: 0, html_output: null },
      latency_ms: Date.now() - start
    };
  }

  const { toolCalls, finalText, totalOutputTokens } = parsed_output;
  const dsl = extractDsl(finalText);

  // Also check if boceto_parse tool result has DSL
  const parseToolResult = toolCalls.find(t => t.name === 'boceto_parse');
  const refToolCalled   = toolCalls.some(t => t.name === 'boceto_get_reference');

  const parsedDsl = dsl ? parseDSL(dsl) : { pages: {} };
  const sc = score(tc, dsl, parsedDsl);
  // Measure only the DSL content size — the actual wireframe representation,
  // not the full conversation (which inflates MCP mode with tool call round-trips).
  const mcpOutputTokens = estimateTokens(dsl ?? finalText);

  // ── HTML comparison (only with --compare) ──
  let htmlOutputTokens = null;
  if (compareMode) {
    try {
      const htmlRaw = callClaude({ prompt: userPrompt, system: HTML_SYSTEM, useMcp: false });
      const { finalText: htmlText } = parseClaudeOutput(htmlRaw);
      // Measure the HTML content size for the same apples-to-apples comparison
      htmlOutputTokens = estimateTokens(htmlText.trim());
    } catch { /* non-fatal */ }
  }

  return {
    id: tc.id, category: tc.category, difficulty: tc.difficulty,
    score: sc, dsl,
    toolCalls: toolCalls.map(t => t.name),
    usedGetReference: refToolCalled,
    usedParse: !!parseToolResult,
    tokens: {
      mcp_output: mcpOutputTokens,
      html_output: htmlOutputTokens,
      saved: htmlOutputTokens != null ? htmlOutputTokens - mcpOutputTokens : null,
      pct:   htmlOutputTokens != null ? Math.round((1 - mcpOutputTokens / htmlOutputTokens) * 100) : null
    },
    latency_ms: Date.now() - start
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🔷 Boceto Benchmark (MCP mode) — ${cases.length} cases — model: ${model}${compareMode ? ' — +HTML compare' : ''}\n`);
console.log('─'.repeat(70));

const results = [];

for (const tc of cases) {
  process.stdout.write(`[${tc.id}] ${tc.category.padEnd(12)} ${tc.difficulty.padEnd(8)} … `);
  const r = await runCase(tc);
  results.push(r);

  if (r.error) {
    console.log(`❌ ERROR  (${r.latency_ms}ms)\n   → ${r.error}`);
    continue;
  }

  const pts = r.score.total;
  const bar = '█'.repeat(Math.round(pts / 10)) + '░'.repeat(10 - Math.round(pts / 10));
  const tools = [
    r.usedGetReference ? '📖ref' : '    ',
    r.usedParse        ? '✅parse' : '      '
  ].join(' ');
  let line = `${bar} ${String(pts).padStart(3)}/100  ${tools}`;
  if (compareMode && r.tokens.saved != null) {
    const pctLabel = r.tokens.pct != null
      ? (r.tokens.pct >= 0 ? `-${r.tokens.pct}%` : `+${Math.abs(r.tokens.pct)}%`)
      : '';
    line += `  DSL:${r.tokens.mcp_output}tok  HTML:${r.tokens.html_output}tok  ${pctLabel}`;
  }
  console.log(`${line}  (${r.latency_ms}ms)`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
const ok = results.filter(r => !r.error);
const avg = ok.length ? Math.round(ok.reduce((s, r) => s + r.score.total, 0) / ok.length) : 0;
const usedRef   = ok.filter(r => r.usedGetReference).length;
const usedParse = ok.filter(r => r.usedParse).length;

console.log('\n' + '─'.repeat(70));
console.log(`\n📊 Results`);
console.log(`   Cases ran      :  ${results.length}  (${ok.length} ok, ${results.length - ok.length} errors)`);
console.log(`   Avg score      :  ${avg}/100`);
console.log(`\n🔧 MCP tool usage (over successful cases):`);
console.log(`   boceto_get_reference :  ${usedRef}/${ok.length}  (${ok.length ? Math.round(100*usedRef/ok.length) : 0}%)`);
console.log(`   boceto_parse         :  ${usedParse}/${ok.length}  (${ok.length ? Math.round(100*usedParse/ok.length) : 0}%)`);

const cats = [...new Set(ok.map(r => r.category))];
console.log('\n📂 Score by category:');
for (const cat of cats) {
  const catOk = ok.filter(r => r.category === cat);
  const catAvg = Math.round(catOk.reduce((s, r) => s + r.score.total, 0) / catOk.length);
  console.log(`   ${cat.padEnd(14)} ${catAvg}/100  (${catOk.length} cases)`);
}

console.log('\n📐 Score by dimension:');
const dims = ['parse_success', 'page_coverage', 'component_coverage', 'no_forbidden', 'min_nodes'];
const maxPts = { parse_success: 30, page_coverage: 20, component_coverage: 30, no_forbidden: 10, min_nodes: 10 };
for (const d of dims) {
  const avg = ok.length ? (ok.reduce((s, r) => s + (r.score.dimensions[d]?.pts ?? 0), 0) / ok.length).toFixed(1) : 0;
  console.log(`   ${d.padEnd(22)} ${avg}/${maxPts[d]}`);
}

if (compareMode) {
  const withTok = ok.filter(r => r.tokens.saved != null);
  if (withTok.length > 0) {
    const avgMcp  = Math.round(withTok.reduce((s, r) => s + r.tokens.mcp_output,  0) / withTok.length);
    const avgHtml = Math.round(withTok.reduce((s, r) => s + r.tokens.html_output, 0) / withTok.length);
    const avgPct  = Math.round(withTok.reduce((s, r) => s + r.tokens.pct, 0) / withTok.length);
    const totalMcp  = withTok.reduce((s, r) => s + r.tokens.mcp_output,  0);
    const totalHtml = withTok.reduce((s, r) => s + r.tokens.html_output, 0);
    console.log('\n🪙  Token comparison — representation size (~4 chars/token):');
    console.log(`   Avg DSL size    :  ${avgMcp} tokens   (boceto block content)`);
    console.log(`   Avg HTML size   :  ${avgHtml} tokens  (equivalent HTML snippet)`);
    console.log(`   Token savings   :  -${avgPct}% per wireframe`);
    console.log(`\n   💡 Costo output a $3/M tokens (Sonnet), ${withTok.length} wireframes:`);
    console.log(`      HTML :  $${(totalHtml / 1_000_000 * 3).toFixed(5)}`);
    console.log(`      MCP  :  $${(totalMcp  / 1_000_000 * 3).toFixed(5)}`);
  }
}

// ── Save report ───────────────────────────────────────────────────────────────
const reportPath = join(__dir, `report-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(), model, compareMode,
  summary: { total: results.length, successful: ok.length, avg_score: avg,
             mcp_tool_usage: { get_reference: usedRef, parse: usedParse } },
  cases: results.map(r => ({
    id: r.id, category: r.category, difficulty: r.difficulty,
    score: r.score.total, latency_ms: r.latency_ms, error: r.error ?? null,
    toolCalls: r.toolCalls, dsl: r.dsl, tokens: r.tokens,
    dimensions: r.score?.dimensions
  }))
}, null, 2));
console.log(`\n💾 Report: ${reportPath}\n`);
