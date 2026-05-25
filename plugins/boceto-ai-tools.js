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

// ── Tool definitions (single source of truth for all providers) ───────────────

const TOOLS = [
  {
    name: 'boceto_parse',
    description: 'Parse and validate a Boceto DSL wireframe string. Returns the structured page tree, page names, theme, and frame type. Use this to check that generated DSL is syntactically correct before presenting it to the user.',
    schema: {
      type: 'object',
      properties: { dsl: { type: 'string', description: 'The Boceto DSL source code to parse. May contain one or more @PageName screens.' } },
      required: ['dsl']
    }
  },
  {
    name: 'boceto_get_reference',
    description: 'Return the full Boceto DSL syntax reference. Call this before generating wireframe code if you are unsure of the available keywords or their syntax.',
    schema: { type: 'object', properties: {} }
  },
  {
    name: 'boceto_open_in_editor',
    description: 'Encode a Boceto DSL string and return a shareable URL that opens it directly in the Boceto online editor (boceto.online). Use this as the final step after generating and validating a wireframe so the user can interact with it immediately.',
    schema: {
      type: 'object',
      properties: { dsl: { type: 'string', description: 'The Boceto DSL source code to open in the editor.' } },
      required: ['dsl']
    }
  },
  {
    name: 'boceto_get_embed_code',
    description: 'Given a Boceto DSL string, returns a ready-to-use HTML <iframe> snippet for embedding the wireframe in docs, PRs, Notion pages, or Confluence. No account required.',
    schema: {
      type: 'object',
      properties: {
        dsl:    { type: 'string', description: 'The Boceto DSL source code to embed.' },
        width:  { type: 'string', description: 'iframe width attribute (default: "100%").' },
        height: { type: 'string', description: 'iframe height in pixels (default: "600").' }
      },
      required: ['dsl']
    }
  },
  {
    name: 'boceto_export_from_url',
    description: 'Given a boceto.online editor URL (e.g. https://boceto.online/#/editor?w=...), extracts and returns the original DSL source code. Useful for editing a shared wireframe.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'A boceto.online URL containing a ?w= DSL parameter.' } },
      required: ['url']
    }
  },
  {
    name: 'boceto_diff',
    description: 'Compare two Boceto DSL strings and return which pages were added, removed, or changed between versions. Useful for reviewing wireframe changes in PRs or design reviews.',
    schema: {
      type: 'object',
      properties: {
        before: { type: 'string', description: 'The original Boceto DSL source code.' },
        after:  { type: 'string', description: 'The updated Boceto DSL source code.' }
      },
      required: ['before', 'after']
    }
  },
  {
    name: 'boceto_list_themes',
    description: 'List all available Boceto visual themes with name, icon, style description, and best-use context. Call this when the user asks which themes are available or wants a recommendation.',
    schema: { type: 'object', properties: {} }
  },
  {
    name: 'boceto_list_templates',
    description: 'Return ready-to-use Boceto DSL template examples organized by category (auth, dashboard, ecommerce, mobile). Use as a starting point and adapt to the user\'s specific needs.',
    schema: {
      type: 'object',
      properties: { category: { type: 'string', description: 'Filter by category: auth | dashboard | ecommerce | mobile. Omit to get all categories.' } }
    }
  },
  {
    name: 'boceto_validate_nav',
    description: 'Analyze a Boceto DSL and verify that every > @PageName navigation reference points to a declared page. Returns valid links, broken links, and suggested fixes. Call this after generating a multi-page wireframe.',
    schema: {
      type: 'object',
      properties: { dsl: { type: 'string', description: 'The Boceto DSL source code to validate.' } },
      required: ['dsl']
    }
  }
];

// ── Provider-specific schema exports ─────────────────────────────────────────

function toGoogleSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const r = { ...s };
  if (r.type) r.type = r.type.toUpperCase();
  if (r.properties) r.properties = Object.fromEntries(Object.entries(r.properties).map(([k, v]) => [k, toGoogleSchema(v)]));
  if (r.items) r.items = toGoogleSchema(r.items);
  return r;
}

export const mcpTools = TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.schema
}));

export const anthropicTools = TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.schema
}));

export const openaiTools = TOOLS.map(t => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: { ...t.schema, additionalProperties: false },
    strict: true
  }
}));

export const googleTools = [{
  functionDeclarations: TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    parameters: toGoogleSchema(t.schema)
  }))
}];

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function handleToolCall(name, input = {}) {
  try {
    switch (name) {

      case 'boceto_parse': {
        const dsl = typeof input.dsl === 'string' ? input.dsl : '';
        const parsed = parseDSL(dsl);
        const pageNames = Object.keys(parsed.pages);
        const nodeCount = pageNames.reduce((sum, p) => sum + (parsed.pages[p].children?.length ?? 0), 0);
        return { success: true, theme: parsed.theme, frame: parsed.frame, pageCount: pageNames.length, pageNames, nodeCount, pages: parsed.pages };
      }

      case 'boceto_get_reference':
        return { reference: DSL_REFERENCE };

      case 'boceto_open_in_editor': {
        const dsl = typeof input.dsl === 'string' ? input.dsl : '';
        const b64 = Buffer.from(dsl, 'utf8').toString('base64');
        return { success: true, url: `https://boceto.online/#/editor?w=${encodeURIComponent(b64)}`, dsl };
      }

      case 'boceto_get_embed_code': {
        const dsl    = typeof input.dsl    === 'string' ? input.dsl    : '';
        const width  = typeof input.width  === 'string' ? input.width  : '100%';
        const height = typeof input.height === 'string' ? input.height : '600';
        const b64    = Buffer.from(dsl, 'utf8').toString('base64');
        const url    = `https://boceto.online/#/view?w=${encodeURIComponent(b64)}`;
        const html   = `<iframe\n  src="${url}"\n  width="${width}"\n  height="${height}"\n  style="border:none;border-radius:8px"\n  title="Boceto Wireframe"\n  loading="lazy"\n></iframe>`;
        return { success: true, html, url, width, height };
      }

      case 'boceto_export_from_url': {
        const url   = typeof input.url === 'string' ? input.url : '';
        const match = url.match(/[?&]w=([^&\s#]+)/);
        if (!match) return { success: false, error: 'No ?w= parameter found. Expected a boceto.online URL like https://boceto.online/#/editor?w=...' };
        const dsl = Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8');
        return { success: true, dsl };
      }

      case 'boceto_diff': {
        const before = typeof input.before === 'string' ? input.before : '';
        const after  = typeof input.after  === 'string' ? input.after  : '';
        const a = parseDSL(before);
        const b = parseDSL(after);
        const pA = Object.keys(a.pages);
        const pB = Object.keys(b.pages);
        const added   = pB.filter(p => !pA.includes(p));
        const removed = pA.filter(p => !pB.includes(p));
        const changed = [];
        const unchanged = [];
        for (const page of pA.filter(p => pB.includes(p))) {
          const nA = a.pages[page].children?.length ?? 0;
          const nB = b.pages[page].children?.length ?? 0;
          if (JSON.stringify(a.pages[page].children) !== JSON.stringify(b.pages[page].children)) {
            changed.push({ page, nodesBefore: nA, nodesAfter: nB, nodeDiff: nB - nA });
          } else {
            unchanged.push(page);
          }
        }
        return {
          success: true,
          summary: { added: added.length, removed: removed.length, changed: changed.length, unchanged: unchanged.length },
          added, removed, changed, unchanged,
          themeChanged: a.theme !== b.theme ? { before: a.theme, after: b.theme } : null,
          frameChanged: a.frame !== b.frame ? { before: a.frame, after: b.frame } : null
        };
      }

      case 'boceto_list_themes':
        return { success: true, themes: THEMES_INFO };

      case 'boceto_list_templates': {
        const cat = typeof input.category === 'string' ? input.category.toLowerCase() : '';
        const filtered = cat ? TEMPLATES.filter(t => t.category === cat) : TEMPLATES;
        if (cat && filtered.length === 0) return { success: false, error: `Unknown category: ${cat}. Valid values: auth, dashboard, ecommerce, mobile.` };
        return { success: true, templates: filtered };
      }

      case 'boceto_validate_nav': {
        const dsl = typeof input.dsl === 'string' ? input.dsl : '';
        const parsed   = parseDSL(dsl);
        const declared = new Set(Object.keys(parsed.pages));
        const refs     = [...new Set([...dsl.matchAll(/>\s*@(\w+)/g)].map(m => m[1]))];
        const valid    = refs.filter(r =>  declared.has(r)).map(r => ({ target: `@${r}` }));
        const broken   = refs.filter(r => !declared.has(r)).map(r => ({
          target: `@${r}`,
          suggestion: [...declared].find(p => p.toLowerCase() === r.toLowerCase()) ? `@${[...declared].find(p => p.toLowerCase() === r.toLowerCase())}` : null
        }));
        return { success: true, pagesDeclared: [...declared], valid, broken, validCount: valid.length, brokenCount: broken.length };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { success: false, error: e?.message ?? String(e) };
  }
}

// ── Theme catalog ─────────────────────────────────────────────────────────────

export const THEMES_INFO = [
  { name: 'paper',       icon: '☕', style: 'Warm cream',       description: 'Default. Clean professional look. Ideal for business apps and general wireframes.' },
  { name: 'blueprint',   icon: '📐', style: 'Dark navy + blue',  description: 'Technical and engineering-focused. Great for developer tools, system diagrams, and APIs.' },
  { name: 'sketch',      icon: '✏️', style: 'White + sharp ink', description: 'Hand-drawn feel. Great for early-stage concept wireframes and brainstorming sessions.' },
  { name: 'noir',        icon: '🌙', style: 'Dark minimal',      description: 'Modern sleek dark mode. For apps targeting developers or night-mode power users.' },
  { name: 'handwriting', icon: '🖊️', style: 'Parchment + ink',   description: 'Warm artisanal feel. Suited for note-taking apps, journaling, or creative tools.' },
  { name: 'arch',        icon: '📏', style: 'Black + cyan',      description: 'Precise and technical. Ideal for architectural diagrams, infrastructure, and system design.' },
  { name: 'cyberpunk',   icon: '🕹️', style: 'Neon on dark',      description: 'High-contrast futuristic style. For gaming platforms, tech products, or dark creative apps.' },
  { name: 'dots',        icon: '🔘', style: 'White + slate',     description: 'Clean minimal dotted aesthetic. For clean modern SaaS interfaces and design systems.' }
];

// ── Templates ─────────────────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    category: 'auth',
    name: 'Login + Register + Dashboard',
    description: 'Classic auth flow: login screen, registration, and a landing dashboard.',
    dsl: `theme paper

@Login
nav MyApp
# Welcome back
p Sign in to continue
---
field Email
field Password *
btn Sign In > @Dashboard
ghost Create account > @Register
link Forgot password?

@Register
nav MyApp
# Create account
field Full name
field Email
field Password *
field Confirm password *
btn Register > @Dashboard
ghost Sign in > @Login

@Dashboard
nav MyApp | Home | Profile > @Profile | Settings
# Dashboard
row
  kpi 1,284 Users
  kpi 94% Uptime
  kpi $42k Revenue
card Recent Activity
  grid Date | Event | Status

@Profile
nav MyApp | Home > @Dashboard | Profile | Settings
# My Profile
row
  avatar Alex Johnson
  col
    # Alex Johnson
    note alex@example.com
    ghost Edit profile
---
field Full name
field Email
field Phone ?
btn Save changes`
  },
  {
    category: 'dashboard',
    name: 'Admin Dashboard + Users + Settings',
    description: 'Full admin panel with sidebar navigation, metrics, data table, and settings page.',
    dsl: `theme blueprint
frame browser

@Dashboard
nav AdminPanel | Dashboard | Users > @Users | Settings > @Settings
row
  aside
    link Dashboard > @Dashboard
    link Users > @Users
    link Reports
    link Settings > @Settings
  col
    row space
      # Dashboard
      btn + New item
    row
      kpi 1,284 Total users
      kpi 94% Uptime
      kpi $42k Revenue
      kpi 38 Open tickets
    row
      card Recent Activity
        grid Date | User | Action | Status
      card+ Alerts
        badge 3 Critical $"background:#fee2e2;color:#dc2626"
        badge 7 Warnings $"background:#fef3c7;color:#d97706"
        badge 12 Info

@Users
nav AdminPanel | Dashboard > @Dashboard | Users | Settings > @Settings
row
  aside
    link Dashboard > @Dashboard
    link Users > @Users
    link Reports
    link Settings > @Settings
  col
    row space
      # Users
      btn + Invite user
    row
      field Search users
      pick Role | All | Admin | Editor | Viewer
      pick Status | All | Active | Inactive
    grid Name | Email | Role | Status | Joined

@Settings
nav AdminPanel | Dashboard > @Dashboard | Users > @Users | Settings
row
  aside
    link Dashboard > @Dashboard
    link Users > @Users
    link Reports
    link Settings > @Settings
  col
    # Settings
    tabs General | Security | Notifications
      card
        field App name
        field Support email
        pick Timezone | UTC | EST | PST | CET
        toggle Maintenance mode
        btn Save changes
      ---
      card
        field Current password *
        field New password *
        field Confirm password *
        check Require 2FA for all users
        btn Update security settings
      ---
      card
        toggle Email on new user
        toggle Weekly digest
        toggle Critical alerts
        btn Save preferences`
  },
  {
    category: 'ecommerce',
    name: 'E-commerce: Home + Catalog + Cart + Checkout',
    description: 'Full shopping flow from product discovery to order confirmation.',
    dsl: `theme paper
frame browser

@Home
nav ShopCo | Browse > @Catalog | Cart > @Cart | Account
img "Hero banner — Summer Sale"
# Featured Products
row
  card
    img "Product photo"
    p Wireless Headphones
    kpi $79 Price
    btn Add to cart > @Cart
  card
    img "Product photo"
    p Mechanical Keyboard
    kpi $149 Price
    btn Add to cart > @Cart
  card
    img "Product photo"
    p USB-C Hub
    kpi $49 Price
    btn Add to cart > @Cart

@Catalog
nav ShopCo | Browse | Cart > @Cart | Account
row
  aside
    # Filters
    pick Category | All | Electronics | Accessories | Cables
    pick Price | Any | Under $50 | $50–$100 | $100+
    check Free shipping only
    btn Apply
  col
    row space
      # Products (48)
      pick Sort | Newest | Price ↑ | Price ↓ | Popular
    grid Product | Price | Rating | Stock
    row right
      ghost Previous
      btn Next

@Cart
nav ShopCo | Browse > @Catalog | Cart | Account
# Your Cart
grid Product | Qty | Price | Remove
---
row space
  note 3 items
  kpi $277 Subtotal
row right
  ghost Continue shopping > @Catalog
  btn Checkout > @Checkout

@Checkout
nav ShopCo | Browse > @Catalog | Cart > @Cart | Account
# Checkout
row
  col
    card Shipping info
      field Full name
      field Address line 1
      field City
      field Zip code
      pick Country | USA | Canada | Mexico | UK
    card Payment
      field Card number
      field Name on card
      row
        field Expiry
        field CVV
  card Order Summary
    grid Product | Price
    ---
    note Free shipping
    kpi $277 Total
    check I agree to terms and conditions
    btn Place order > @Confirmation

@Confirmation
nav ShopCo | Browse > @Catalog | Cart > @Cart | Account
# Order confirmed!
p Your order has been placed successfully.
note Order #BOC-12345
---
row
  kpi $277 Paid
  kpi 2–4 days Delivery
btn Track order
ghost Continue shopping > @Catalog`
  },
  {
    category: 'mobile',
    name: 'Mobile App: Home + Tasks + Detail',
    description: 'Mobile-first task management app with iOS frame, tab navigation, and modal.',
    dsl: `theme paper
frame ios

@Home
nav MyApp
# Good morning, Alex
p Here's what's happening today.
row
  kpi 8 Tasks due
  kpi 3 Meetings
card Today's Tasks
  check Design review *
  check Team standup *
  check Update documentation
  check Submit weekly report
row right
  link View all > @Tasks
tabs Activity | Stats
  note No new activity
  ---
  img "Weekly progress chart"
btn + Add task > @NewTask

@Tasks
nav MyApp | ← Back > @Home
# My Tasks
pick Filter | All | Today | This week | Done
check Design review *
check Team standup *
check Update documentation
check Submit weekly report
check Plan next sprint
check Review pull requests
btn + New task > @NewTask

@NewTask
modal New Task
  field Task title
  area Description ?
  pick Priority | High | Medium | Low
  pick Due date | Today | Tomorrow | This week | Custom
  toggle Set reminder
  row right
    ghost Cancel > @Tasks
    btn Save > @Tasks`
  }
];

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
- field Label *        Password input (shows ········)
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
- avatar Name                Circular avatar (auto-generates initials)
- badge Text                 Status chip / tag
- kpi Value Label            Large metric display
- grid Col1 | Col2 | Col3    Data table with column headers (renders 3 mock rows)

## Style Modifier
Append $"css-property:value;..." to any line to inject inline CSS.

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
btn Sign In > @Dashboard

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

1. Call boceto_get_reference if you are unsure about keyword syntax.
2. Call boceto_list_templates to find a relevant starting point if the user wants a common pattern (auth, dashboard, e-commerce, mobile).
3. Write valid Boceto DSL inside a fenced code block (\`\`\`boceto).
4. Call boceto_parse to validate your DSL. If pageCount=0 or nodeCount=0, revise and retry.
5. Call boceto_validate_nav to check that all > @PageName links point to declared pages.
6. Call boceto_open_in_editor with the final DSL — return the URL so the user can open the wireframe instantly.
7. Optionally call boceto_get_embed_code if the user wants to embed the wireframe in docs or a PR.

Key DSL rules:
- Each screen starts with @PageName (no spaces in the name).
- Use 2-space indentation for children of containers (row, col, card, aside, modal, tabs, list).
- Separate nav/pick/tabs/grid items with |.
- Navigate between pages with > @PageName at the end of btn, ghost, link, or nav items.
- theme and frame declarations must come before the first @.
- Inject CSS with $"property:value" at the end of any line.

Keep wireframes simple and representative. Use placeholder text. Default to the paper theme unless the user requests otherwise.`;
