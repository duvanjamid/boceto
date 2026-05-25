import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink }     from '@angular/router';
import { ShellThemeService } from '../shell-theme.service';

interface Tool {
  name: string;
  description: string;
  inputs: { name: string; type: string; required: boolean; description: string }[];
  output: string;
}

interface McpClient {
  id: string;
  name: string;
  icon: string;
  config: string;
  lang: string;
}

interface Section {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-ai-tools',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ai-tools.component.html',
  styleUrl: './ai-tools.component.css'
})
export class AiToolsComponent implements OnInit, OnDestroy {
  readonly theme = inject(ShellThemeService);

  activeSection  = signal('setup');
  copiedId       = signal('');

  private observer?: IntersectionObserver;

  readonly sections: Section[] = [
    { id: 'setup',     label: 'Conectar MCP',      icon: 'fa-solid fa-plug' },
    { id: 'remote',    label: 'MCP remoto',         icon: 'fa-solid fa-cloud' },
    { id: 'tools',     label: 'Referencia de tools', icon: 'fa-solid fa-wrench' },
    { id: 'anthropic', label: 'Anthropic (Claude)',  icon: 'fa-solid fa-code' },
    { id: 'openai',    label: 'OpenAI',              icon: 'fa-solid fa-code' },
    { id: 'google',    label: 'Google Gemini',       icon: 'fa-solid fa-code' },
  ];

  readonly clients: McpClient[] = [
    {
      id: 'claude-desktop', name: 'Claude Desktop', icon: 'fa-solid fa-desktop',
      lang: 'json',
      config: `// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "boceto": {
      "command": "npx",
      "args": ["-y", "--package=@duvanjamid/boceto", "boceto-mcp"]
    }
  }
}`
    },
    {
      id: 'claude-code', name: 'Claude Code (CLI)', icon: 'fa-solid fa-terminal',
      lang: 'bash',
      config: `# Add once — persists across sessions
claude mcp add boceto -- npx -y --package=@duvanjamid/boceto boceto-mcp`
    },
    {
      id: 'cursor', name: 'Cursor', icon: 'fa-solid fa-i-cursor',
      lang: 'json',
      config: `// .cursor/mcp.json  (project) or ~/cursor/mcp.json (global)
{
  "mcpServers": {
    "boceto": {
      "command": "npx",
      "args": ["-y", "--package=@duvanjamid/boceto", "boceto-mcp"]
    }
  }
}`
    },
    {
      id: 'windsurf', name: 'Windsurf / Codeium', icon: 'fa-solid fa-wind',
      lang: 'json',
      config: `// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "boceto": {
      "command": "npx",
      "args": ["-y", "--package=@duvanjamid/boceto", "boceto-mcp"]
    }
  }
}`
    }
  ];

  readonly tools: Tool[] = [
    {
      name: 'boceto_parse',
      description: 'Parsea y valida un DSL. Retorna el árbol de páginas, cantidad de nodos, tema y tipo de frame. Úsalo para verificar que el DSL generado sea correcto antes de mostrarlo al usuario.',
      inputs: [{ name: 'dsl', type: 'string', required: true, description: 'Código fuente DSL a parsear.' }],
      output: '{ success, theme, frame, pageCount, pageNames, nodeCount, pages }'
    },
    {
      name: 'boceto_get_reference',
      description: 'Retorna la referencia completa del DSL con todos los keywords y sintaxis disponibles. Llama esta herramienta antes de generar código si tienes dudas sobre la sintaxis.',
      inputs: [],
      output: '{ reference: string }'
    },
    {
      name: 'boceto_open_in_editor',
      description: 'Codifica un DSL como base64 y retorna una URL shareable que abre el wireframe directamente en el editor online de Boceto. Úsalo como último paso después de generar y validar.',
      inputs: [{ name: 'dsl', type: 'string', required: true, description: 'Código DSL a abrir en el editor.' }],
      output: '{ success, url, dsl }'
    },
    {
      name: 'boceto_get_embed_code',
      description: 'Dado un DSL, retorna el snippet HTML <iframe> listo para incrustar en docs, PRs, Notion o Confluence. No requiere cuenta.',
      inputs: [
        { name: 'dsl',    type: 'string', required: true,  description: 'Código DSL a embeber.' },
        { name: 'width',  type: 'string', required: false, description: 'Ancho del iframe (default: "100%").' },
        { name: 'height', type: 'string', required: false, description: 'Alto del iframe en px (default: "600").' }
      ],
      output: '{ success, html, url, width, height }'
    },
    {
      name: 'boceto_export_from_url',
      description: 'Operación inversa de open_in_editor: dado un link de boceto.online, extrae y retorna el DSL fuente. Útil para editar un wireframe compartido.',
      inputs: [{ name: 'url', type: 'string', required: true, description: 'URL de boceto.online con parámetro ?w=.' }],
      output: '{ success, dsl }'
    },
    {
      name: 'boceto_diff',
      description: 'Compara dos DSL y retorna qué páginas/elementos cambiaron entre versiones. Útil para revisar cambios de wireframes en PRs o design reviews.',
      inputs: [
        { name: 'before', type: 'string', required: true, description: 'DSL original.' },
        { name: 'after',  type: 'string', required: true, description: 'DSL actualizado.' }
      ],
      output: '{ summary, added, removed, changed, unchanged, themeChanged, frameChanged }'
    },
    {
      name: 'boceto_list_themes',
      description: 'Lista los 8 temas visuales disponibles con nombre, icono, descripción de estilo y contexto de uso recomendado.',
      inputs: [],
      output: '{ themes: [{ name, icon, style, description }] }'
    },
    {
      name: 'boceto_list_templates',
      description: 'Retorna plantillas DSL predefinidas por categoría (auth, dashboard, ecommerce, mobile) listas para adaptar. Úsalas como punto de partida.',
      inputs: [{ name: 'category', type: 'string', required: false, description: 'Filtrar: auth | dashboard | ecommerce | mobile. Omitir para obtener todas.' }],
      output: '{ templates: [{ category, name, description, dsl }] }'
    },
    {
      name: 'boceto_validate_nav',
      description: 'Analiza un DSL y verifica que todos los links > @PageName apunten a páginas declaradas. Retorna links válidos, rotos y sugerencias de corrección.',
      inputs: [{ name: 'dsl', type: 'string', required: true, description: 'DSL a validar.' }],
      output: '{ pagesDeclared, valid, broken, validCount, brokenCount }'
    }
  ];

  readonly remoteConfig = `{
  "mcpServers": {
    "boceto": {
      "url": "https://boceto.online/mcp"
    }
  }
}`;

  readonly anthropicCode = `import Anthropic from '@anthropic-ai/sdk';
import { anthropicTools, handleToolCall } from '@duvanjamid/boceto/plugins/ai-tools';

const client = new Anthropic();

async function run(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage }
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      tools: anthropicTools,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      return response.content.find(b => b.type === 'text')?.text;
    }

    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    const results = await Promise.all(
      toolUses.map(async (tu) => {
        const result = await handleToolCall(tu.name, tu.input as Record<string, unknown>);
        return {
          type: 'tool_result' as const,
          tool_use_id: tu.id,
          content: JSON.stringify(result)
        };
      })
    );
    messages.push({ role: 'user', content: results });
  }
}

run('Design a login screen with email, password, and a forgot password link')
  .then(console.log);`;

  readonly openaiCode = `import OpenAI from 'openai';
import { openaiTools, handleToolCall } from '@duvanjamid/boceto/plugins/ai-tools';

const client = new OpenAI();

async function run(userMessage: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage }
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      tools: openaiTools,
      messages
    });

    const choice = response.choices[0];
    if (choice.finish_reason === 'stop') {
      return choice.message.content;
    }

    messages.push(choice.message);

    const calls = choice.message.tool_calls ?? [];
    for (const call of calls) {
      const args = JSON.parse(call.function.arguments);
      const result = await handleToolCall(call.function.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }
}

run('Design a mobile e-commerce checkout flow').then(console.log);`;

  readonly googleCode = `import { GoogleGenerativeAI } from '@google/generative-ai';
import { googleTools, handleToolCall } from '@duvanjamid/boceto/plugins/ai-tools';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genai.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools: googleTools
});

async function run(userMessage: string) {
  const chat = model.startChat();
  let response = await chat.sendMessage(userMessage);

  while (true) {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const fnCalls = parts.filter(p => p.functionCall);

    if (fnCalls.length === 0) {
      return parts.find(p => p.text)?.text;
    }

    const results = await Promise.all(
      fnCalls.map(async (p) => {
        const { name, args } = p.functionCall!;
        const result = await handleToolCall(name, args as Record<string, unknown>);
        return { functionResponse: { name, response: result } };
      })
    );

    response = await chat.sendMessage(results);
  }
}

run('Create an admin dashboard wireframe with sidebar navigation').then(console.log);`;

  copiedCodes: Record<string, string> = {};

  activeClientTab  = signal('claude-desktop');
  readonly currentClient = computed(() => this.clients.find(c => c.id === this.activeClientTab()) ?? this.clients[0]);

  ngOnInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) {
          const top = visible.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
          const id = top.target.id.replace('section-', '');
          this.activeSection.set(id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    this.sections.forEach(s => {
      const el = document.getElementById('section-' + s.id);
      if (el) this.observer!.observe(el);
    });
  }

  ngOnDestroy() { this.observer?.disconnect(); }

  scrollTo(id: string) {
    document.getElementById('section-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code);
    this.copiedId.set(id);
    setTimeout(() => this.copiedId.set(''), 2000);
  }

}
