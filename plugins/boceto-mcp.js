#!/usr/bin/env node
/**
 * Boceto MCP Server — Model Context Protocol server for Boceto DSL tools
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Exposes parse_boceto, get_dsl_reference, and open_in_editor as MCP tools over stdio.
 *
 * — Claude Desktop / Claude Code config:
 *   {
 *     "mcpServers": {
 *       "boceto": {
 *         "command": "npx",
 *         "args": ["-y", "--package=@duvanjamid/boceto", "boceto-mcp"]
 *       }
 *     }
 *   }
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall }       from './boceto-ai-tools.js';

const server = new Server(
  { name: 'boceto', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'parse_boceto',
      description: 'Parse and validate a Boceto DSL wireframe string. Returns the structured page tree, page names, theme, and frame type.',
      inputSchema: { type: 'object', properties: { dsl: { type: 'string', description: 'The Boceto DSL source code to parse.' } }, required: ['dsl'] }
    },
    {
      name: 'get_dsl_reference',
      description: 'Return the full Boceto DSL syntax reference.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'open_in_editor',
      description: 'Encode a Boceto DSL string and return a shareable URL that opens it in the Boceto online editor (boceto.online).',
      inputSchema: { type: 'object', properties: { dsl: { type: 'string', description: 'The Boceto DSL source code to open.' } }, required: ['dsl'] }
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

const transport = new StdioServerTransport();
await server.connect(transport);
