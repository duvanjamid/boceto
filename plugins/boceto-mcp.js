#!/usr/bin/env node
/**
 * Boceto MCP Server — Model Context Protocol server for Boceto DSL tools
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Exposes all boceto_* tools as MCP tools over stdio.
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
import { handleToolCall, mcpTools } from './boceto-ai-tools.js';

const server = new Server(
  { name: 'boceto', version: '0.3.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: mcpTools }));

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
