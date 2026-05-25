/**
 * Boceto MCP — Vercel Serverless Function
 *
 * Exposes all boceto_* tools as a remote MCP endpoint at https://boceto.online/mcp
 * Vercel routes /mcp → /api/mcp via vercel.json rewrites.
 * Stateless mode: no session state, each request is self-contained.
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall, mcpTools } from '../plugins/boceto-ai-tools.js';

function buildServer() {
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
  return server;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let body;
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = undefined; }
  }

  const server    = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
