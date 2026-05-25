#!/usr/bin/env node
/**
 * Boceto Remote MCP Server — HTTP (Streamable HTTP transport)
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Usage: node plugins/boceto-mcp-http.js  (default port 3100)
 * Config: { "mcpServers": { "boceto": { "url": "https://boceto.online/mcp" } } }
 */

import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall } from './boceto-ai-tools.js';

const PORT = Number(process.env.PORT ?? 3100);

function createMcpServer() {
  const server = new Server({ name: 'boceto', version: '0.2.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'parse_boceto', description: 'Parse and validate a Boceto DSL wireframe string.', inputSchema: { type: 'object', properties: { dsl: { type: 'string' } }, required: ['dsl'] } },
      { name: 'get_dsl_reference', description: 'Return the full Boceto DSL syntax reference.', inputSchema: { type: 'object', properties: {} } },
      { name: 'open_in_editor', description: 'Return a boceto.online editor URL for the given DSL.', inputSchema: { type: 'object', properties: { dsl: { type: 'string' } }, required: ['dsl'] } }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await handleToolCall(name, args ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], ...(result.success === false ? { isError: true } : {}) };
  });

  return server;
}

const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'MCP endpoint is /mcp' }));
    return;
  }

  let body;
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = undefined; }
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});

httpServer.listen(PORT, () => {
  console.log(`[boceto-mcp] HTTP server on port ${PORT} — endpoint: /mcp`);
});
