#!/usr/bin/env node
/**
 * Boceto Wireframe Benchmark Runner
 * Usa `claude -p` (Claude Code CLI) para generar DSL y lo valida con parseDSL.
 *
 * Uso:
 *   node benchmarks/run-benchmark.mjs
 *   node benchmarks/run-benchmark.mjs --cases B001,B005,B010
 *   node benchmarks/run-benchmark.mjs --category auth
 *   node benchmarks/run-benchmark.mjs --model claude-opus-4-5
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const filterIds   = getArg('--cases')?.split(',');
const filterCat   = getArg('--category');
const model       = getArg('--model') ?? 'claude-sonnet-4-6';
const TIMEOUT_MS  = 60_000;

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

// ── Load dataset ──────────────────────────────────────────────────────────────

const dataset = JSON.parse(readFileSync(join(__dir, 'dataset.json'), 'utf8'));
let cases = dataset.cases;
if (filterIds) cases = cases.filter(c => filterIds.includes(c.id));
if (filterCat) cases = cases.filter(c => c.category === filterCat);

// ── Load parser ───────────────────────────────────────────────────────────────

let parseDSL;
try {
  const mod = await import(join(ROOT, 'dist/lib/parser.js'));
  parseDSL = mod.parseDSL;
} catch {
  console.error('[benchmark] dist/lib/parser.js not found — run `npm run build:lib` first.');
  process.exit(1);
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `You are a wireframe designer that uses the Boceto DSL.

When asked to create a wireframe, respond ONLY with a fenced code block using the boceto language identifier, like this:

\`\`\`boceto
@PageName
# Title
...
\`\`\`

Do not add explanations before or after the code block. Generate only the DSL.

## Boceto DSL Quick Reference

@PageName          — define a screen/page
# H1 / ## H2       — headings
p Text / note Hint — paragraph / annotation
---                — divider

nav Logo | Link    — top navigation
tabs T1 | T2       — tab switcher (use --- to split content per tab)
row / col          — horizontal / vertical layout
card [Title]       — card container
aside              — sidebar panel
modal [Title]      — modal overlay

field Label [*]    — input (* = required/password)
area [Label]       — textarea
pick Label | Opt1  — dropdown
check Label [*]    — checkbox (* = pre-checked)
toggle Label [*]   — toggle switch

btn Label          — primary button
ghost Label        — outline button
link Label         — inline link

img "Alt"          — image placeholder
avatar Name        — avatar with initials
badge Text         — status chip
kpi Value Label    — large metric
grid Col1 | Col2   — table with mock rows
list | Item1       — bulleted list

btn Label > @Page  — navigate on click
badge X $"css"     — inline CSS modifier`;

// ── Scoring ───────────────────────────────────────────────────────────────────

function score(testCase, dsl, parsed) {
  const { expected } = testCase;
  const allText = dsl.toLowerCase();
  const results = {};
  let total = 0;

  // 1. Parse success (30 pts)
  const pageNames = Object.keys(parsed.pages ?? {});
  const nodeCount = pageNames.reduce(
    (s, p) => s + countNodes(parsed.pages[p]), 0
  );
  const parseOk = pageNames.length > 0 && nodeCount > 0;
  results.parse_success = { ok: parseOk, pts: parseOk ? 30 : 0, max: 30 };
  total += results.parse_success.pts;

  // 2. Page coverage (20 pts)
  const pageOk = pageNames.length >= expected.pages;
  results.page_coverage = {
    ok: pageOk,
    pts: pageOk ? 20 : Math.round(20 * (pageNames.length / expected.pages)),
    max: 20,
    found: pageNames.length, expected: expected.pages
  };
  total += results.page_coverage.pts;

  // 3. Component coverage (30 pts)
  const required   = expected.required_keywords ?? [];
  const found      = required.filter(kw => allText.includes(kw));
  const compPts    = required.length > 0 ? Math.round(30 * found.length / required.length) : 30;
  results.component_coverage = {
    ok: found.length === required.length,
    pts: compPts, max: 30,
    found, missing: required.filter(kw => !allText.includes(kw))
  };
  total += compPts;

  // 4. No forbidden keywords (10 pts)
  const forbidden = expected.forbidden_keywords ?? [];
  const usedForbidden = forbidden.filter(kw => allText.includes(kw));
  const forbidOk = usedForbidden.length === 0;
  results.no_forbidden = { ok: forbidOk, pts: forbidOk ? 10 : 0, max: 10, used: usedForbidden };
  total += results.no_forbidden.pts;

  // 5. Min nodes (10 pts)
  const nodeOk = nodeCount >= (expected.min_nodes ?? 0);
  results.min_nodes = {
    ok: nodeOk,
    pts: nodeOk ? 10 : Math.round(10 * nodeCount / (expected.min_nodes ?? 1)),
    max: 10,
    found: nodeCount, expected: expected.min_nodes
  };
  total += results.min_nodes.pts;

  return { total, max: 100, dimensions: results };
}

function countNodes(page) {
  if (!page) return 0;
  const children = page.children ?? [];
  return children.length + children.reduce((s, n) => s + countNodes(n), 0);
}

// ── Extract DSL from LLM output ───────────────────────────────────────────────

function extractDsl(output) {
  const m = output.match(/```boceto\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

// ── Run one case ──────────────────────────────────────────────────────────────

async function runCase(tc) {
  const prompt = `Create a Boceto DSL wireframe for the following UI:\n\n${tc.prompt}`;
  const start  = Date.now();

  let rawOutput;
  try {
    rawOutput = execSync(
      `claude -p ${JSON.stringify(prompt)} --system ${JSON.stringify(SYSTEM)} --model ${model} --output-format text`,
      { timeout: TIMEOUT_MS, encoding: 'utf8' }
    );
  } catch (err) {
    return {
      id: tc.id, category: tc.category, difficulty: tc.difficulty,
      error: err.message, dsl: null, parsed: null,
      score: { total: 0, max: 100, dimensions: {} },
      latency_ms: Date.now() - start
    };
  }

  const latency = Date.now() - start;
  const dsl     = extractDsl(rawOutput);

  if (!dsl) {
    return {
      id: tc.id, category: tc.category, difficulty: tc.difficulty,
      error: 'No boceto block found in output', rawOutput,
      dsl: null, parsed: null,
      score: { total: 0, max: 100, dimensions: {} },
      latency_ms: latency
    };
  }

  const parsed = parseDSL(dsl);
  const sc     = score(tc, dsl, parsed);

  return {
    id: tc.id, category: tc.category, difficulty: tc.difficulty,
    dsl, parsed,
    score: sc,
    latency_ms: latency
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🔷 Boceto Benchmark — ${cases.length} cases — model: ${model}\n`);
console.log('─'.repeat(60));

const results = [];

for (const tc of cases) {
  process.stdout.write(`[${tc.id}] ${tc.category.padEnd(12)} ${tc.difficulty.padEnd(8)} … `);
  const result = await runCase(tc);
  results.push(result);

  const pts = result.score.total;
  const bar = '█'.repeat(Math.round(pts / 10)) + '░'.repeat(10 - Math.round(pts / 10));
  const status = result.error ? '❌ ERROR' : `${bar} ${pts}/100`;
  console.log(`${status}  (${result.latency_ms}ms)`);
  if (result.error) console.log(`   → ${result.error}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
const successful = results.filter(r => !r.error);
const avg        = successful.length
  ? Math.round(successful.reduce((s, r) => s + r.score.total, 0) / successful.length)
  : 0;

console.log(`\n📊 Results`);
console.log(`   Total cases :  ${results.length}`);
console.log(`   Successful  :  ${successful.length}`);
console.log(`   Errors      :  ${results.length - successful.length}`);
console.log(`   Avg score   :  ${avg}/100`);

// Per-category breakdown
const cats = [...new Set(results.map(r => r.category))];
console.log('\n📂 By category:');
for (const cat of cats) {
  const catResults = successful.filter(r => r.category === cat);
  if (!catResults.length) continue;
  const catAvg = Math.round(catResults.reduce((s, r) => s + r.score.total, 0) / catResults.length);
  console.log(`   ${cat.padEnd(14)} ${catAvg}/100  (${catResults.length} cases)`);
}

// Per-dimension breakdown
console.log('\n📐 By dimension (avg pts over successful cases):');
const dims = ['parse_success', 'page_coverage', 'component_coverage', 'no_forbidden', 'min_nodes'];
const maxPts = { parse_success: 30, page_coverage: 20, component_coverage: 30, no_forbidden: 10, min_nodes: 10 };
for (const dim of dims) {
  const dimAvg = successful.length
    ? (successful.reduce((s, r) => s + (r.score.dimensions[dim]?.pts ?? 0), 0) / successful.length).toFixed(1)
    : 0;
  console.log(`   ${dim.padEnd(22)} ${dimAvg}/${maxPts[dim]}`);
}

// ── Save JSON report ──────────────────────────────────────────────────────────

const report = {
  timestamp: new Date().toISOString(),
  model,
  summary: { total: results.length, successful: successful.length, avg_score: avg },
  cases: results.map(r => ({
    id: r.id, category: r.category, difficulty: r.difficulty,
    score: r.score.total, latency_ms: r.latency_ms,
    error: r.error ?? null, dsl: r.dsl,
    dimensions: r.score.dimensions
  }))
};

const reportPath = join(__dir, `report-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Report saved: ${reportPath}\n`);
