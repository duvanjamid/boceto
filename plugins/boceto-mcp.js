#!/usr/bin/env node
/**
 * Boceto MCP Server — Model Context Protocol server for Boceto DSL tools
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Exposes parse_boceto and get_dsl_reference as MCP tools over stdio.
 *
 * — Claude Desktop / Claude Code (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "boceto": {
 *         "command": "npx",
 *         "args": ["-y", "--package=@duvanjamid/boceto", "boceto-mcp"]
 *       }
 *     }
 *   }
 *
 * — If installed globally (npm i -g @duvanjamid/boceto):
 *   { "mcpServers": { "boceto": { "command": "boceto-mcp" } } }
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall }       from './boceto-ai-tools.js';

// ── Server ────────────────────────────────────────────────────────────────────

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
