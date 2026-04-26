import { marked, type Token } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import katex from "katex";

// GitHub-style alert definitions
const ALERT_TYPES: Record<string, { icon: string; title: string; color: string; bg: string }> = {
  NOTE: { icon: "&#9432;", title: "Note", color: "#0969da", bg: "rgba(9,105,218,0.08)" },
  TIP: { icon: "&#128161;", title: "Tip", color: "#1a7f37", bg: "rgba(26,127,55,0.08)" },
  IMPORTANT: { icon: "&#128273;", title: "Important", color: "#8250df", bg: "rgba(130,80,223,0.08)" },
  WARNING: { icon: "&#9888;", title: "Warning", color: "#9a6700", bg: "rgba(154,103,0,0.08)" },
  CAUTION: { icon: "&#128680;", title: "Caution", color: "#cf222e", bg: "rgba(207,34,46,0.08)" },
};

// Configure marked with syntax highlighting
marked.use({
  gfm: true,
  breaks: true,
});

function dedent(code: string): string {
  const lines = code.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (!nonEmpty.length) return code;
  const minIndent = Math.min(...nonEmpty.map((l) => l.match(/^(\s*)/)?.[1].length ?? 0));
  if (!minIndent) return code;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(dedent(code), { language }).value;
    },
  })
);

// Inject data-source-line into block-level elements for editor↔preview selection sync
marked.use({
  renderer: {
    heading(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      const id = (token.text || '').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
      const text = (this as any).parser.parseInline(token.tokens ?? []);
      return `<h${token.depth}${attr}${id ? ` id="${id}"` : ''}>${text}</h${token.depth}>\n`;
    },
    paragraph(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      const text = (this as any).parser.parseInline(token.tokens ?? []);
      return `<p${attr}>${text}</p>\n`;
    },
    blockquote(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      const body = (this as any).parser.parse(token.tokens ?? []);
      return `<blockquote${attr}>\n${body}</blockquote>\n`;
    },
    list(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      const tag = token.ordered ? 'ol' : 'ul';
      const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
      const body = token.items.map((item: any) => (this as any).listitem(item)).join('');
      return `<${tag}${attr}${start}>\n${body}</${tag}>\n`;
    },
    hr(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      return `<hr${attr}>\n`;
    },
    table(token: any) {
      const attr = token._sl != null ? ` data-source-line="${token._sl}"` : '';
      const header = token.header.map((cell: any, i: number) => {
        const align = token.align[i];
        const alignAttr = align ? ` align="${align}"` : '';
        const cellText = (this as any).parser.parseInline(cell.tokens ?? []);
        return `<th${alignAttr}>${cellText}</th>`;
      }).join('');
      const rows = token.rows.map((row: any[]) => {
        const cells = row.map((cell: any, i: number) => {
          const align = token.align[i];
          const alignAttr = align ? ` align="${align}"` : '';
          const cellText = (this as any).parser.parseInline(cell.tokens ?? []);
          return `<td${alignAttr}>${cellText}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('\n');
      return `<table${attr}>\n<thead>\n<tr>${header}</tr>\n</thead>\n<tbody>\n${rows}\n</tbody>\n</table>\n`;
    },
  },
});

export interface MermaidBlock {
  id: string;
  diagram: string;
}

// --- Frontmatter ---

const FM_LABELS: Record<string, string> = {
  title: 'título', description: 'descrição', author: 'autor', tags: 'tags',
  date: 'data', category: 'categoria', categories: 'categorias',
  draft: 'rascunho', slug: 'slug', lang: 'idioma', layout: 'layout',
};

function parseFrontmatter(content: string): { data: Record<string, string | string[]> | null; body: string } {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)([\s\S]*)/);
  if (!match) return { data: null, body: content };
  const data: Record<string, string | string[]> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const val = raw.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { data: Object.keys(data).length ? data : null, body: match[3] };
}

function renderFrontmatter(data: Record<string, string | string[]>): string {
  const entries = Object.entries(data);
  const rows = entries.map(([key, value], i) => {
    const label = FM_LABELS[key.toLowerCase()] ?? key;
    const isLast = i === entries.length - 1;
    const rowBorder = isLast ? '' : `border-bottom:1px solid hsl(var(--accent));`;
    let cell: string;
    if (Array.isArray(value)) {
      const badges = value.map(t =>
        `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:0.72rem;font-weight:500;border:1px solid hsl(var(--accent));color:hsl(var(--accent-foreground));margin:2px 4px 2px 0;line-height:1.6;">${escapeHtml(t)}</span>`
      ).join('');
      cell = `<td style="padding:10px 16px;font-size:0.875rem;border:1px solid hsl(var(--accent));${rowBorder}"><div style="display:flex;flex-wrap:wrap;align-items:center;">${badges}</div></td>`;
    } else {
      cell = `<td style="padding:10px 16px;font-size:0.875rem;color:hsl(var(--accent-foreground));border:1px solid hsl(var(--accent));${rowBorder}">${escapeHtml(String(value))}</td>`;
    }
    const labelTd = `<td style="padding:10px 16px;font-size:0.75rem;font-weight:500;color:hsl(var(--accent-foreground));white-space:nowrap;background:hsl(var(--muted)/0.6);width:1%;border:1px solid hsl(var(--accent));${rowBorder}">${label}</td>`;
    return `<tr>${labelTd}${cell}</tr>`;
  }).join('');
  return `<div style="margin-bottom:1.5rem;font-family:inherit;"><table style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table></div>`;
}

export function renderMarkdown(content: string): { html: string; mermaidBlocks: MermaidBlock[] } {
  let counter = 0;
  const mermaidBlocks: MermaidBlock[] = [];

  // Extract frontmatter before parsing
  let frontmatterHtml = '';
  const { data: fmData, body: fmBody } = parseFrontmatter(content);
  if (fmData) {
    frontmatterHtml = renderFrontmatter(fmData);
    content = fmBody;
  }

  // Render math with KaTeX BEFORE markdown parsing so marked never corrupts LaTeX
  const renderKatex = (tex: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(tex.trim(), { displayMode, throwOnError: false, output: "html" });
    } catch {
      return escapeHtml(tex);
    }
  };

  let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const rendered = renderKatex(math, true);
    return `\n\n<div class="math-block">${rendered}</div>\n\n`;
  });

  processed = processed.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, math) => {
    const rendered = renderKatex(math, false);
    return `<span class="math-inline">${rendered}</span>`;
  });

  // Extract mermaid blocks before markdown parsing
  processed = processed.replace(/```mermaid\n([\s\S]*?)```/g, (_, diagram) => {
    const id = `mermaid-${counter++}-${Date.now()}`;
    mermaidBlocks.push({ id, diagram: diagram.trim() });
    return `<div class="mermaid-container" data-mermaid-id="${id}">
<pre class="mermaid-src" style="display:none">${escapeHtml(diagram.trim())}</pre>
</div>`;
  });

  // Lex tokens and annotate each top-level token with its source line number
  const tokens = marked.lexer(processed) as (Token & { _sl?: number })[];

  // walkTokens is not called by lexer/parser separately — run it manually so
  // markedHighlight can pre-highlight code blocks (modifies token.text in-place)
  if (marked.defaults.walkTokens) {
    marked.walkTokens(tokens, marked.defaults.walkTokens);
  }

  let lineNum = 1;
  for (const token of tokens) {
    token._sl = lineNum;
    if (token.raw) lineNum += (token.raw.match(/\n/g) || []).length;
  }

  // Parse pre-annotated tokens (skips re-lexing so _sl is preserved in renderer)
  let html = marked.parser(tokens) as string;

  // Post-process: GitHub-style alerts in blockquotes
  html = processGitHubAlerts(html);

  // Post-process: task list items
  html = processTaskLists(html);

  return { html: frontmatterHtml + html, mermaidBlocks };
}

function processGitHubAlerts(html: string): string {
  // Match blockquotes that start with [!TYPE]
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_, type, body) => {
      const upper = type.toUpperCase();
      const alert = ALERT_TYPES[upper];
      if (!alert) return `<blockquote>${body}</blockquote>`;
      // Remove the leading <p> if it's empty after alert removal
      const cleanBody = body.replace(/^\s*<p>\s*<\/p>/i, "");
      return `<div class="markdown-alert markdown-alert-${type.toLowerCase()}" style="border-left:4px solid ${alert.color};padding:12px 16px;margin:16px 0;border-radius:6px;background:${alert.bg};">
        <p class="markdown-alert-title" style="font-weight:600;color:${alert.color};margin:0 0 8px 0;"><span style="margin-right:8px;">${alert.icon}</span>${alert.title}</p>
        ${cleanBody}
      </div>`;
    }
  );
}

function processTaskLists(html: string): string {
  // Convert list items with [ ] or [x] to task list items
  return html.replace(
    /<li>(\[([ xX])\]\s*)(.*?)<\/li>/g,
    (_, _prefix, check, label) => {
      const checked = check.toLowerCase() === "x" ? "checked" : "";
      return `<li class="task-list-item" style="list-style:none;margin-left:-1.2em;"><input type="checkbox" ${checked} disabled style="margin-right:8px;cursor:default;">${label}</li>`;
    }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe", "input", "span", "div", "math", "annotation", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msubsup", "munder", "mover", "munderover", "msqrt", "mroot", "mtext", "mspace", "mtable", "mtr", "mtd"],
    ADD_ATTR: ["checked", "disabled", "style", "class", "data-mermaid-id", "data-source-line", "aria-hidden", "xmlns", "encoding"],
  });
}
