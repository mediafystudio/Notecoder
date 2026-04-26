import React from "react";
import { Minus, Plus, RotateCcw, FileText, Columns2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/detectLanguage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PreviewBg = "theme" | "light" | "dark";

export type ViewMode = 'editor' | 'split' | 'preview';

interface Props {
  language: Language;
  auto: boolean;
  onAutoChange: (v: boolean) => void;
  onLanguageChange: (lang: Language) => void;
  showAutoDetect?: boolean;
  showPreview: boolean;
  previewBg: PreviewBg;
  onPreviewBgChange: (v: PreviewBg) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isMedia?: boolean;
}

const LANGS: { value: Language; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "svg", label: "SVG" },
  { value: "csv", label: "CSV" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
];

const BG_OPTIONS: { value: PreviewBg; label: string }[] = [
  { value: "theme", label: "Tema" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const VIEW_MODES: { mode: ViewMode; Icon: React.ElementType; label: string }[] = [
  { mode: 'editor',  Icon: FileText, label: 'Editor' },
  { mode: 'split',   Icon: Columns2, label: 'Dividir' },
  { mode: 'preview', Icon: Eye,      label: 'Preview' },
];

export function LanguageBar({ language, auto, onAutoChange, onLanguageChange, showAutoDetect = true, showPreview, previewBg, onPreviewBgChange, zoom, onZoomIn, onZoomOut, onZoomReset, viewMode, onViewModeChange, isMedia = false }: Props) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-[hsl(var(--card))] border-b border-border text-xs">
      {/* Left: view-mode buttons */}
      {!isMedia && (
        <div className="flex items-center gap-1">
          {VIEW_MODES.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "flex items-center gap-1.5 px-2 h-6 text-xs rounded border transition-colors font-medium",
                viewMode === mode
                  ? "border-primary text-input bg-primary/90 font-semibold"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-primary/15 font-medium"
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium 
       text-muted-foreground 
       hover:text-primary 
       has-[:checked]:text-primary 
       transition-colors">
      <input
       type="checkbox"
       checked={auto}
       onChange={(e) => onAutoChange(e.target.checked)}
       className="accent-[hsl(var(--primary))]"
      />
      <span>Auto-detect</span>
      </label>

      <div className="flex items-center gap-1 text-accent-foreground hover:text-primary transition-colors font-medium">
        <Select
          value={language}
          disabled={auto}
          onValueChange={onLanguageChange}
        >
          <SelectTrigger
            className={cn(
              "h-6 min-w-[110px] text-xs bg-input border-border rounded px-2 py-0.5 gap-1.5 focus:ring-0 focus:outline-none",
              auto && "opacity-60 cursor-not-allowed"
            )}
          >
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {LANGS.map((l) => (
              <SelectItem key={l.value} value={l.value} className="text-xs cursor-pointer">
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showPreview && (
        <div className="flex items-center gap-1 text-accent-foreground hover:text-primary transition-colors font-medium">
          <Select
            value={previewBg}
            onValueChange={(v) => onPreviewBgChange(v as PreviewBg)}
          >
            <SelectTrigger
              className="h-6 min-w-[80px] text-xs bg-input border-border rounded px-2 py-0.5 gap-1.5 focus:ring-0 focus:outline-none"
            >
              <SelectValue placeholder="Fundo" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {BG_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs cursor-pointer">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zoom controls */}
      <div className="flex items-center border border-border rounded overflow-hidden">
        <button
          onClick={onZoomOut}
          title="Diminuir zoom"
          className="flex items-center justify-center w-6 h-6 bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={onZoomReset}
          title="Restaurar zoom"
          className={cn(
            "flex items-center justify-center gap-1 px-1.5 h-6 tabular-nums transition-colors bg-muted/30 hover:bg-primary/15 font-medium",
            zoom !== 100 ? "text-primary" : "text-muted-foreground"
          )}
        >
          {zoom === 100 ? <RotateCcw className="w-3 h-3" /> : `${zoom}%`}
        </button>
        <button
          onClick={onZoomIn}
          title="Aumentar zoom"
          className="flex items-center justify-center w-6 h-6 bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
