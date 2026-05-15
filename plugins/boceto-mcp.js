#!/usr/bin/env node
/**
 * Boceto MCP Server — Model Context Protocol server for Boceto DSL tools
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Exposes parse_boceto and get_dsl_reference as MCP tools over stdio.
 *
 * Usage:
 *   node plugins/boceto-mcp.js
 *
 * Claude Desktop (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "boceto": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/boceto/plugins/boceto-mcp.js"]
 *       }
 *     }
 *   }
 *
 * Requires:
 *   npm install @modelcontextprotocol/sdk
 *   npm run build:lib   (to build dist/lib/parser.js)
 */

import { handleToolCall } from './boceto-ai-tools.js';

// ── Load MCP SDK (optional dependency) ───────────────────────────────────────

let Server, StdioServerTransport, ListToolsRequestSchema, CallToolRequestSchema;

try {
  const serverMod = await import('@modelcontextprotocol/sdk/server/index.js');
  const stdioMod  = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const typesMod  = await import('@modelcontextprotocol/sdk/types.js');
  Server                = serverMod.Server;
  StdioServerTransport  = stdioMod.StdioServerTransport;
  ListToolsRequestSchema = typesMod.ListToolsRequestSchema;
  CallToolRequestSchema  = typesMod.CallToolRequestSchema;
} catch {
  console.error(
    '[boceto-mcp] @modelcontextprotocol/sdk is not installed.\n' +
    'Run: npm install @modelcontextprotocol/sdk'
  );
  process.exit(1);
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'boceto', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'parse_boceto',
      description:
        'Parse and validate a Boceto DSL wireframe string. Returns the structured page tree, ' +
        'page names, theme, and frame type. Use this to check that generated DSL is syntactically ' +
        'correct before presenting it to the user.',
      inputSchema: {
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
      name: 'get_dsl_reference',
      description:
        'Return the full Boceto DSL syntax reference. Call this before generating wireframe code ' +
        'if you are unsure of the available keywords or their syntax.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleToolCall(name, args ?? {});
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    ...(result.success === false ? { isError: true } : {})
  };
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
