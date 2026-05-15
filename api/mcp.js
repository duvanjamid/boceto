/**
 * Boceto MCP — Vercel Serverless Function
 *
 * Exposes parse_boceto, get_dsl_reference, and open_in_editor as a
 * remote MCP endpoint at https://boceto.online/mcp
 *
 * Vercel routes /mcp → /api/mcp via vercel.json rewrites.
 * Stateless mode: no session state, each request is self-contained.
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall }       from '../plugins/boceto-ai-tools.js';

function buildServer() {
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
            dsl: { type: 'string', description: 'The Boceto DSL source code.' }
          },
          required: ['dsl']
        }
      },
      {
        name: 'get_dsl_reference',
        description:
          'Return the full Boceto DSL syntax reference. Call this before generating wireframe code ' +
          'if you are unsure of the available keywords or their syntax.',
        inputSchema: { type: 'object', properties: {} }
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
            dsl: { type: 'string', description: 'The Boceto DSL source code to open in the editor.' }
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

export default async function handler(req, res) {
  // CORS — allow any MCP client origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse body (Vercel doesn't auto-parse for all content types)
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
