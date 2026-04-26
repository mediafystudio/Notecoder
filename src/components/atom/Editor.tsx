import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useCallback, useMemo, useRef, useState } from "react";
import { SelectionToolbar, type ToolbarState } from "./SelectionToolbar";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { xml } from "@codemirror/lang-xml";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { tags } from "@lezer/highlight";
import {
  EditorView,
  ViewPlugin,
  Decoration,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { highlightSelectionMatches, search } from "@codemirror/search";
import { Prec, RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  parseColorLiteral,
  parseNamedColor,
  colorPickerTheme,
  type ColorData,
} from "@replit/codemirror-css-color-picker";
import type { Language } from "@/lib/detectLanguage";

interface Props {
  value: string;
  language: Language;
  onChange: (v: string) => void;
  editorRef?: React.Ref<ReactCodeMirrorRef>;
  onSearchOpen?: () => void;
  onScrollY?: () => void;
  onSelectionChange?: (range: { from: number; to: number } | null) => void;
}

// Match hex (#rgb / #rgba / #rrggbb / #rrggbbaa) and rgb()/rgba()/hsl()/hsla()
// anywhere in the document — strings, HTML attributes, JSX, comments, etc.
const COLOR_REGEX =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|(?:rgba?|hsla?)\(\s*[^)]*\)/g;

// Raw "H S% L%" values used in CSS custom properties (e.g. Tailwind/shadcn tokens).
// Matches patterns like: 0 0% 3.9%  or  234 19% 13%
const RAW_HSL_REGEX = /\b(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%/g;

// Common CSS named colors. Limited to avoid false positives in prose.
const NAMED_COLOR_REGEX =
  /\b(?:red|blue|green|black|white|yellow|orange|purple|pink|gray|grey|cyan|magenta|brown|lime|navy|teal|olive|maroon|silver|gold|indigo|violet|coral|salmon|crimson|tomato|turquoise|khaki|plum|orchid|tan|beige|ivory|azure|lavender|aqua|fuchsia)\b/g;

function hexToCssColor(hex: string, alpha: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (alpha) {
    const a = parseInt(alpha, 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

type SourceFormat = "hex" | "rgb" | "rgba" | "hsl" | "hsla" | "raw-hsl";

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function parseHslColorLiteral(text: string): { data: ColorData; sourceFormat: SourceFormat } | null {
  // Comma-separated: hsl(120, 50%, 50%) or hsla(120, 50%, 50%, 0.5)
  let m = text.match(/^(hsla?)\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*,\s*([\d.]+))?\s*\)$/);
  // Space-separated CSS4: hsl(120 50% 50%) or hsl(120 50% 50% / 0.5)
  if (!m) m = text.match(/^(hsla?)\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+))?\s*\)$/);
  if (!m) return null;
  const h = parseFloat(m[2]);
  const s = parseFloat(m[3]);
  const l = parseFloat(m[4]);
  if (h > 360 || s > 100 || l > 100) return null;
  const hasAlpha = m[5] !== undefined;
  const a = hasAlpha ? parseFloat(m[5]) : 1;
  const hex = hslToHex(h, s, l);
  const alphaHex = hasAlpha && a < 1 ? Math.round(a * 255).toString(16).padStart(2, "0") : "";
  return {
    data: { color: hex, alpha: alphaHex, colorType: "HEX" } as ColorData,
    sourceFormat: hasAlpha ? "hsla" : "hsl",
  };
}

function parseRawHslToken(h: number, s: number, l: number): { data: ColorData; sourceFormat: SourceFormat } | null {
  if (h > 360 || s > 100 || l > 100) return null;
  const hex = hslToHex(h, s, l);
  return {
    data: { color: hex, alpha: "", colorType: "HEX" } as ColorData,
    sourceFormat: "raw-hsl",
  };
}

function parseRgbColorLiteral(text: string): { data: ColorData; sourceFormat: SourceFormat } | null {
  const m = text.match(/^(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (!m) return null;
  const r = parseInt(m[2]);
  const g = parseInt(m[3]);
  const b = parseInt(m[4]);
  if (r > 255 || g > 255 || b > 255) return null;
  const hasAlpha = m[5] !== undefined;
  const a = hasAlpha ? parseFloat(m[5]) : 1;
  const hex = "#" + [r, g, b].map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("");
  const alphaHex = hasAlpha && a < 1 ? Math.round(a * 255).toString(16).padStart(2, "0") : "";
  return {
    data: { color: hex, alpha: alphaHex, colorType: "HEX" } as ColorData,
    sourceFormat: hasAlpha ? "rgba" : "rgb",
  };
}

class ColorSwatchWidget extends WidgetType {
  constructor(
    readonly color: ColorData,
    readonly source: string,
    readonly from: number,
    readonly to: number,
    readonly sourceFormat: SourceFormat = "hex"
  ) {
    super();
  }

  eq(other: ColorSwatchWidget): boolean {
    return (
      other.source === this.source &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-css-color-picker-wrapper";
    wrapper.addEventListener("mousedown", (e) => e.stopPropagation());
    wrapper.addEventListener("click", (e) => e.stopPropagation());

    const input = document.createElement("input");
    input.type = "color";
    input.value = this.color.color;
    input.style.backgroundColor = hexToCssColor(
      this.color.color,
      this.color.alpha
    );

    input.addEventListener("focus", () => { colorPickerOpen = true; });
    input.addEventListener("blur", () => {
      colorPickerOpen = false;
      // Force a full decoration rebuild after the picker closes.
      view.dispatch({});
    });

    input.addEventListener("input", () => {
      const newHex = input.value;
      const r = parseInt(newHex.slice(1, 3), 16);
      const g = parseInt(newHex.slice(3, 5), 16);
      const b = parseInt(newHex.slice(5, 7), 16);
      let replacement: string;
      if (this.sourceFormat === "rgb") {
        replacement = `rgb(${r}, ${g}, ${b})`;
      } else if (this.sourceFormat === "rgba") {
        const a = this.color.alpha
          ? (parseInt(this.color.alpha, 16) / 255).toFixed(2)
          : "1";
        replacement = `rgba(${r}, ${g}, ${b}, ${a})`;
      } else if (this.sourceFormat === "hsl") {
        const [h, s, l] = hexToHsl(newHex);
        replacement = `hsl(${h}, ${s}%, ${l}%)`;
      } else if (this.sourceFormat === "hsla") {
        const [h, s, l] = hexToHsl(newHex);
        const a = this.color.alpha
          ? (parseInt(this.color.alpha, 16) / 255).toFixed(2)
          : "1";
        replacement = `hsla(${h}, ${s}%, ${l}%, ${a})`;
      } else if (this.sourceFormat === "raw-hsl") {
        const [h, s, l] = hexToHsl(newHex);
        replacement = `${h} ${s}% ${l}%`;
      } else if (this.color.colorType === "HEX" && this.color.alpha) {
        replacement = `${newHex}${this.color.alpha}`;
      } else {
        replacement = newHex;
      }
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: replacement },
      });
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  type Found = { from: number; to: number; widget: ColorSwatchWidget };
  const found: Found[] = [];
  const seen = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    const text = doc.sliceString(from, to);

    let m: RegExpExecArray | null;
    COLOR_REGEX.lastIndex = 0;
    while ((m = COLOR_REGEX.exec(text)) !== null) {
      const absFrom = from + m.index;
      if (seen.has(absFrom)) continue;
      const absTo = absFrom + m[0].length;
      const hexData = parseColorLiteral(m[0]);
      if (hexData) {
        seen.add(absFrom);
        found.push({ from: absFrom, to: absTo, widget: new ColorSwatchWidget(hexData, m[0], absFrom, absTo, "hex") });
        continue;
      }
      const rgbParsed = parseRgbColorLiteral(m[0]);
      if (rgbParsed) {
        seen.add(absFrom);
        found.push({ from: absFrom, to: absTo, widget: new ColorSwatchWidget(rgbParsed.data, m[0], absFrom, absTo, rgbParsed.sourceFormat) });
        continue;
      }
      const hslParsed = parseHslColorLiteral(m[0]);
      if (!hslParsed) continue;
      seen.add(absFrom);
      found.push({ from: absFrom, to: absTo, widget: new ColorSwatchWidget(hslParsed.data, m[0], absFrom, absTo, hslParsed.sourceFormat) });
    }

    NAMED_COLOR_REGEX.lastIndex = 0;
    while ((m = NAMED_COLOR_REGEX.exec(text)) !== null) {
      const data = parseNamedColor(m[0]);
      if (!data) continue;
      const absFrom = from + m.index;
      if (seen.has(absFrom)) continue;
      seen.add(absFrom);
      const absTo = absFrom + m[0].length;
      found.push({
        from: absFrom,
        to: absTo,
        widget: new ColorSwatchWidget(data, m[0], absFrom, absTo),
      });
    }

    RAW_HSL_REGEX.lastIndex = 0;
    while ((m = RAW_HSL_REGEX.exec(text)) !== null) {
      const absFrom = from + m.index;
      if (seen.has(absFrom)) continue;
      const h = parseFloat(m[1]);
      const s = parseFloat(m[2]);
      const l = parseFloat(m[3]);
      const rawParsed = parseRawHslToken(h, s, l);
      if (!rawParsed) continue;
      seen.add(absFrom);
      const absTo = absFrom + m[0].length;
      found.push({
        from: absFrom,
        to: absTo,
        widget: new ColorSwatchWidget(rawParsed.data, m[0], absFrom, absTo, "raw-hsl"),
      });
    }
  }

  found.sort((a, b) => a.from - b.from);
  for (const f of found) {
    builder.add(
      f.from,
      f.from,
      Decoration.widget({ widget: f.widget, side: 1 })
    );
  }
  return builder.finish();
}

// Shared flag: skip rebuilding decorations while any native color picker is open.
let colorPickerOpen = false;

const colorPickerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (colorPickerOpen) {
        // Map positions through any doc changes so widgets stay anchored,
        // but don't rebuild (that would destroy the open picker's DOM node).
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);
        }
        return;
      }
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

const universalColorPicker = [colorPickerPlugin, colorPickerTheme];

// Dynamic editor theme using CSS variables — responds to theme changes automatically.
const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "hsl(var(--editor-bg))",
    color: "hsl(var(--foreground))",
  },
  ".cm-content": {
    caretColor: "hsl(var(--primary))",
    fontFamily: "var(--editor-font-family, inherit)",
    fontSize: "var(--editor-font-size, 13px)",
    lineHeight: "var(--editor-line-height, 1.6)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "hsl(var(--primary))",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(var(--editor-bg))",
    color: "hsl(var(--muted-foreground))",
    borderRight: "1px solid hsl(var(--border))",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--editor-line))",
    color: "hsl(229 20% 64%)",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--editor-line))",
  },
  ".cm-selectionMatch": {
    backgroundColor: "hsl(var(--primary) / 0.2)",
    outline: "1px solid hsl(var(--primary) / 0.4)",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "hsl(var(--primary) / 0.15)",
    outline: "1px solid hsl(var(--primary) / 0.5)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "hsl(var(--muted))",
    border: "none",
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-tooltip": {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "hsl(var(--accent))",
    color: "hsl(var(--foreground))",
  },
  ".cm-completionMatchedText": {
    color: "hsl(var(--primary))",
    textDecoration: "none",
    fontWeight: "bold",
  },
  ".cm-panel.cm-search": {
    display: "none",
  },
  ".cm-searchMatch": {
    backgroundColor: "hsl(var(--primary) / 0.25)",
    outline: "1px solid hsl(var(--primary) / 0.5)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "hsl(var(--primary) / 0.5)",
  },
}, { dark: true });

// Syntax highlighting using CSS variables — colors update when theme changes.
const editorHighlight = HighlightStyle.define([
  // Keywords base → purple
  { tag: tags.keyword, color: "hsl(var(--syntax-purple))" },
  // control flow (if, return, for, try, catch) and operator keywords (new, typeof) → purple italic
  { tag: [tags.controlKeyword, tags.operatorKeyword], color: "hsl(var(--syntax-purple))", fontStyle: "italic" },
  // definition keywords (const, let, var, function, class) and module keywords (import, export) → blue
  { tag: [tags.definitionKeyword, tags.moduleKeyword], color: "hsl(var(--syntax-blue))", fontStyle: "normal" },
  // identifiers
  { tag: [tags.name, tags.standard(tags.name)], color: "hsl(var(--foreground))" },
  { tag: [tags.definition(tags.name), tags.separator], color: "hsl(var(--foreground))" },
  // properties and attributes
  { tag: tags.propertyName, color: "hsl(var(--syntax-yellow))" },
  { tag: tags.attributeName, color: "hsl(var(--syntax-purple))" },
  // functions
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "hsl(var(--syntax-blue))" },
  // types and classes
  { tag: [tags.typeName, tags.className, tags.namespace, tags.changed, tags.annotation, tags.modifier, tags.self], color: "hsl(var(--syntax-cyan))" },
  // numbers, booleans, null
  { tag: [tags.number, tags.bool, tags.atom, tags.special(tags.variableName)], color: "hsl(var(--syntax-orange))" },
  { tag: [tags.color, tags.constant(tags.name)], color: "hsl(var(--syntax-orange))" },
  // strings
  { tag: [tags.string, tags.deleted], color: "hsl(var(--syntax-green))" },
  // regex and escapes
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: "hsl(var(--syntax-cyan))" },
  // operators (symbols only, not operator keywords)
  { tag: tags.operator, color: "hsl(var(--syntax-cyan))" },
  { tag: [tags.url, tags.link], color: "hsl(var(--syntax-cyan))", textDecoration: "underline" },
  // comments
  { tag: [tags.meta, tags.comment], color: "hsl(var(--syntax-comment))", fontStyle: "italic" },
  // HTML/JSX tags and attributes
  { tag: tags.tagName, color: "hsl(var(--syntax-red))" },
  { tag: tags.attributeValue, color: "hsl(var(--syntax-green))" },
  { tag: tags.processingInstruction, color: "hsl(var(--syntax-green))" },
  // markdown
  { tag: tags.heading, color: "hsl(var(--primary))", fontWeight: "bold" },
  { tag: tags.strong, color: "hsl(var(--syntax-orange))", fontWeight: "bold" },
  { tag: tags.emphasis, color: "hsl(var(--syntax-yellow))", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.invalid, color: "hsl(var(--destructive))", textDecoration: "underline wavy" },
]);

const themeExtensions = [editorTheme, syntaxHighlighting(editorHighlight)];

const extByLang: Record<string, () => Extension[]> = {
  html: () => [html(), ...universalColorPicker],
  css: () => [css(), ...universalColorPicker],
  javascript: () => [javascript({ jsx: true, typescript: true }), ...universalColorPicker],
  json: () => [json()],
  markdown: () => [markdown(), ...universalColorPicker],
  python: () => [python()],
  svg: () => [html(), ...universalColorPicker],
  xml: () => [xml()],
  yaml: () => [StreamLanguage.define(yaml)],
  csv: () => [],
  image: () => [],
  video: () => [],
  pdf: () => [],
};

export function AtomEditor({ value, language, onChange, editorRef, onSearchOpen, onScrollY, onSelectionChange }: Props) {
  const onSearchOpenRef = useRef(onSearchOpen);
  onSearchOpenRef.current = onSearchOpen;
  const onScrollYRef = useRef(onScrollY);
  onScrollYRef.current = onScrollY;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);

  const handleUpdate = useCallback((update: ViewUpdate) => {
    viewRef.current = update.view;
    if (!update.selectionSet && !update.docChanged) return;
    const sel = update.state.selection.main;
    if (sel.empty) {
      setToolbar(null);
      onSelectionChangeRef.current?.(null);
      return;
    }
    const text = update.state.doc.sliceString(sel.from, sel.to);
    if (!text.trim()) {
      setToolbar(null);
      onSelectionChangeRef.current?.(null);
      return;
    }
    const fromLine = update.state.doc.lineAt(sel.from).number;
    const toLine = update.state.doc.lineAt(sel.to).number;
    onSelectionChangeRef.current?.({ from: fromLine, to: toLine });
    requestAnimationFrame(() => {
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const rect = domSel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top, yBottom: rect.bottom, text, from: sel.from, to: sel.to });
    });
  }, []);

  const applyReplacement = useCallback((newText: string) => {
    const view = viewRef.current;
    if (!view || !toolbar) return;
    view.dispatch({
      changes: { from: toolbar.from, to: toolbar.to, insert: newText },
      selection: { anchor: toolbar.from, head: toolbar.from + newText.length },
    });
    setToolbar(null);
  }, [toolbar]);

  const handleUppercase = useCallback(() => {
    if (!toolbar) return;
    applyReplacement(toolbar.text.toUpperCase());
  }, [toolbar, applyReplacement]);

  const handleLowercase = useCallback(() => {
    if (!toolbar) return;
    applyReplacement(toolbar.text.toLowerCase());
  }, [toolbar, applyReplacement]);

  const handleTranslate = useCallback(async () => {
    if (!toolbar) return;
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(toolbar.text)}&langpair=en|pt-br`
    );
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? toolbar.text;
    applyReplacement(translated);
  }, [toolbar, applyReplacement]);

  const handleBulletList = useCallback(() => {
    if (!toolbar) return;
    const result = toolbar.text
      .split("\n")
      .map((line) => `⁕ ${line}`)
      .join("\n");
    applyReplacement(result);
  }, [toolbar, applyReplacement]);

  const handleNumberedList = useCallback(() => {
    if (!toolbar) return;
    const result = toolbar.text
      .split("\n")
      .map((line, i) => `${i + 1}. ${line}`)
      .join("\n");
    applyReplacement(result);
  }, [toolbar, applyReplacement]);

  const handleChecklist = useCallback(() => {
    if (!toolbar) return;
    const result = toolbar.text
      .split("\n")
      .map((line) => `✓ ${line}`)
      .join("\n");
    applyReplacement(result);
  }, [toolbar, applyReplacement]);

  const searchInterceptKeymap = useMemo(
    () => Prec.highest(keymap.of([
      { key: "Mod-f", run: () => { onSearchOpenRef.current?.(); return true; } },
      { key: "Mod-h", run: () => { onSearchOpenRef.current?.(); return true; } },
    ])),
    [],
  );

  return (
    <div ref={containerRef} className="h-full overflow-hidden bg-background">
      <SelectionToolbar
        toolbar={toolbar}
        containerEl={containerRef.current}
        onUppercase={handleUppercase}
        onLowercase={handleLowercase}
        onTranslate={handleTranslate}
        onBulletList={handleBulletList}
        onNumberedList={handleNumberedList}
        onChecklist={handleChecklist}
        onClose={() => setToolbar(null)}
      />
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        theme={editorTheme}
        extensions={[
          ...extByLang[language](),
          ...themeExtensions,
          EditorView.lineWrapping,
          highlightSelectionMatches(),
          search({ top: false }),
          searchInterceptKeymap,
          EditorView.domEventHandlers({
            paste(event, view) {
              const text = event.clipboardData?.getData("text/plain");
              if (!text) return false;
              const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
              view.dispatch(view.state.replaceSelection(normalized));
              event.preventDefault();
              return true;
            },
          }),
        ]}
        onChange={onChange}
        onUpdate={handleUpdate}
        onCreateEditor={(view) => {
          view.scrollDOM.addEventListener('scroll', () => { onScrollYRef.current?.(); }, { passive: true });
        }}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          drawSelection: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
