/**
 * Boceto remark plugin — transforms ```boceto``` fenced blocks
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Works with: remark, unified, MDX, Astro, Next.js (with @next/mdx), Docusaurus
 *
 * Usage (unified / remark):
 *   import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';
 *   const processor = remark().use(remarkBoceto);
 *
 * Usage (Astro — astro.config.mjs):
 *   import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';
 *   export default defineConfig({
 *     markdown: { remarkPlugins: [remarkBoceto] }
 *   });
 *
 * Usage (Next.js — next.config.mjs with @next/mdx):
 *   import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';
 *   const withMDX = createMDX({ options: { remarkPlugins: [remarkBoceto] } });
 *
 * Output: replaces each ```boceto block with a raw <boceto-preview> custom element.
 * Requires boceto-web-component.js loaded globally (or bundled as a side-effect import).
 */

import { visit } from 'unist-util-visit';

/**
 * Escape HTML attribute value (double-quote safe).
 * @param {string} s
 * @returns {string}
 */
function escAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Extract theme from the first `theme <name>` line of the DSL.
 * Returns null if not present.
 * @param {string} dsl
 * @returns {string|null}
 */
function extractTheme(dsl) {
  const m = dsl.match(/^\s*theme\s+(\S+)/m);
  return m ? m[1] : null;
}

/**
 * remarkBoceto — remark plugin.
 * Options:
 *   scriptSrc  {string}  — CDN/local URL for boceto-web-component.js.
 *                          If provided, injects a <script> tag once before the first block.
 *                          Default: null (assume already loaded).
 *   height     {string}  — Default height attribute. Default: 'auto'.
 */
export default function remarkBoceto(options = {}) {
  const { scriptSrc = null, height = 'auto' } = options;

  return (tree) => {
    let scriptInjected = false;
    const nodesToReplace = [];

    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'boceto') return;

      const dsl  = node.value || '';
      const theme = extractTheme(dsl) || 'paper';
      const attr  = escAttr(dsl);

      const htmlNodes = [];

      // Inject <script> once before the first boceto block
      if (scriptSrc && !scriptInjected) {
        htmlNodes.push({
          type: 'html',
          value: `<script src="${escAttr(scriptSrc)}" defer><\/script>`,
        });
        scriptInjected = true;
      }

      htmlNodes.push({
        type: 'html',
        value: `<boceto-preview theme="${theme}" height="${escAttr(height)}" dsl="${attr}"></boceto-preview>`,
      });

      nodesToReplace.push({ parent, index, htmlNodes });
    });

    // Replace in reverse order to preserve indices
    for (let i = nodesToReplace.length - 1; i >= 0; i--) {
      const { parent, index, htmlNodes } = nodesToReplace[i];
      parent.children.splice(index, 1, ...htmlNodes);
    }
  };
}
