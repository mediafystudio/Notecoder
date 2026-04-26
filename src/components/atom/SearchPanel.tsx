import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  openSearchPanel,
  replaceAll,
  replaceNext,
  setSearchQuery,
} from "@codemirror/search";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  view: EditorView | null | undefined;
  onClose: () => void;
}

export function SearchPanel({ view, onClose }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [replaceVal, setReplaceVal] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Activate CodeMirror's internal search state (enables match highlighting).
  // The native panel is hidden via CSS; we only need the state machinery.
  useEffect(() => {
    if (!view) return;
    openSearchPanel(view);
    return () => { closeSearchPanel(view); };
  }, [view]);

  useEffect(() => {
    const id = setTimeout(() => searchInputRef.current?.focus(), 10);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!view) return;
    try {
      view.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({ search: searchVal, caseSensitive, regexp, wholeWord, replace: replaceVal }),
        ),
      });
    } catch {
      // invalid regex — ignore
    }
  }, [view, searchVal, replaceVal, caseSensitive, regexp, wholeWord]);

  const exec = useCallback(
    (cmd: (v: EditorView) => boolean) => {
      if (view) { cmd(view); view.focus(); }
    },
    [view],
  );

  const close = useCallback(() => {
    onClose();
    view?.focus();
  }, [onClose, view]);

  const iconBtn = (active = false) =>
    cn(
      "flex items-center justify-center w-7 h-7 rounded transition-colors",
      active
        ? "bg-[hsl(var(--accent))] text-foreground"
        : "text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground",
    );

  const actionBtn = useMemo(
    () =>
      "h-7 px-3 rounded border border-border bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-foreground text-sm font-medium transition-colors whitespace-nowrap",
    [],
  );

  const inputCls =
    "h-8 bg-[hsl(var(--input))] border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors";

  return (
    <div
      className="absolute top-0 right-0 z-20 bg-[hsl(var(--card))] border-b border-l border-border shadow-lg"
      style={{ minWidth: 420 }}
    >
      {/* Row 1 — Localizar */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          className={iconBtn()}
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Ocultar substituição" : "Mostrar substituição"}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Localizar"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              else if (e.key === "Enter") exec(e.shiftKey ? findPrevious : findNext);
            }}
            className={cn(inputCls, "w-full pr-8")}
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        <button className={iconBtn()} onClick={() => exec(findPrevious)} title="Anterior (Shift+Enter)">
          <ArrowUp className="w-4 h-4" />
        </button>
        <button className={iconBtn()} onClick={() => exec(findNext)} title="Próximo (Enter)">
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          className={iconBtn(showOptions)}
          onClick={() => setShowOptions((v) => !v)}
          title="Opções de pesquisa"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
        <button className={iconBtn()} onClick={close} title="Fechar (Esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Options row */}
      {showOptions && (
        <div className="flex items-center gap-4 px-10 pb-1.5 text-xs text-muted-foreground">
          {(
            [
              ["Aa", "Maiúsculas", caseSensitive, setCaseSensitive],
              ["\\b", "Palavra inteira", wholeWord, setWholeWord],
              [".*", "Regex", regexp, setRegexp],
            ] as const
          ).map(([label, title, checked, setter]) => (
            <label key={String(label)} className="flex items-center gap-1.5 cursor-pointer select-none" title={title as string}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              <span className="font-mono">{label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Row 2 — Substituir */}
      {expanded && (
        <div className="flex items-center gap-2 px-2 pb-2" style={{ paddingLeft: "calc(0.5rem + 1.75rem + 0.25rem)" }}>
          <input
            value={replaceVal}
            onChange={(e) => setReplaceVal(e.target.value)}
            placeholder="Substituir"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              else if (e.key === "Enter") exec(replaceNext);
            }}
            className={cn(inputCls, "flex-1")}
          />
          <button className={actionBtn} onClick={() => exec(replaceNext)}>
            Substituir
          </button>
          <button className={actionBtn} onClick={() => exec(replaceAll)}>
            Substituir tudo
          </button>
        </div>
      )}
    </div>
  );
}
