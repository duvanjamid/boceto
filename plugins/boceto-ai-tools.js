/**
 * Boceto AI Tools — Tool schemas and executor for LLM function calling
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Usage:
 *   import { anthropicTools, openaiTools, googleTools, handleToolCall,
 *            DSL_REFERENCE, SYSTEM_PROMPT } from '@duvanjamid/boceto/plugins/ai-tools';
 *
 * Requires dist/lib/parser.js — run `npm run build:lib` first (or `npm install @duvanjamid/boceto`).
 */

import { parseDSL } from '../dist/lib/parser.js';

// ── Tool names ────────────────────────────────────────────────────────────────

const TOOL_PARSE = 'parse_boceto';
const TOOL_REF   = 'get_dsl_reference';

const PARSE_DESC = 'Parse and validate a Boceto DSL wireframe string. Returns the structured page tree, page names, theme, and frame type. Use this to check that generated DSL is syntactically correct before presenting it to the user.';
const REF_DESC   = 'Return the full Boceto DSL syntax reference. Call this before generating wireframe code if you are unsure of the available keywords or their syntax.';

// ── Anthropic (Claude) tool schemas ──────────────────────────────────────────

export const anthropicTools = [
  {
    name: TOOL_PARSE,
    description: PARSE_DESC,
    input_schema: {
      type: 'object',
      properties: {
        dsl: {
          type: 'string',
          description: 'The Boceto DSL source code to parse. May contain one or more @PageName screens.'
        }
      },
      required: ['dsl']
    }
  },
  {
    name: TOOL_REF,
    description: REF_DESC,
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

// ── OpenAI function calling schemas ──────────────────────────────────────────

export const openaiTools = [
  {
    type: 'function',
    function: {
      name: TOOL_PARSE,
      description: PARSE_DESC,
      parameters: {
        type: 'object',
        properties: {
          dsl: {
            type: 'string',
            description: 'The Boceto DSL source code to parse.'
          }
        },
        required: ['dsl'],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: 'function',
    function: {
      name: TOOL_REF,
      description: REF_DESC,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      strict: true
    }
  }
];

// ── Google Gemini function declarations ──────────────────────────────────────
// Gemini uses uppercase type strings ('OBJECT', 'STRING') — different from JSON Schema

export const googleTools = [
  {
    functionDeclarations: [
      {
        name: TOOL_PARSE,
        description: PARSE_DESC,
        parameters: {
          type: 'OBJECT',
          properties: {
            dsl: {
              type: 'STRING',
              description: 'The Boceto DSL source code to parse.'
            }
          },
          required: ['dsl']
        }
      },
      {
        name: TOOL_REF,
        description: REF_DESC,
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }
    ]
  }
];

// ── Tool executor ─────────────────────────────────────────────────────────────

/**
 * Execute a Boceto tool call and return a serializable result.
 * Never throws — errors are returned as { success: false, error }.
 *
 * @param {string} name   Tool name ('parse_boceto' | 'get_dsl_reference')
 * @param {object} input  Tool input arguments
 * @returns {Promise<object>}
 */
export async function handleToolCall(name, input = {}) {
  try {
    switch (name) {
      case TOOL_PARSE: {
        const dsl = typeof input.dsl === 'string' ? input.dsl : '';
        const parsed = parseDSL(dsl);
        const pageNames = Object.keys(parsed.pages);
        const nodeCount = pageNames.reduce(
          (sum, p) => sum + (parsed.pages[p].children?.length ?? 0), 0
        );
        return {
          success: true,
          theme: parsed.theme,
          frame: parsed.frame,
          pageCount: pageNames.length,
          pageNames,
          nodeCount,
          pages: parsed.pages
        };
      }
      case TOOL_REF:
        return { reference: DSL_REFERENCE };
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { success: false, error: e?.message ?? String(e) };
  }
}

// ── DSL Reference ─────────────────────────────────────────────────────────────

export const DSL_REFERENCE = `BOCETO DSL REFERENCE
====================

## Basic Structure
- @PageName      Define a screen/page. Everything until the next @ belongs to this page.
- theme NAME     Set visual theme. Must come before the first @.
                 Values: paper | blueprint | sketch | noir | handwriting | arch | cyberpunk | dots
- frame NAME     Set device frame. Must come before the first @.
                 Values: auto (default) | ios | android | browser
- //             Comment line (ignored by parser).

## Indentation
Use 2 spaces to nest children inside containers (row, col, card, aside, modal, tabs, list).

## Typography
- # Text         H1 heading
- ## Text        H2 heading
- ### Text       H3 heading
- p Text         Body paragraph
- note Text      Secondary annotation (smaller, muted)
- ---            Horizontal divider

## Navigation Bar
- nav Logo | Link1 | Link2 | ...
  First item is the brand/logo. Subsequent items are links.
  Items can navigate: nav App | Home > @Home | Settings > @Settings

## Containers  (accept indented children)
- row                  Horizontal flex row (left-aligned)
- row right            Right-aligned flex row
- row center           Centered flex row
- row space            Space-between flex row
- col                  Vertical column (use inside row)
- card Title           Card with optional title
- card+ Title          Card with × close button
- aside                Sidebar panel
- modal Title          Modal dialog overlay
- tabs Tab1 | Tab2     Tabbed container. Use --- inside to split content per tab.
- list                 Bulleted list container (children are li items)

## Form Elements
- field Label          Text input
- field Label *        Password input (shows ••••••••)
- field Label ?        Optional text input
- area Label           Multiline textarea
- area Label ?         Optional textarea
- pick Label | Opt1 | Opt2 | ...   Dropdown select
- check Label          Checkbox (unchecked)
- check Label *        Checkbox (checked by default)
- toggle Label         Toggle switch (off)
- toggle Label *       Toggle switch (on by default)

## Actions
- btn Label                  Primary button
- btn Label > @PageName      Primary button that navigates to a page on click
- ghost Label                Outline / secondary button
- ghost Label > @PageName    Outline button with navigation
- link Label                 Inline text link
- link Label > @PageName     Inline link with navigation

## Content
- img "Alt text"             Image placeholder box
- avatar Name                Circular avatar (auto-generates initials, e.g. "Ana López" → "AL")
- badge Text                 Status chip / tag
- kpi Value Label            Large metric display (e.g. "kpi 94% Retention")
- grid Col1 | Col2 | Col3    Data table with column headers (renders 3 mock rows)

## Style Modifier
Append $"css-property:value;..." to any line to inject inline CSS:
  btn Delete $"background:#dc2626;color:white"
  badge Active $"background:#dcfce7;color:#166534;border-color:#86efac"
  card $"border-color:#7c3aed;border-width:2px"

## Navigation Syntax
Use > @PageName at the end of btn, ghost, link, nav items, img, or avatar lines.
The @PageName must exactly match a declared @PageName in the DSL.

## Minimal Example
\`\`\`boceto
theme paper

@Login
nav MyApp
# Welcome back
p Sign in to continue
---
field Email
field Password *
check Remember me
btn Sign In > @Dashboard
link Forgot password?

@Dashboard
nav MyApp | Home | Settings
# Dashboard
row
  kpi 1,284 Users
  kpi 94% Uptime
card+ Recent Activity
  grid Date | Event | Status
\`\`\``;

// ── System Prompt ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a UI wireframe designer using the Boceto DSL. When a user asks you to design a screen, flow, or interface:

1. Write valid Boceto DSL inside a fenced code block (\`\`\`boceto).
2. Call the parse_boceto tool to validate your DSL before presenting it to the user.
   - If the result has pageCount=0 or nodeCount=0, your DSL is empty or invalid — revise it.
3. Call get_dsl_reference if you are unsure about keyword syntax.

Key DSL rules:
- Each screen starts with @PageName (no spaces in the name).
- Use 2-space indentation for children of containers (row, col, card, aside, modal, tabs, list).
- Separate nav/pick/tabs/grid items with |.
- Navigate between pages with > @PageName at the end of btn, ghost, link, or nav items.
- theme and frame declarations must come before the first @.
- Inject CSS with $"property:value" at the end of any line.

Keep wireframes simple and representative. Use placeholder text. Default to the paper theme unless the user requests otherwise.`;
