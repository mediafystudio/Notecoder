import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, List, ListOrdered, ListChecks } from "lucide-react";

interface ToolbarState {
  x: number;
  y: number;
  yBottom: number;
  text: string;
  from: number;
  to: number;
}

interface Props {
  toolbar: ToolbarState | null;
  containerEl?: HTMLElement | null;
  onUppercase: () => void;
  onLowercase: () => void;
  onTranslate: () => Promise<void>;
  onBulletList: () => void;
  onNumberedList: () => void;
  onChecklist: () => void;
  onClose: () => void;
}

const Divider = () => <div className="w-px h-4 bg-border shrink-0" />;

export function SelectionToolbar({ toolbar, containerEl, onUppercase, onLowercase, onTranslate, onBulletList, onNumberedList, onChecklist, onClose }: Props) {
  const [translating, setTranslating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; visible: boolean }>({ left: 0, top: 0, visible: false });

  useEffect(() => {
    if (!toolbar) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolbar, onClose]);

  useLayoutEffect(() => {
    if (!toolbar || !ref.current) { setPos((p) => ({ ...p, visible: false })); return; }

    const TOOLBAR_H = 32;
    const GAP = 6;
    const tRect = ref.current.getBoundingClientRect();
    const cRect = containerEl?.getBoundingClientRect();

    let left = toolbar.x - tRect.width / 2;

    // Try above the selection first; flip below if it would overlap the text
    const topAbove = toolbar.y - tRect.height - GAP;
    const minTop = cRect ? cRect.top + 4 : 4;
    let top: number;
    if (topAbove >= minTop) {
      top = topAbove;
    } else {
      // Flip below — toolbar sits under the last line of the selection
      top = toolbar.yBottom + GAP;
      if (cRect) top = Math.min(top, cRect.bottom - tRect.height - 4);
    }

    if (cRect) {
      left = Math.max(cRect.left, Math.min(cRect.right - tRect.width, left));
    }

    setPos({ left, top, visible: true });
  }, [toolbar, containerEl]);

  if (!toolbar) return null;

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      await onTranslate();
    } finally {
      setTranslating(false);
    }
  };

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
        visibility: pos.visible ? "visible" : "hidden",
      }}
      className="flex items-center gap-px bg-[hsl(var(--card))] border border-border rounded-md shadow-lg overflow-hidden text-xs select-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onClick={onUppercase}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground font-medium"
        title="Maiúsculo"
      >
        AA
      </button>
      <Divider />
      <button
        onClick={onLowercase}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground"
        title="Minúsculo"
      >
        aa
      </button>
      <Divider />
      <button
        onClick={handleTranslate}
        disabled={translating}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground disabled:opacity-50 flex items-center gap-1"
        title="Traduzir EN → PT-BR"
      >
        {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : "PT-BR"}
      </button>
      <Divider />
      <button
        onClick={onBulletList}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground flex items-center"
        title="Lista pontilhada"
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <Divider />
      <button
        onClick={onNumberedList}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground flex items-center"
        title="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <Divider />
      <button
        onClick={onChecklist}
        className="px-2.5 h-8 hover:bg-[hsl(var(--muted))] transition-colors text-foreground flex items-center"
        title="Checklist"
      >
        <ListChecks className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body
  );
}

export type { ToolbarState };
