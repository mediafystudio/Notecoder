import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileItem } from "./Sidebar";

interface Props {
  files: FileItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onCreate: () => void;
}

export function AtomTabs({ files, activeId, onSelect, onClose, onRename, onCreate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleDoubleClick = (file: FileItem) => {
    setEditingId(file.id);
    setEditValue(file.name);
  };

  const handleRenameSubmit = (fileId: string) => {
    if (editValue.trim() && editValue !== files.find(f => f.id === fileId)?.name) {
      onRename(fileId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === "Enter") {
      handleRenameSubmit(fileId);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  return (
    <div className="flex bg-[hsl(var(--tab-bar))] border-b border-border overflow-x-auto">
      {files.map((f) => {
        const active = f.id === activeId;
        const isEditing = editingId === f.id;
        
        return (
          <div
            key={f.id}
            onClick={() => !isEditing && onSelect(f.id)}
            onDoubleClick={() => handleDoubleClick(f)}
            className={cn(
              "group flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs cursor-pointer border-r border-border whitespace-nowrap",
              active
                ? "bg-[hsl(var(--tab-active))] text-foreground border-t-2 border-t-[hsl(var(--primary))] -mt-px"
                : "bg-[hsl(var(--tab-inactive))] text-muted-foreground hover:text-foreground"
            )}
          >
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleRenameSubmit(f.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, f.id)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border border-border rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                autoFocus
              />
            ) : (
              <span className={active ? "font-bold" : ""}>{f.name}</span>
            )}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(f.id);
                }}
                className="opacity-50 group-hover:opacity-100 hover:bg-[hsl(var(--muted))] rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onCreate}
        className="flex items-center justify-center w-8 h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--tab-inactive))] border-r border-border transition-colors"
        title="Nova Aba"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
