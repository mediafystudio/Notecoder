export type Language =
  | "html" | "css" | "javascript" | "markdown" | "svg"
  | "json" | "python" | "csv" | "yaml" | "xml"
  | "image" | "video" | "pdf";

const IMAGE_EXTS = [".png", ".jpeg", ".jpg", ".bmp", ".ico", ".gif", ".tiff", ".webp", ".avif", ".heic"];
const VIDEO_EXTS = [".mp4", ".webm", ".hevc", ".mkv", ".mov", ".avi"];

export function detectByFilename(name: string): Language | null {
  const lower = name.toLowerCase();

  // PDF files
  if (lower.endsWith(".pdf")) return "pdf";

  // Image files
  if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) return "image";

  // Video files
  if (VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return "video";

  // HTML files
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".mhtml")) return "html";

  // SVG files
  if (lower.endsWith(".svg")) return "svg";

  // CSS files
  if (lower.endsWith(".css")) return "css";

  // JavaScript files (including more extensions)
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".ts") ||
      lower.endsWith(".tsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return "javascript";

  // Markdown files
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx")) return "markdown";

  // JSON files
  if (lower.endsWith(".json")) return "json";

  // Python files
  if (lower.endsWith(".py")) return "python";

  // CSV files
  if (lower.endsWith(".csv")) return "csv";

  // YAML files
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";

  // XML files
  if (lower.endsWith(".xml")) return "xml";

  // Text files
  if (lower.endsWith(".txt")) return "markdown";

  return null;
}

export function detectByContent(content: string): Language {
  const trimmed = content.trim();
  if (!trimmed) return "markdown";

  // SVG signals
  if (/<svg[\s>]/i.test(trimmed) || /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(trimmed)) return "svg";

  // HTML signals
  if (/<!doctype\s+html/i.test(trimmed)) return "html";
  if (/<html[\s>]/i.test(trimmed)) return "html";
  if (/<\/?(div|span|body|head|head|p|a|img|section|article|nav|header|footer|main|h[1-6]|ul|li|table)[\s>]/i.test(trimmed)) {
    if (!/^#{1,6}\s/m.test(trimmed) && !/^\s*[-*+]\s/m.test(trimmed)) return "html";
  }

  // XML signals (before CSS to avoid false positives)
  if (/^<\?xml[\s>]/i.test(trimmed)) return "xml";
  if (/^<[a-zA-Z][a-zA-Z0-9]*[\s>]/.test(trimmed) && /<\/[a-zA-Z][a-zA-Z0-9]*>/.test(trimmed) && !/<html[\s>]/i.test(trimmed)) return "xml";

  // YAML frontmatter is markdown, not YAML — check before YAML signals
  if (/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/.test(trimmed)) return "markdown";

  // Strong markdown signals — must run before YAML to avoid false positives from code block content
  if (/^#{1,6}\s/m.test(trimmed)) return "markdown";
  if (/^\s*[-*+]\s+\S/m.test(trimmed)) return "markdown";
  if (/^>\s/m.test(trimmed)) return "markdown";

  // YAML signals
  if (/^---\s*$/m.test(trimmed) && /^[\w-]+\s*:/m.test(trimmed)) return "yaml";
  if (/^[\w-]+\s*:\s+\S/m.test(trimmed) && !/^\s*[{[\-*]/.test(trimmed) && /\n[\w-]+\s*:/m.test(trimmed)) return "yaml";

  // CSS signals: selector { prop: value }
  const cssMatches = trimmed.match(/[.#]?[\w-]+\s*\{[^}]*[\w-]+\s*:\s*[^}]+\}/g);
  if (cssMatches && cssMatches.length >= 1 && !/function\s*\(|=>|console\.|var\s|let\s|const\s/.test(trimmed)) {
    return "css";
  }
  // @-rules
  if (/^@(media|keyframes|import|font-face|supports|charset)/m.test(trimmed)) return "css";

  // JSON signals
  if (/^\s*[\{\[]/.test(trimmed) && /"[\w-]+"\s*:/.test(trimmed)) {
    try { JSON.parse(trimmed); return "json"; } catch { /* not valid json */ }
  }

  // CSV signals: consistent comma-separated rows
  const lines = trimmed.split("\n").slice(0, 5);
  if (lines.length >= 2) {
    const commaCountsMatch = lines.every((l) => l.split(",").length >= 2);
    const allSameCommaCount = new Set(lines.map((l) => l.split(",").length)).size <= 2;
    if (commaCountsMatch && allSameCommaCount && !/[{[\]<>]/.test(trimmed)) return "csv";
  }

  // Remaining markdown signals
  if (/^\s*\d+\.\s+\S/m.test(trimmed)) return "markdown";
  if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) return "markdown";
  if (/`[^`]+`/.test(trimmed)) return "markdown";

  // Markdown code blocks with language hint (but document itself is markdown)
  if (/```(js|javascript|ts|typescript|jsx|tsx|css|scss|less|html|xml|json|py|python|mermaid)\b[\s\S]*?```/.test(trimmed)) {
    if (/^#{1,6}\s/m.test(trimmed) || /^\s*[-*+]\s/m.test(trimmed) || /\[[^\]]+\]\([^)]+\)/.test(trimmed)) return "markdown";
  }

  // Python signals (no longer checks #.*\n to avoid markdown heading conflict)
  if (/\b(def\s+\w+\s*\(|class\s+\w+[\(:]|if\s+.+:|elif\s+.+:|else:|for\s+\w+\s+in\s|while\s+.+:|import\s+\w+|from\s+\w+\s+import|print\s*\(|\bTrue\b|\bFalse\b|\bNone\b)/.test(trimmed)) {
    if (/:\s*$|:\s*#|^\s+(pass|return|yield|break|continue|raise)/m.test(trimmed)) return "python";
  }

  // JS/TS signals — strong API calls and method chains
  if (/\b(console\.|alert\(|fetch\(|document\.|window\.|navigator\.|localStorage\.|sessionStorage\.|JSON\.|Math\.|Date\.|setTimeout\(|setInterval\(|addEventListener\(|removeEventListener\(|getElementById\(|getElementsBy|querySelector\(|querySelectorAll\(|createElement\(|appendChild\(|classList\.|Promise\.|Array\.|Object\.|String\.|Number\.)\b/.test(trimmed)) {
    return "javascript";
  }

  // JS signals — keywords and syntax
  if (/\b(function\s*\w*\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|class\s+\w+|import\s+|export\s+|return\s|if\s*\(|for\s*\(|while\s*\(|async\s|await\s|try\s*\{|catch\s*\(|throw\s|typeof\s|instanceof\s|new\s+\w+\()/.test(trimmed)) {
    if (/[;{}=()]/.test(trimmed)) return "javascript";
  }

  return "markdown";
}
