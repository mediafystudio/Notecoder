'use client'

import { useState, useMemo, useEffect } from "react";
import { File, PlusCircle, FolderOpen, Folder, X, FileCode, FileText, FileImage, Film, BookOpen, PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/detectLanguage";

export interface FileItem {
  id: string;
  name: string;
  language: Language;
  content: string;
  path?: string; // full relative path, e.g. "myapp/src/App.tsx"
}

type FileNode = { type: 'file'; file: FileItem };
type DirNode  = { type: 'dir';  name: string; path: string; children: TreeNode[] };
type TreeNode = FileNode | DirNode;

function buildTree(files: FileItem[]): TreeNode[] {
  const root: DirNode = { type: 'dir', name: '', path: '', children: [] };

  for (const file of files) {
    const parts = (file.path ?? file.name).split('/');
    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const dirPath = parts.slice(0, i + 1).join('/');
      let dir = node.children.find((c): c is DirNode => c.type === 'dir' && c.name === part);
      if (!dir) {
        dir = { type: 'dir', name: part, path: dirPath, children: [] };
        node.children.push(dir);
      }
      node = dir;
    }

    node.children.push({ type: 'file', file });
  }

  return root.children;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    const na = a.type === 'dir' ? a.name : a.file.name;
    const nb = b.type === 'dir' ? b.name : b.file.name;
    return na.localeCompare(nb, undefined, { sensitivity: 'base' });
  });
}


const langIconColor: Record<Language, string> = {
  html:       "text-[hsl(var(--destructive))]",
  css:        "text-[hsl(var(--primary))]",
  javascript: "text-[hsl(var(--syntax-yellow))]",
  json:       "text-[hsl(var(--syntax-green))]",
  markdown:   "text-[hsl(var(--muted-foreground))]",
  python:     "text-[hsl(var(--syntax-cyan))]",
  svg:        "text-[hsl(var(--primary))]",
  csv:        "text-[hsl(var(--syntax-green))]",
  yaml:       "text-[hsl(var(--syntax-cyan))]",
  xml:        "text-[hsl(var(--destructive))]",
  image:      "text-[hsl(var(--syntax-orange))]",
  video:      "text-[hsl(var(--syntax-purple,var(--primary)))]",
  pdf:        "text-[hsl(var(--destructive))]",
};

function getIcon(language: Language) {
  switch (language) {
    case 'html':
    case 'css':
    case 'javascript':
    case 'json':
    case 'python':
    case 'csv':
    case 'yaml':
    case 'xml':
      return <FileCode className="h-full w-full" />;
    case 'markdown':
      return <FileText className="h-full w-full" />;
    case 'image':
      return <FileImage className="h-full w-full" />;
    case 'video':
      return <Film className="h-full w-full" />;
    case 'pdf':
      return <BookOpen className="h-full w-full" />;
    default:
      return <File className="h-full w-full" />;
  }
}

function TreeView({
  nodes,
  activeId,
  onSelect,
  onDelete,
  expanded,
  onToggle,
  totalFiles,
  depth = 0,
}: {
  nodes: TreeNode[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  totalFiles: number;
  depth?: number;
}) {
  const indent = depth * 12;

  return (
    <ul>
      {sortNodes(nodes).map((node) => {
        if (node.type === 'dir') {
          const isOpen = expanded.has(node.path);
          return (
            <li key={node.path}>
              <button
                onClick={() => onToggle(node.path)}
                style={{ paddingLeft: `${8 + indent}px` }}
                className="flex items-center gap-1 w-full pr-2 py-1 text-xs text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground transition-colors text-left select-none"
              >
                {isOpen
                  ? <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                  : <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
                {isOpen
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))] opacity-80" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                <span className="truncate">{node.name}</span>
              </button>
              {isOpen && (
                <TreeView
                  nodes={node.children}
                  activeId={activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  expanded={expanded}
                  onToggle={onToggle}
                  totalFiles={totalFiles}
                  depth={depth + 1}
                />
              )}
            </li>
          );
        }

        const { file } = node;
        const isActive = file.id === activeId;
        return (
          <li
            key={file.id}
            className={cn(
              "flex items-center group hover:bg-[hsl(var(--muted))] transition-colors",
              isActive && "bg-[hsl(var(--accent))] text-foreground"
            )}
          >
            <button
              onClick={() => onSelect(file.id)}
              style={{ paddingLeft: `${8 + indent + 16}px` }}
              className="flex-1 min-w-0 pr-1 py-1.5 text-left flex items-center gap-2"
            >
              <div className={cn("h-3.5 w-3.5 shrink-0", langIconColor[file.language])}>
                {getIcon(file.language)}
              </div>
              <span className={cn("flex-1 truncate text-xs", isActive && "font-bold")}>{file.name}</span>
            </button>
            {totalFiles > 1 && (
              <button
                onClick={() => onDelete(file.id)}
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-[hsl(var(--destructive))] rounded p-0.5 shrink-0 mr-2"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  files: FileItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export function AtomSidebar({ files, activeId, onSelect, onCreate, onDelete, onCollapse, onExpand }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-expand newly added top-level dirs
  useEffect(() => {
    const topDirPaths = tree.filter((n): n is DirNode => n.type === 'dir').map((n) => n.path);
    if (topDirPaths.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const p of topDirPaths) {
        if (!next.has(p)) { next.add(p); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [tree]);

  const toggleDir = (path: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(path) ? s.delete(path) : s.add(path);
      return s;
    });

  if (collapsed) {
    return (
      <aside className="h-full w-full bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col items-center pt-2 gap-2">
        <button
          onClick={() => { setCollapsed(false); onExpand?.(); }}
          title="Expandir painel"
          className="bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-colors rounded p-0.5"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-full bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col">
      <div className="px-3 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Notas</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreate}
            title="Novo arquivo"
            className="bg-muted/30 text-accent-foreground hover:text-primary hover:bg-primary/15 transition-colors rounded p-0.5"
          >
            <PlusCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setCollapsed(true); onCollapse?.(); }}
            title="Recolher painel"
            className="bg-muted/30 text-accent-foreground hover:text-primary hover:bg-primary/15 transition-colors rounded p-0.5"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        <TreeView
          nodes={tree}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          expanded={expanded}
          onToggle={toggleDir}
          totalFiles={files.length}
        />
      </nav>
    </aside>
  );
}
