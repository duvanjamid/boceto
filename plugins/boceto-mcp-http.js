#!/usr/bin/env node
/**
 * Boceto Remote MCP Server — HTTP (Streamable HTTP transport)
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Exposes parse_boceto, get_dsl_reference, and open_in_editor as a
 * remote MCP server over HTTP. Deploy alongside boceto.online so any
 * MCP client can connect without installing anything locally.
 *
 * Usage:
 *   node plugins/boceto-mcp-http.js           # default port 3100
 *   PORT=4000 node plugins/boceto-mcp-http.js
 *
 * Claude Desktop / Claude Code config:
 *   {
 *     "mcpServers": {
 *       "boceto": { "url": "https://boceto.online/mcp" }
 *     }
 *   }
 *
 * Reverse-proxy /mcp → http://localhost:3100/mcp in your web server (nginx/caddy).
 */

import http                     from 'node:http';
import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall }       from './boceto-ai-tools.js';

const PORT = Number(process.env.PORT ?? 3100);

// ── Build a fresh MCP server + transport per session ─────────────────────────
// Stateless mode (sessionIdGenerator: undefined) — no server-side session state.
// Each request is independent, which is correct for a read-only tool server.

function createMcpServer() {
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
      },
      {
        name: 'open_in_editor',
        description:
          'Encode a Boceto DSL string and return a shareable URL that opens it directly in the ' +
          'Boceto online editor (boceto.online). Use this as the final step after generating and ' +
          'validating a wireframe so the user can interact with it immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            dsl: {
              type: 'string',
              description: 'The Boceto DSL source code to open in the editor.'
            }
          },
          required: ['dsl']
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

  return server;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const httpServer = http.createServer(async (req, res) => {
  // CORS — allow any MCP client origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. MCP endpoint is /mcp' }));
    return;
  }

  // Parse body for POST requests
  let body;
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = undefined; }
  }

  const server    = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});

httpServer.listen(PORT, () => {
  console.log(`[boceto-mcp] HTTP server listening on port ${PORT}`);
  console.log(`[boceto-mcp] MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[boceto-mcp] Remote URL:   https://boceto.online/mcp`);
});
