import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import hljs from "highlight.js";
import { renderMarkdown, sanitizeHtml } from "@/lib/markdownRenderer";
import { addMermaidToolbars } from "@/lib/mermaidModal";
import type { Language } from "@/lib/detectLanguage";
import type { PreviewBg } from "@/components/atom/LanguageBar";
import type { MermaidBlock } from "@/lib/markdownRenderer";
import "react-photo-view/dist/react-photo-view.css";
import { PhotoProvider, PhotoView } from "react-photo-view";
import ReactPlayer from "react-player";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface Props {
  content: string;
  language: Language;
  previewBg?: PreviewBg;
  onScroll?: () => void;
  zoom?: number;
  selectedLines?: { from: number; to: number } | null;
}

export interface PreviewRef {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  setScrollTop: (value: number) => void;
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue("--background").trim();
  const fg = style.getPropertyValue("--foreground").trim();
  return { bg: `hsl(${bg})`, fg: `hsl(${fg})` };
}

function getScrollbarStyles(): string {
  const style = getComputedStyle(document.documentElement);
  const muted = style.getPropertyValue("--muted").trim();
  const accent = style.getPropertyValue("--accent").trim();
  const radius = style.getPropertyValue("--radius").trim() || "0.25rem";
  return `
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: hsl(${muted} / 0.6); border-radius: ${radius}; border: 2px solid transparent; background-clip: padding-box; }
    ::-webkit-scrollbar-thumb:hover { background: hsl(${accent} / 0.8); border: 2px solid transparent; background-clip: padding-box; }
    ::-webkit-scrollbar-corner { background: transparent; }
    * { scrollbar-width: thin; scrollbar-color: hsl(${muted}) transparent; }
  `;
}

function resolveBg(previewBg?: PreviewBg): string {
  if (previewBg === "light") return "#EEEEEE";
  if (previewBg === "dark") return "#09090B";
  const style = getComputedStyle(document.documentElement);
  const previewBgVar = style.getPropertyValue("--preview-bg").trim();
  return previewBgVar ? `hsl(${previewBgVar})` : getThemeColors().bg;
}

const CSS_SHELL_BODY = `<div class="preview-root"><h1>Heading</h1><p>Paragraph text for previewing your CSS rules.</p><button>Button</button></div>`;

// --- CSV Parser ---
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.trim().split(/\r?\n/);
  for (const line of lines) {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cells.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

// --- CSV Preview ---
function CsvPreview({ content, bg }: { content: string; bg: string }) {
  const rows = useMemo(() => parseCsv(content), [content]);
  const { fg } = getThemeColors();
  const style = getComputedStyle(document.documentElement);
  const border = `hsl(${style.getPropertyValue("--border").trim()})`;
  const muted = `hsl(${style.getPropertyValue("--muted").trim()})`;

  if (rows.length === 0) return (
    <div className="h-full overflow-auto p-4" style={{ background: bg, color: fg }}>
      <em style={{ opacity: 0.5 }}>Arquivo CSV vazio</em>
    </div>
  );

  const [header, ...body] = rows;

  return (
    <div className="h-full overflow-auto p-4" style={{ background: bg, color: fg }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px", fontFamily: "monospace" }}>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} style={{ border: `1px solid ${border}`, padding: "6px 10px", background: muted, textAlign: "left", whiteSpace: "nowrap" }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : `${muted}66` }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: `1px solid ${border}`, padding: "5px 10px", whiteSpace: "nowrap" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- XML / YAML syntax highlight (simple regex-based for preview) ---
function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightXml(text: string): string {
  const esc = escHtml(text);
  return esc
    .replace(/(&lt;\/?)([\w:.-]+)/g, '<span style="color:#f97316;">$1</span><span style="color:#fb923c;">$2</span>')
    .replace(/([\w:.-]+)(=)(&quot;[^&]*&quot;|&apos;[^&]*&apos;)/g, '<span style="color:#facc15;">$1</span><span style="color:#94a3b8;">$2</span><span style="color:#86efac;">$3</span>')
    .replace(/(&lt;\?xml[^%]*?%&gt;)/g, '<span style="color:#94a3b8;">$1</span>')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#64748b;font-style:italic;">$1</span>');
}

function highlightPython(text: string): string {
  const lines = escHtml(text).split('\n');
  const keywords = /\b(def|class|import|from|as|return|if|elif|else|for|while|try|except|finally|with|in|not|and|or|is|None|True|False|pass|break|continue|raise|yield|lambda|global|nonlocal|del|assert|async|await)\b/g;
  const builtins = /\b(print|len|range|type|int|str|float|list|dict|set|tuple|bool|input|open|enumerate|zip|map|filter|sorted|reversed|sum|min|max|abs|round|isinstance|hasattr|getattr|setattr)\b/g;
  return lines.map(line => {
    const commentIdx = line.search(/#/);
    let codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';
    codePart = codePart
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|"""[\s\S]*?"""|'''[\s\S]*?''')/g, '<span style="color:#a5d6ff;">$1</span>')
      .replace(keywords, '<span style="color:#ff7b72;">$1</span>')
      .replace(builtins, '<span style="color:#ffa657;">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#79c0ff;">$1</span>')
      .replace(/\bdef\s+(<span[^>]*>)?([a-zA-Z_]\w*)/g, 'def $1<span style="color:#d2a8ff;">$2</span>');
    const commentHtml = commentPart ? `<span style="color:#8b949e;font-style:italic;">${commentPart}</span>` : '';
    return codePart + commentHtml;
  }).join('\n');
}

function highlightYaml(text: string): string {
  return escHtml(text)
    .replace(/^([ \t]*)([\w-]+)(\s*:)/gm, '$1<span style="color:#60a5fa;">$2</span><span style="color:#94a3b8;">$3</span>')
    .replace(/(:\s+)(".*?"|'.*?')/g, '$1<span style="color:#86efac;">$2</span>')
    .replace(/(:\s+)(\d+\.?\d*)/g, '$1<span style="color:#fb923c;">$2</span>')
    .replace(/(:\s+)(true|false|null|~)/g, '$1<span style="color:#c084fc;">$2</span>')
    .replace(/(#.*$)/gm, '<span style="color:#64748b;font-style:italic;">$1</span>')
    .replace(/^([ \t]*-)/gm, '<span style="color:#94a3b8;">$1</span>');
}

function CodePreview({ content, highlighter, bg, label }: { content: string; highlighter: (t: string) => string; bg: string; label: string }) {
  const { fg } = getThemeColors();
  const highlighted = useMemo(() => highlighter(content), [content, highlighter]);
  return (
    <div className="h-full overflow-auto p-4" style={{ background: bg, color: fg }}>
      <div style={{ fontSize: "11px", opacity: 0.4, marginBottom: "8px", fontFamily: "monospace", textTransform: "uppercase" }}>{label}</div>
      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

// --- Image Preview ---
function ImagePreview({ content, bg, zoom }: { content: string; bg: string; zoom: number }) {
  if (!content || !content.startsWith("data:")) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: bg }}>
        <span style={{ opacity: 0.4, fontSize: "13px" }}>Sem pré-visualização disponível</span>
      </div>
    );
  }
  return (
    <div className="h-full flex items-center justify-center overflow-auto" style={{ background: bg }}>
      <PhotoProvider>
        <PhotoView src={content}>
          <img
            src={content}
            alt="preview"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in", display: "block", transform: `scale(${zoom / 100})`, transition: "transform 0.15s ease" }}
          />
        </PhotoView>
      </PhotoProvider>
    </div>
  );
}

// --- Video Preview ---
function VideoPreview({ content, bg }: { content: string; bg: string }) {
  if (!content || !content.startsWith("data:")) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: bg }}>
        <span style={{ opacity: 0.4, fontSize: "13px" }}>Sem pré-visualização disponível</span>
      </div>
    );
  }
  return (
    <div className="h-full flex items-center justify-center" style={{ background: bg }}>
      <ReactPlayer src={content} controls width="100%" height="100%" style={{ maxHeight: "100%" }} />
    </div>
  );
}

const PDF_ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200];

function PdfToolbarBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }) {
  const style = getComputedStyle(document.documentElement);
  const fg     = `hsl(${style.getPropertyValue("--foreground").trim()})`;
  const muted  = `hsl(${style.getPropertyValue("--muted").trim()})`;
  const radius = style.getPropertyValue("--radius").trim() || "0.375rem";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "26px", height: "26px", padding: "0 6px",
        fontSize: "13px", borderRadius: radius,
        background: "transparent", border: "none",
        color: fg, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = muted; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function PdfPreview({ content, bg }: { content: string; bg: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(100);
  const [baseWidth, setBaseWidth] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollingToRef = useRef(false);

  const cssVars = useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      border:  `hsl(${s.getPropertyValue("--border").trim()})`,
      fg:      `hsl(${s.getPropertyValue("--foreground").trim()})`,
      muted:   `hsl(${s.getPropertyValue("--muted").trim()})`,
      mutedFg: `hsl(${s.getPropertyValue("--muted-foreground").trim()})`,
      primary: `hsl(${s.getPropertyValue("--primary").trim()})`,
      radius:  s.getPropertyValue("--radius").trim() || "0.375rem",
    };
  }, []);

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBaseWidth(Math.floor(w - 48));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Update page indicator as user scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingToRef.current) return;
        let best: { n: number; ratio: number } | null = null;
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.page);
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { n, ratio: entry.intersectionRatio };
          }
        }
        if (best) {
          setPage(best.n);
          setPageInput(String(best.n));
        }
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [numPages]);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPage(1);
    setPageInput("1");
    pageRefs.current = new Array(numPages).fill(null);
  }, []);

  const goTo = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, n));
    setPage(clamped);
    setPageInput(String(clamped));
    const el = pageRefs.current[clamped - 1];
    if (el) {
      scrollingToRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { scrollingToRef.current = false; }, 800);
    }
  }, [numPages]);

  const zoomOut = () => setZoom((z) => {
    const prev = PDF_ZOOM_STEPS.filter((s) => s < z);
    return prev.length ? prev[prev.length - 1] : z;
  });
  const zoomIn = () => setZoom((z) => {
    const next = PDF_ZOOM_STEPS.filter((s) => s > z);
    return next.length ? next[0] : z;
  });
  const zoomReset = () => setZoom(100);

  if (!content || !content.startsWith("data:")) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: bg }}>
        <span style={{ opacity: 0.4, fontSize: "13px" }}>Sem pré-visualização disponível</span>
      </div>
    );
  }

  const pageWidth = Math.floor(baseWidth * zoom / 100);

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-2 py-1 shrink-0 border-b select-none"
        style={{ background: cssVars.muted, borderColor: cssVars.border }}
      >
        {/* Navegação de página */}
        <div className="flex items-center gap-0.5">
          <PdfToolbarBtn onClick={() => goTo(1)} disabled={page <= 1} title="Primeira página"><ChevronsLeft className="h-3.5 w-3.5" /></PdfToolbarBtn>
          <PdfToolbarBtn onClick={() => goTo(page - 1)} disabled={page <= 1} title="Página anterior"><ChevronLeft className="h-3.5 w-3.5" /></PdfToolbarBtn>
          <div className="flex items-center gap-1 mx-1">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
              onBlur={() => goTo(Number(pageInput))}
              onKeyDown={(e) => { if (e.key === "Enter") goTo(Number(pageInput)); }}
              style={{
                width: "36px", textAlign: "center", fontSize: "12px",
                background: "transparent", border: `1px solid ${cssVars.border}`,
                borderRadius: cssVars.radius, color: cssVars.fg,
                padding: "1px 4px", outline: "none",
                appearance: "none", WebkitAppearance: "none",
              }}
            />
            <span style={{ fontSize: "12px", color: cssVars.mutedFg }}>/ {numPages || "—"}</span>
          </div>
          <PdfToolbarBtn onClick={() => goTo(page + 1)} disabled={page >= numPages} title="Próxima página"><ChevronRight className="h-3.5 w-3.5" /></PdfToolbarBtn>
          <PdfToolbarBtn onClick={() => goTo(numPages)} disabled={page >= numPages} title="Última página"><ChevronsRight className="h-3.5 w-3.5" /></PdfToolbarBtn>
        </div>

        <div style={{ width: "1px", height: "18px", background: cssVars.border }} />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <PdfToolbarBtn onClick={zoomOut} disabled={zoom <= PDF_ZOOM_STEPS[0]} title="Diminuir zoom"><ZoomOut className="h-3.5 w-3.5" /></PdfToolbarBtn>
          <button
            onClick={zoomReset}
            title="Redefinir zoom"
            style={{
              fontSize: "11px", color: cssVars.fg, background: "transparent",
              border: `1px solid ${cssVars.border}`, borderRadius: cssVars.radius,
              padding: "1px 6px", cursor: "pointer", minWidth: "46px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <RotateCcw className="h-3 w-3" />{zoom}%
            </span>
          </button>
          <PdfToolbarBtn onClick={zoomIn} disabled={zoom >= PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1]} title="Aumentar zoom"><ZoomIn className="h-3.5 w-3.5" /></PdfToolbarBtn>
        </div>
      </div>

      {/* Page area — all pages rendered for continuous scroll */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center py-5"
        style={{ background: "#525659" }}
      >
        <Document
          file={content}
          onLoadSuccess={onLoadSuccess}
          loading={<span style={{ color: "#ccc", fontSize: "13px", marginTop: "2rem" }}>Carregando...</span>}
          error={<span style={{ color: "#aaa", fontSize: "13px", marginTop: "2rem", opacity: 0.7 }}>Não foi possível carregar o PDF.</span>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <div
                data-page={i + 1}
                ref={(el) => { pageRefs.current[i] = el; }}
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer={false}
                  canvasBackground="#ffffff"
                  customTextRenderer={undefined}
                />
              </div>
              {i < numPages - 1 && (
                <div style={{ width: "100%", height: "8px", background: "#525659" }} />
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

export const AtomPreview = forwardRef<PreviewRef, Props>(function AtomPreview({ content, language, previewBg, onScroll, zoom = 100, selectedLines }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cssShellLoadedRef = useRef(false);
  const lastLanguageRef = useRef<Language | null>(null);
  const lastCssSrcDocRef = useRef<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    get scrollTop() {
      try {
        if (language === "markdown") {
          return scrollContainerRef.current?.scrollTop ?? 0;
        }
        const doc = iframeRef.current?.contentDocument;
        return doc?.documentElement.scrollTop ?? doc?.body?.scrollTop ?? 0;
      } catch {
        return 0;
      }
    },
    get scrollHeight() {
      try {
        if (language === "markdown") {
          return scrollContainerRef.current?.scrollHeight ?? 0;
        }
        const doc = iframeRef.current?.contentDocument;
        return doc?.documentElement.scrollHeight ?? doc?.body?.scrollHeight ?? 0;
      } catch {
        return 0;
      }
    },
    get clientHeight() {
      try {
        if (language === "markdown") {
          return scrollContainerRef.current?.clientHeight ?? 0;
        }
        const doc = iframeRef.current?.contentDocument;
        return doc?.documentElement.clientHeight ?? doc?.body?.clientHeight ?? 0;
      } catch {
        return 0;
      }
    },
    setScrollTop(value: number) {
      try {
        if (language === "markdown") {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = value;
        } else {
          const doc = iframeRef.current?.contentDocument;
          if (doc) {
            doc.documentElement.scrollTop = value;
            if (doc.body) doc.body.scrollTop = value;
          }
        }
      } catch (e) {
        console.error("Preview setScrollTop error:", e);
      }
    },
  }));

  const bg = resolveBg(previewBg);
  const isNonIframe = language === "image" || language === "video" || language === "csv" || language === "xml" || language === "yaml" || language === "python" || language === "pdf";

  // Memoize markdown rendering so selectedLines changes don't cause DOM replacement
  const markdownResult = useMemo(() => {
    if (language !== "markdown") return null;
    const { html, mermaidBlocks } = renderMarkdown(content);
    return { html: sanitizeHtml(html), mermaidBlocks };
  }, [content, language]);

  // ALL hooks must run unconditionally before any early return
  const srcDoc = useMemo(() => {
    if (isNonIframe || language === "markdown") return "";
    const { fg } = getThemeColors();
    const baseStyle = `body{background:${bg};color:${fg};margin:0;padding:16px;}`;
    const scrollbarStyle = getScrollbarStyles();
    const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>`;

    if (language === "html") {
      const normalized = content
        .replace(/\bclassName=/g, "class=")
        .replace(/\bhtmlFor=/g, "for=");

      if (normalized.includes("<head>")) {
        return normalized.replace(
          "<head>",
          `<head><meta charset="utf-8"><style>${baseStyle}${scrollbarStyle}</style>${tailwindScript}`
        );
      }
      return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyle}${scrollbarStyle}</style>${tailwindScript}</head><body>${normalized}</body></html>`;
    }

    if (language === "css") {
      return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyle}${scrollbarStyle}</style><style id="__user_css"></style></head><body>${CSS_SHELL_BODY}</body></html>`;
    }

    if (language === "svg") {
      return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:${bg};overflow:auto;}svg{max-width:100%;max-height:none;overflow:visible;transform-origin:center center;transition:transform 0.15s ease;}</style><style>${scrollbarStyle}</style></head><body>${content}<script>
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'svg-zoom') {
            var svg = document.querySelector('svg');
            if (svg) svg.style.transform = 'scale(' + e.data.value / 100 + ')';
          }
        });
        window.addEventListener('load', function() {
          var svg = document.querySelector('svg');
          if (!svg) return;
          try {
            var box = svg.getBBox();
            if (box.width > 0 && box.height > 0) {
              var vb = svg.getAttribute('viewBox');
              if (vb) {
                var parts = vb.trim().split(/[\\s,]+/).map(Number);
                var vx = parts[0], vy = parts[1], vw = parts[2], vh = parts[3];
                var contentOutside = box.x < vx || box.y < vy || (box.x + box.width) > (vx + vw) || (box.y + box.height) > (vy + vh);
                if (contentOutside) {
                  var pad = 10;
                  svg.setAttribute('viewBox', (box.x - pad) + ' ' + (box.y - pad) + ' ' + (box.width + pad * 2) + ' ' + (box.height + pad * 2));
                }
              }
            }
          } catch(e) {}
        });
      <\/script></body></html>`;
    }

    if (language === "javascript") {
      const escaped = content.replace(/<\/script>/gi, "<\\/script>");
      return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:monospace;padding:12px;color:${fg};background:${bg};margin:0;}#__out{white-space:pre-wrap;}</style><style>${scrollbarStyle}</style></head><body><pre id="__out"></pre><script>
        const out = document.getElementById('__out');
        const log = (...a) => { out.textContent += a.map(x => { try { return typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x); } catch { return String(x); } }).join(' ') + '\\n'; };
        console.log = log; console.info = log; console.warn = log; console.error = log;
        try { ${escaped} } catch (e) { log('Error:', e.message); }
      </script></body></html>`;
    }

    if (language === "json") {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        const escaped = formatted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const highlighted = escaped
          .replace(/("(?:\\.|[^"])*"):/g, '<span style="color:#58a6ff;">$1</span>:')
          .replace(/: ("(?:\\.|[^"])*")/g, ': <span style="color:#a5d6ff;">$1</span>')
          .replace(/: (true|false|null)/g, ': <span style="color:#ff7b72;">$1</span>')
          .replace(/: (-?\d+\.?\d*)/g, ': <span style="color:#79c0ff;">$1</span>');
        return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:monospace;padding:16px;color:${fg};background:${bg};margin:0;white-space:pre-wrap;}pre{margin:0;}</style><style>${scrollbarStyle}</style></head><body><pre>${highlighted}</pre></body></html>`;
      } catch (e: any) {
        return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:monospace;padding:16px;color:${fg};background:${bg};margin:0;}</style><style>${scrollbarStyle}</style></head><body><div style="color:#f85149;"><strong>JSON Error:</strong> ${(e?.message || "Invalid JSON").replace(/</g, "&lt;")}</div></body></html>`;
      }
    }

    return "";
  }, [content, language, previewBg, isNonIframe, bg]);

  // Reset shell-loaded flag when language changes
  useEffect(() => {
    if (lastLanguageRef.current !== language) {
      cssShellLoadedRef.current = false;
      lastLanguageRef.current = language;
    }
  }, [language]);

  useEffect(() => {
    if (language !== "css") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (lastCssSrcDocRef.current !== srcDoc) {
      lastCssSrcDocRef.current = srcDoc;
      cssShellLoadedRef.current = false;
    }

    const applyCss = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const styleEl = doc.getElementById("__user_css") as HTMLStyleElement | null;
      if (styleEl) styleEl.textContent = content;
    };

    if (!cssShellLoadedRef.current) {
      const onLoad = () => {
        cssShellLoadedRef.current = true;
        applyCss();
        iframe.removeEventListener("load", onLoad);
      };
      iframe.addEventListener("load", onLoad);
      iframe.srcdoc = srcDoc;
    } else {
      applyCss();
    }
  }, [srcDoc, content, language]);

  // Force srcdoc update for iframe-based previews (HTML, SVG, JS, JSON)
  useEffect(() => {
    if (isNonIframe || language === "markdown" || language === "css") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = srcDoc;
  }, [srcDoc, language, isNonIframe]);

  // Send zoom to SVG iframe via postMessage
  useEffect(() => {
    if (language !== "svg") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => iframe.contentWindow?.postMessage({ type: "svg-zoom", value: zoom }, "*");
    if (iframe.contentDocument?.readyState === "complete") {
      send();
    } else {
      iframe.addEventListener("load", send, { once: true });
    }
  }, [zoom, language]);

  useEffect(() => {
    if (isNonIframe || language === "markdown") return;
    const iframe = iframeRef.current;
    if (!iframe || !onScroll) return;

    const attachScrollListener = () => {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.addEventListener("scroll", onScroll, true);
      }
    };

    iframe.addEventListener("load", attachScrollListener);
    if (iframe.contentDocument?.readyState === "complete") {
      attachScrollListener();
    }

    return () => {
      iframe.removeEventListener("load", attachScrollListener);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.removeEventListener("scroll", onScroll, true);
      }
    };
  }, [language, onScroll]);

  // --- Render ---
  if (language === "pdf")   return <PdfPreview content={content} bg={bg} />;
  if (language === "image") return <ImagePreview content={content} bg={bg} zoom={zoom} />;
  if (language === "video") return <VideoPreview content={content} bg={bg} />;
  if (language === "csv")   return <CsvPreview content={content} bg={bg} />;
  if (language === "xml")   return <CodePreview content={content} highlighter={highlightXml} bg={bg} label="XML" />;
  if (language === "yaml")   return <CodePreview content={content} highlighter={highlightYaml} bg={bg} label="YAML" />;
  if (language === "python") return <CodePreview content={content} highlighter={highlightPython} bg={bg} label="Python" />;

  if (language === "markdown" && markdownResult) {
    return (
      <MarkdownPreview
        ref={scrollContainerRef}
        html={markdownResult.html}
        mermaidBlocks={markdownResult.mermaidBlocks}
        previewBg={resolveBg(previewBg)}
        onScroll={onScroll}
        zoom={zoom}
        selectedLines={selectedLines}
      />
    );
  }

  if (language === "svg") {
    return (
      <div className="h-full w-full overflow-hidden">
        <iframe
          ref={iframeRef}
          title="preview"
          className="h-full w-full border-0"
          style={{ background: resolveBg(previewBg) }}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcDoc}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <div style={{ width: `${10000 / zoom}%`, height: `${10000 / zoom}%`, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
        <iframe
          ref={iframeRef}
          title="preview"
          className="h-full w-full border-0"
          style={{ background: resolveBg(previewBg) }}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcDoc}
        />
      </div>
    </div>
  );
});

// --- Markdown Preview Component ---

function getMermaidTheme(): 'dark' | 'default' {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  const match = bg.match(/\d+\s+\d+%\s+(\d+)%/);
  return match && parseInt(match[1]) < 50 ? 'dark' : 'default';
}

const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:block"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ERROR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

const MarkdownPreview = forwardRef<HTMLDivElement, { html: string; mermaidBlocks: MermaidBlock[]; previewBg: string; onScroll?: () => void; zoom?: number; selectedLines?: { from: number; to: number } | null }>(
function MarkdownPreview({ html, mermaidBlocks, previewBg, onScroll, zoom = 100, selectedLines }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mermaidBlocks.length === 0) return;
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: getMermaidTheme(),
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        fontSize: 14,
      });

      const blockMap = new Map(mermaidBlocks.map((b) => [b.id, b.diagram]));

      for (const container of el.querySelectorAll<HTMLElement>('[data-mermaid-id]')) {
        if (cancelled) return;
        const diagram = blockMap.get(container.dataset.mermaidId ?? '');
        if (!diagram) continue;

        container.querySelector('.mermaid-rendered')?.remove();
        container.querySelector('.mermaid-parse-error')?.remove();
        container.querySelector('.mermaid-toolbar')?.remove();

        try {
          const { svg } = await mermaid.render('md-' + Math.random().toString(36).slice(2), diagram);
          if (cancelled) return;
          const div = document.createElement('div');
          div.className = 'mermaid-rendered';
          div.innerHTML = svg;
          container.appendChild(div);
        } catch (err) {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message.split('\n')[0] : 'Syntax error';
          const errDiv = document.createElement('div');
          errDiv.className = 'mermaid-parse-error';
          errDiv.innerHTML = `${ERROR_ICON}<span>${msg}</span>`;
          container.appendChild(errDiv);
        }
      }

      if (!cancelled) addMermaidToolbars(el);
    })();

    return () => { cancelled = true; };
  }, [html, mermaidBlocks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 1. Apply syntax highlighting on raw code elements (safe — reads textContent, writes innerHTML)
    el.querySelectorAll<HTMLElement>('pre code[class*="language-"]').forEach((block) => {
      if (!block.dataset.hljsDone) {
        hljs.highlightElement(block);
        block.dataset.hljsDone = '1';
      }
    });

    // 2. Add copy buttons
    el.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
      if (pre.classList.contains('mermaid') || pre.closest('.mermaid-container')) return;
      if (pre.querySelector('.code-copy-btn')) return;
      const code = pre.querySelector('code');
      if (!code) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.title = 'Copiar código';
      btn.innerHTML = `${COPY_ICON}<span>Copiar</span>`;
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(code.textContent ?? '');
        const span = btn.querySelector('span')!;
        span.textContent = 'Copiado!';
        setTimeout(() => { span.textContent = 'Copiar'; }, 1800);
      });
      pre.appendChild(btn);
    });
  }, [html]);


  // Sync editor selection → preview highlight
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.querySelectorAll<HTMLElement>('.preview-selection-highlight')
      .forEach(e => e.classList.remove('preview-selection-highlight'));

    if (!selectedLines) return;

    const lineEls = Array.from(el.querySelectorAll<HTMLElement>('[data-source-line]'))
      .map(e => ({ el: e, line: parseInt(e.dataset.sourceLine!, 10) }))
      .sort((a, b) => a.line - b.line);

    for (let i = 0; i < lineEls.length; i++) {
      const elStart = lineEls[i].line;
      const elEnd = i + 1 < lineEls.length ? lineEls[i + 1].line - 1 : Infinity;
      if (elStart <= selectedLines.to && elEnd >= selectedLines.from) {
        lineEls[i].el.classList.add('preview-selection-highlight');
      }
    }
  }, [selectedLines, html]);

  return (
    <div ref={ref} className="h-full overflow-y-auto p-6" style={{ background: previewBg }} onScroll={onScroll}>
      <div ref={containerRef} className="md-preview max-w-3xl mx-auto" style={{ zoom: zoom / 100 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
});
