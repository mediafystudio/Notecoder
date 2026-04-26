import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save as tauriSave } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { AtomSidebar, type FileItem } from "@/components/atom/Sidebar";
import { AtomTabs } from "@/components/atom/Tabs";
import { AtomEditor } from "@/components/atom/Editor";
import { AtomPreview } from "@/components/atom/Preview";
import { LanguageBar, type PreviewBg } from "@/components/atom/LanguageBar";
import { SearchPanel } from "@/components/atom/SearchPanel";
import { ThemeSettings } from "@/components/ThemeSettings";
import { useTheme } from "@/hooks/useTheme";
import { SplashScreen } from "@/components/atom/SplashScreen";
import { useBackupFolder } from "@/hooks/useBackupFolder";
import { useSyncScroll } from "@/hooks/useSyncScroll";
import { Download, Upload, Palette, FolderOpen, Check, Loader2, AlertCircle, FileText, Share2, ChevronDown, Folder, X, Minus, Square, Copy } from "lucide-react";
import { List, Type } from "lucide-react";

function GitHubIcon({ className }: { className?: string; }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.05.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GitHubImportModal } from "@/components/atom/GitHubImportModal";
import { detectByContent, detectByFilename, type Language } from "@/lib/detectLanguage";
import type { ThemeCustomization } from "@/components/ThemeSettings";
import { toast } from "sonner";

function isLightTheme(theme: { background: string }) {
  const match = theme.background.match(/(\d+)%\s*$/);
  if (!match) return false;
  return Number(match[1]) > 50;
}

const INITIAL_CONTENT = `---
App: Notecoder® v1.0 - notecoder.com.br
Sobre: Notecoder é um editor de código e markdown com pré-visualização ao vivo, suporte a diagramas, fórmulas matemáticas, múltiplos arquivos e temas totalmente personalizáveis.
Autor: Kárcio Oliveira ● Mediafy Studio
Tags: ["markdown", "preview", "mermaid", "svg", "open-source"]
---

# Bem-vindo ao Notecoder ✦

> **Notecoder** é um editor que transforma escrita e código em algo imediato: você digita e já vê o resultado. Suporta diagramas, fórmulas, múltiplos arquivos e oferece personalização total de temas.

---

## ✦ Visão Geral

\`\`\`mermaid
flowchart LR
  A[📝 Editor] -->|escreve| B[⚡ Auto-detecção]
  B --> C{Tipo de arquivo}
  C -->|Markdown| D[🖼️ Preview GitHub]
  C -->|HTML/CSS/JS| E[🌐 Render direto]
  C -->|Imagem/Vídeo/PDF| F[📂 Visualizador]
  D --> G[📤 Exportar]
  E --> G
  F --> G
\`\`\`

---

## 🗂️ Múltiplos Arquivos & Abas

Gerencie vários arquivos ao mesmo tempo com um sistema completo de abas e painel lateral:

- **Painel lateral** com árvore de diretórios, ícones por tipo e indicador de arquivo ativo
- **Abas** com renomeação por duplo clique — a linguagem é detectada automaticamente ao renomear
- **Criar / Deletar** arquivos diretamente na interface
- **Recolher/expandir** o painel lateral para ganhar espaço na tela

---

## ✍️ Editor Avançado

O editor é construído sobre **CodeMirror** com suporte completo a:

| Linguagem      | Destaque | Auto-detecção |
|----------------|:--------:|:-------------:|
| Markdown        | ✅       | ✅            |
| HTML / SVG      | ✅       | ✅            |
| CSS             | ✅       | ✅            |
| JavaScript      | ✅       | ✅            |
| JSON            | ✅       | ✅            |
| Python          | ✅       | ✅            |
| YAML / XML      | ✅       | ✅            |
| CSV             | ✅       | ✅            |

### Ferramentas do Editor

- 🔍 **Busca e substituição** — <kbd>Ctrl</kbd> + <kbd>F</kbd> — com suporte a regex, maiúsculas/minúsculas e palavra inteira
- 🎨 **Color picker inline** — abre ao clicar em qualquer cor hex, rgb(a) ou hsl(a) no código
- 🔠 **Barra de seleção** — formatar texto selecionado: maiúsculas, minúsculas, lista, etc.
- 🔎 **Zoom** — de 50% a 200%, com reset rápido — aplicado ao editor e ao preview
- 📊 **Contadores** — linhas e caracteres em tempo real na barra de status

---

## 👁️ Modos de Visualização

Alterne entre três layouts com um clique na barra de linguagem:

\`\`\`
[ Editor ] ←→ [ Split 50/50 ] ←→ [ Preview ]
\`\`\`

No modo **Split**, a rolagem é sincronizada bidirecionalmente — role o editor e o preview acompanha, e vice-versa.

### Fundo do Preview

Escolha o fundo do painel de preview por arquivo:
- **Tema** — segue as cores do tema ativo
- **Claro** — fundo branco para revisar documentos
- **Escuro** — fundo preto para conteúdo com contraste

---

## 📊 Diagramas Mermaid

Crie visualizações diretamente no Markdown com blocos \`\`\`mermaid:

\`\`\`mermaid
sequenceDiagram
  participant U as Usuário
  participant E as Editor
  participant P as Preview
  U->>E: Digita markdown
  E->>P: Renderiza em tempo real
  U->>E: Edita diagrama Mermaid
  E->>P: Atualiza diagrama
  U->>P: Clica em expandir
  P->>U: Abre modal com zoom/pan
\`\`\`

Cada diagrama renderizado inclui uma **barra de ações**:
- 🔍 Expandir em modal com zoom e pan
- 📋 Copiar como imagem PNG
- ⬇️ Baixar como PNG ou SVG

---

## 🧮 Fórmulas Matemáticas (LaTeX)

Escreva equações com sintaxe **KaTeX**:

Inline: $E = mc^2$ ou $\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$

Em bloco:

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

---

## 💻 Realce de Sintaxe em Blocos de Código

\`\`\`javascript
// Detecção automática de linguagem por conteúdo
function detectByContent(content) {
  if (content.trimStart().startsWith('{')) return 'json';
  if (/<[a-z][\\s\\S]*>/i.test(content))    return 'html';
  if (/^def |^import |^class /m.test(content)) return 'python';
  return 'markdown';
}
\`\`\`

\`\`\`python
# Python também é suportado
def fibonacci(n: int) -> list[int]:
    a, b = 0, 1
    return [a := a + b for _ in range(n)]
\`\`\`

\`\`\`css
/* CSS com color picker inline */
:root {
  --primary: hsl(220 90% 60%);
  --background: hsl(220 15% 10%);
}
\`\`\`

---

## 📤 Importar & Exportar

### Importar
- 📄 **Arquivo único** — qualquer formato de texto ou binário
- 📁 **Pasta inteira** — mantém estrutura de diretórios
- 🗜️ **ZIP** — descompacta e importa com estrutura preservada
- 🐙 **GitHub** — importe repositórios inteiros ou arquivos selecionados diretamente de uma URL

### Exportar
- Arquivo atual como: **.txt · .md · .html · .css · .json · .js · .svg**
- Todos os arquivos como **.zip** (preserva estrutura de pastas)

---

## 🎨 Temas & Personalização

Três temas inclusos — **Notecoder Night**, **Notecoder Storm** e **Notecoder Light** — totalmente editáveis:

- 🖌️ **28 cores customizáveis** — background, foreground, bordas, syntax, etc.
- 🔤 **Tamanho de fonte** — Pequeno (11px) · Médio (13px) · Grande (15px)
- 🔠 **Família tipográfica** — JetBrains Mono · Sans-serif · Serif
- 📏 **Altura de linha** — Compacta · Normal · Espaçada
- 🔲 **Raio de borda** — Nenhum · Pequeno · Médio · Grande

---

## 📁 Backup Automático em Pasta Local

> Disponível na versão **desktop (Tauri)**

Vincule uma pasta local e o Notecoder:
- Salva todos os arquivos automaticamente ao editar
- Detecta alterações externas e sincroniza em tempo real
- Indica o status na barra inferior: salvando · salvo · erro

---

## 📋 Formatação Markdown Completa

**negrito** · *itálico* · ***negrito itálico*** · ~~tachado~~ · <u>sublinhado</u> · <mark>destacado</mark>

Teclas: <kbd>Ctrl</kbd> + <kbd>S</kbd> · <kbd>Ctrl</kbd> + <kbd>F</kbd>

> [!NOTE]
> O Notecoder suporta alertas estilo GitHub: NOTE, TIP, IMPORTANT, WARNING e CAUTION.

> [!TIP]
> Renomeie um arquivo na aba para mudar sua linguagem automaticamente.

> [!WARNING]
> Fechar a aba não exclui o arquivo — ele permanece no painel lateral.

### Listas de Tarefas
- [x] Editor multi-arquivo com abas
- [x] Preview Markdown estilo GitHub
- [x] Diagramas Mermaid com zoom/export
- [x] Fórmulas LaTeX via KaTeX
- [x] Importação de GitHub, ZIP e pastas
- [x] Temas 100% customizáveis
- [x] Busca e substituição com regex
- [x] Suporte a imagem, vídeo e PDF
- [x] Backup automático em pasta local

---

<div style="text-align:center; opacity: 0.5; font-size: 0.85rem;">

Feito com 90% de IA e 10% de energético. · **Notecoder v1.0**

</div>
`;

const uid = () => Math.random().toString(36).slice(2, 9);

const createInitialFile = (): FileItem => ({
  id: uid(),
  name: "notecoder.md",
  language: "markdown",
  content: INITIAL_CONTENT,
});

export const Index = () => {
  const { theme, setTheme } = useTheme();

  // Stable ref that always points to the latest refreshFromFolder, avoiding stale closures
  const onExternalChangeRef = useRef<() => void>(() => {});

  const { folder, syncStatus, loadFiles, saveFiles, deleteFile, openFolder, pickFolder, clearFolder, isTauriEnv } = useBackupFolder(
    useCallback(() => onExternalChangeRef.current(), [])
  );

  const [files, setFiles] = useState<FileItem[]>(() => {
    const f = createInitialFile();
    return [f];
  });
  const filesRef = useRef<FileItem[]>(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  // IDs of files currently open as tabs (ordered)
  const [openIds, setOpenIds] = useState<string[]>(() => {
    const f = files[0];
    return [f.id];
  });
  const [activeId, setActiveId] = useState<string>(files[0].id);
  const [autoDetect, setAutoDetect] = useState(true);
  const prevNamesRef = useRef<Record<string, string>>({});
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split');
  const [editorZoom, setEditorZoom] = useState(100);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [importedFolderName, setImportedFolderName] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const importFolderRef = useRef<HTMLInputElement>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const [previewBgMap, setPreviewBgMap] = useState<Record<string, PreviewBg>>({});
  const { editorRef, previewRef, syncFromEditor, syncFromPreview } = useSyncScroll(viewMode === 'split');
  const [selectedLines, setSelectedLines] = useState<{ from: number; to: number } | null>(null);
  useEffect(() => { setSelectedLines(null); }, [activeId, viewMode]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isTauriEnv || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="menu"]')) return;
    getCurrentWindow().startDragging();
  }, [isTauriEnv]);

  useEffect(() => {
    if (!isTauriEnv) return;
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);
    let unlisten: (() => void) | undefined;
    win.onResized(() => { win.isMaximized().then(setIsMaximized); }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [isTauriEnv]);

  const [customization, setCustomization] = useState<ThemeCustomization>({
    fontSize: 'medium',
    fontFamily: 'mono',
    lineHeight: 'normal',
    borderRadius: 'small',
  });

  // Reset to welcome state when folder is cleared (deleted or removed by user)
  const prevFolderRef = useRef(folder);
  useEffect(() => {
    const prev = prevFolderRef.current;
    prevFolderRef.current = folder;
    if (prev !== null && folder === null) {
      const f = createInitialFile();
      setFiles([f]);
      setOpenIds([f.id]);
      setActiveId(f.id);
    }
  }, [folder]);

  // Load files from backup folder on startup / when folder changes
  useEffect(() => {
    if (!folder) return;
    loadFiles().then((loaded) => {
      if (loaded === null) {
        toast.error(`Pasta não encontrada: "${folder.split(/[\\/]/).pop()}". O vínculo foi removido.`);
        clearFolder();
        return;
      }
      if (loaded.length === 0) return;
      const items: FileItem[] = loaded.map((f) => ({
        id: uid(),
        name: f.name,
        language: detectByFilename(f.name) ?? "markdown",
        content: f.content,
      }));
      setFiles(items);
      setOpenIds([]);
      setActiveId("");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  // Blocks auto-save while syncing from disk to avoid re-creating deleted files
  const isRefreshingRef = useRef(false);

  // Merge files from disk with current state — preserves existing IDs (so open tabs stay valid)
  const refreshFromFolder = useCallback(async () => {
    isRefreshingRef.current = true;
    try {
      const loaded = await loadFiles();

      if (loaded === null) {
        toast.error("Pasta removida externamente. O vínculo foi desfeito.");
        clearFolder();
        return;
      }

      const prev = filesRef.current;
      const nextNames = new Set(loaded.map((lf) => lf.name));
      const removedIds = prev.filter((f) => !nextNames.has(f.name)).map((f) => f.id);

      if (loaded.length === 0) {
        const f = createInitialFile();
        setFiles([f]);
        setOpenIds([f.id]);
        setActiveId(f.id);
      } else {
        const byName = new Map(prev.map((f) => [f.name, f]));
        const next = loaded.map((lf) => {
          const existing = byName.get(lf.name);
          if (existing) return { ...existing, content: lf.content };
          return {
            id: uid(),
            name: lf.name,
            language: detectByFilename(lf.name) ?? ("markdown" as const),
            content: lf.content,
          };
        });
        setFiles(next);
        if (removedIds.length > 0) {
          setOpenIds((ids) => ids.filter((id) => !removedIds.includes(id)));
          setActiveId((aid) => (removedIds.includes(aid) ? "" : aid));
        }
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [loadFiles, clearFolder]);

  // Keep the ref always pointing to the latest version
  useEffect(() => {
    onExternalChangeRef.current = refreshFromFolder;
  }, [refreshFromFolder]);

  // Auto-save all files to backup folder whenever files change (skip during refresh)
  useEffect(() => {
    if (!folder || isRefreshingRef.current) return;
    saveFiles(files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, folder]);

  // Delete old filename from disk when a file is renamed
  useEffect(() => {
    const prev = prevNamesRef.current;
    files.forEach((f) => {
      if (prev[f.id] && prev[f.id] !== f.name) {
        deleteFile(prev[f.id]);
      }
      prev[f.id] = f.name;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    const root = document.documentElement;
    const fontSizeMap = { small: '11px', medium: '13px', large: '15px' };
    const fontFamilyMap = {
      mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      serif: 'Georgia, "Times New Roman", serif',
    };
    const lineHeightMap = { tight: '1.4', normal: '1.6', relaxed: '1.9' };
    const borderRadiusMap = { none: '0px', small: '0.25rem', medium: '0.375rem', large: '0.5rem' };
    root.style.setProperty('--editor-font-size', fontSizeMap[customization.fontSize]);
    root.style.setProperty('--editor-font-family', fontFamilyMap[customization.fontFamily]);
    root.style.setProperty('--editor-line-height', lineHeightMap[customization.lineHeight]);
    root.style.setProperty('--radius', borderRadiusMap[customization.borderRadius]);
  }, [customization]);

  const openFiles = useMemo(
    () => openIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as FileItem[],
    [openIds, files]
  );

  const active = files.find((f) => f.id === activeId) ?? null;


  // Auto-detect language on content change (only when editing, not on tab switch)
  const prevActiveIdForDetect = useRef<string>(activeId);
  useEffect(() => {
    const switchedTab = prevActiveIdForDetect.current !== activeId;
    prevActiveIdForDetect.current = activeId;
    if (!autoDetect || !active || !active.content || switchedTab) return;
    if (active.language !== 'markdown') return;
    const detected = detectByContent(active.content);
    if (detected !== active.language) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === active.id
            ? { ...f, language: detected, name: renameForLanguage(f.name, detected) }
            : f
        )
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.content, activeId, autoDetect]);

  const updateActive = (patch: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f) => (f.id === activeId ? { ...f, ...patch } : f)));
  };

  const handleContent = (v: string) => updateActive({ content: v });

  const handleRename = (id: string, name: string) => {
    const detected = detectByFilename(name);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? (detected ? { ...f, name, language: detected } : { ...f, name })
          : f
      )
    );
  };

  // Open a file from sidebar into a tab (or focus if already open)
  const handleSidebarSelect = (id: string) => {
    if (!openIds.includes(id)) {
      setOpenIds((prev) => [...prev, id]);
    }
    setActiveId(id);
  };

  // Close a tab — file stays in sidebar, not deleted from disk
  const handleTabClose = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.filter((oid) => oid !== id);
      if (id === activeId) {
        setActiveId(next.length > 0 ? next[next.length - 1] : "");
      }
      return next;
    });
  };

  // Remove from sidebar — closes from UI only, does not delete from disk
  const handleSidebarDelete = (id: string) => {

    const remaining = files.filter((f) => f.id !== id);

    if (remaining.length === 0 && !folder) {
      const newFile = createInitialFile();
      setFiles([newFile]);
      setOpenIds([newFile.id]);
      setActiveId(newFile.id);
      return;
    }

    if (remaining.length === 0) {
      setFiles([]);
      setOpenIds([]);
      setActiveId("");
      return;
    }

    setFiles(remaining);
    setOpenIds((prev) => {
      const next = prev.filter((oid) => oid !== id);
      if (id === activeId) {
        setActiveId(next.length > 0 ? next[next.length - 1] : "");
      }
      return next;
    });
  };

  const downloadAs = async (content: string, filename: string) => {
    if (isTauriEnv) {
      const path = await tauriSave({ defaultPath: filename });
      if (!path) return;
      await writeTextFile(path, content);
    } else if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({ suggestedName: filename });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err: any) {
        if (err?.name !== 'AbortError') throw err;
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const handleExportAs = (ext: string) => {
    if (!active) return;
    const base = active.name.replace(/\.[^/.]+$/, '');
    downloadAs(active.content, `${base}.${ext}`)
      .then(() => toast.success(`Exportado como ${base}.${ext}`))
      .catch(console.error);
  };

  const addImportedFile = (name: string, content: string) => {
    const detected = detectByFilename(name);
    const newFile: FileItem = { id: uid(), name, language: detected || 'markdown', content };
    setFiles((prev) => [...prev, newFile]);
    setOpenIds((prev) => [...prev, newFile.id]);
    setActiveId(newFile.id);
  };

  const handleImportZip = async (file: File) => {
    const { unzipSync } = await import('fflate');
    const arrayBuffer = await file.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));
    const zipRoot = file.name.replace(/\.zip$/i, '');

    const items: FileItem[] = [];
    for (const [entryPath, data] of Object.entries(unzipped)) {
      if (entryPath.endsWith('/')) continue;
      if (entryPath.includes('__MACOSX') || entryPath.split('/').some((p) => p.startsWith('.'))) continue;

      const fileName = entryPath.split('/').pop() ?? entryPath;
      const detected = detectByFilename(fileName);
      const fullPath = `${zipRoot}/${entryPath}`;
      let content: string;

      if (detected === 'image' || detected === 'video' || detected === 'pdf') {
        const mime = getMimeType(fileName);
        const chunks: string[] = [];
        for (let i = 0; i < data.length; i += 8192) chunks.push(String.fromCharCode(...data.subarray(i, i + 8192)));
        content = `data:${mime};base64,${btoa(chunks.join(''))}`;
      } else {
        content = new TextDecoder('utf-8', { fatal: false }).decode(data);
      }

      items.push({ id: uid(), name: fileName, language: detected ?? 'markdown', content, path: fullPath });
    }

    if (items.length === 0) return;
    setFiles((prev) => [...prev, ...items]);
    setImportedFolderName(zipRoot);
    toast.success(`ZIP importado: ${items.length} arquivo${items.length !== 1 ? 's' : ''}`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.zip')) {
      handleImportZip(file).catch(console.error);
      event.target.value = '';
      return;
    }
    const detected = detectByFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => { addImportedFile(file.name, e.target?.result as string); toast.success(`"${file.name}" importado`); };
    if (detected === 'image' || detected === 'video' || detected === 'pdf') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleExportZip = async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const zipData: Record<string, Uint8Array> = {};

    for (const f of files) {
      const entryPath = (f.path ?? f.name).replace(/\\/g, '/');
      if (f.language === 'image' || f.language === 'video' || f.language === 'pdf') {
        const b64 = f.content.split(',')[1];
        if (!b64) continue;
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        zipData[entryPath] = bytes;
      } else {
        zipData[entryPath] = strToU8(f.content);
      }
    }

    const zipped = zipSync(zipData);
    const defaultName = `${importedFolderName ?? 'notecoder-export'}.zip`;

    if (isTauriEnv) {
      const path = await tauriSave({ defaultPath: defaultName, filters: [{ name: 'ZIP', extensions: ['zip'] }] });
      if (!path) return;
      await writeFile(path, zipped);
      toast.success(`Exportado: ${defaultName}`);
    } else if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(zipped);
        await writable.close();
        toast.success(`Exportado: ${defaultName}`);
      } catch (err: any) {
        if (err?.name !== 'AbortError') throw err;
      }
    } else {
      const blob = new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`Exportado: ${defaultName}`);
    }
  };

  const handleImportFolder = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const folderName = (files[0] as any).webkitRelativePath?.split('/')[0] ?? 'pasta';
    setImportedFolderName(folderName);

    const readers = files.map(async (file): Promise<FileItem[]> => {
      const detected = detectByFilename(file.name);
      const relativePath = (file as any).webkitRelativePath || file.name;

      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const buffer = await file.arrayBuffer();
          const { unzipSync } = await import('fflate');
          const unzipped = unzipSync(new Uint8Array(buffer));
          const zipRoot = relativePath.replace(/\.zip$/i, '');
          const items: FileItem[] = [];
          for (const [entryPath, data] of Object.entries(unzipped)) {
            if (entryPath.endsWith('/')) continue;
            if (entryPath.includes('__MACOSX') || entryPath.split('/').some((p) => p.startsWith('.'))) continue;
            const fileName = entryPath.split('/').pop() ?? entryPath;
            const lang = detectByFilename(fileName);
            const fullPath = `${zipRoot}/${entryPath}`;
            let content: string;
            if (lang === 'image' || lang === 'video' || lang === 'pdf') {
              const mime = getMimeType(fileName);
              const chunks: string[] = [];
              for (let i = 0; i < data.length; i += 8192) chunks.push(String.fromCharCode(...data.subarray(i, i + 8192)));
              content = `data:${mime};base64,${btoa(chunks.join(''))}`;
            } else {
              content = new TextDecoder('utf-8', { fatal: false }).decode(data);
            }
            items.push({ id: uid(), name: fileName, language: lang ?? 'markdown', content, path: fullPath });
          }
          return items;
        } catch {
          return [];
        }
      }

      return new Promise<FileItem[]>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve([{ id: uid(), name: file.name, language: detected || 'markdown', content: e.target?.result as string, path: relativePath }]);
        };
        if (detected === 'image' || detected === 'video' || detected === 'pdf') {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    });

    Promise.all(readers).then((arrays) => {
      const flat = arrays.flat();
      setFiles((prev) => [...prev, ...flat]);
      toast.success(`Pasta "${folderName}" importada: ${flat.length} arquivo${flat.length !== 1 ? 's' : ''}`);
    });
    event.target.value = '';
  };

  const clearImportedFolder = () => {
    const f = createInitialFile();
    setFiles([f]);
    setOpenIds([f.id]);
    setActiveId(f.id);
    setImportedFolderName(null);
  };

  const activeFolderName = isTauriEnv
    ? (folder ? folder.split(/[\\/]/).pop() ?? folder : null)
    : importedFolderName;

  const handleFolderPick = () => {
    if (isTauriEnv) pickFolder();
    else importFolderRef.current?.click();
  };

  const handleFolderClear = () => {
    if (isTauriEnv) clearFolder();
    else clearImportedFolder();
  };

  const handleGitHubImport = async (importedFiles: { name: string; content: string; path: string }[]) => {
    const items: FileItem[] = importedFiles.map(({ name, content, path }) => ({
      id: uid(),
      name,
      language: detectByFilename(name) ?? 'markdown',
      content,
      path,
    }));

    // In Tauri: persist to ~/Desktop/<repo>/ before loading into sidebar
    if (isTauriEnv && importedFiles.length > 0) {
      try {
        const { writeTextFile, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        for (const file of importedFiles) {
          const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
          if (dir) await mkdir(dir, { baseDir: BaseDirectory.Desktop, recursive: true });
          await writeTextFile(file.path, file.content, { baseDir: BaseDirectory.Desktop });
        }
      } catch (e) {
        console.error('Erro ao salvar no Desktop:', e);
      }
    }

    setFiles((prev) => [...prev, ...items]);
    if (items.length > 0) setImportedFolderName(items[0].path.split('/')[0]);
    setShowGitHubModal(false);
    toast.success(`GitHub: ${items.length} arquivo${items.length !== 1 ? 's' : ''} importado${items.length !== 1 ? 's' : ''}`);
  };


  const handleShare = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.content);
    toast.success("Conteúdo copiado!");
  };

  const handleLanguage = (lang: Language) => {
    if (!active) return;
    updateActive({ language: lang, name: renameForLanguage(active.name, lang) });
  };

  const activePreviewBg: PreviewBg = (activeId && previewBgMap[activeId]) || "theme";
  const handlePreviewBgChange = (bg: PreviewBg) => {
    if (!activeId) return;
    setPreviewBgMap((prev) => ({ ...prev, [activeId]: bg }));
  };

  const handleCreate = () => {
    const f: FileItem = { id: uid(), name: "sem título.md", language: "markdown", content: "" };
    setFiles((prev) => [...prev, f]);
    setOpenIds((prev) => [...prev, f.id]);
    setActiveId(f.id);
  };

  const status = useMemo(() => {
    const lines = (active?.content ?? "").split("\n").length;
    const chars = (active?.content ?? "").length;
    return { lines, chars };
  }, [active?.content]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-muted-foreground">
      {showSplash && (
        <SplashScreen
          logoSrc={isLightTheme(theme) ? "/logo-notecoder-light.svg" : "/logo-notecoder.svg"}
          onDone={() => setShowSplash(false)}
        />
      )}
      {/* Title bar */}
      <header onMouseDown={handleHeaderMouseDown} className={cn("h-14 bg-[hsl(var(--tab-bar))] border-b border-border flex items-center px-4 select-none shrink-0 relative", isTauriEnv && "cursor-grab")}>
        {/* Left: logo */}
        <div className="flex-1 flex items-center">
          <img src={isLightTheme(theme) ? "/logo-notecoder-light.svg" : "/logo-notecoder.svg"} alt="Notecoder" className="h-5 w-auto shrink-0 pointer-events-none" />
        </div>

        {/* Right: actions */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {/* Inputs ocultos */}
          <input ref={importFileRef} type="file" accept=".html,.mhtml,.css,.js,.jsx,.mjs,.cjs,.md,.json,.txt,.svg,.py,.csv,.yml,.yaml,.xml,.png,.jpeg,.jpg,.bmp,.ico,.gif,.tiff,.webp,.avif,.heic,.mp4,.webm,.mkv,.mov,.pdf,.zip" onChange={handleImport} className="hidden" />
          <input ref={importFolderRef} type="file" onChange={handleImportFolder} className="hidden" {...{ webkitdirectory: '', directory: '' }} />

          {/* Importar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-border bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/15 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                Importar
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => importFileRef.current?.click()}>
                <FileText className="w-3.5 h-3.5 mr-2 opacity-60" />
                Arquivo
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(activeFolderName && "text-primary focus:text-primary")}
                onSelect={handleFolderPick}
              >
                <Folder className={cn("w-3.5 h-3.5 mr-2 shrink-0", activeFolderName ? "" : "opacity-60")} />
                <span className="flex-1 truncate min-w-0">{activeFolderName ?? 'Pasta'}</span>
                {activeFolderName && (
                  <span
                    role="button"
                    className="ml-2 p-0.5 rounded shrink-0 hover:bg-black/10 dark:hover:bg-white/10"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFolderClear(); }}
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowGitHubModal(true)}>
                <GitHubIcon className="w-3.5 h-3.5 mr-2 opacity-60" />
                GitHub
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Exportar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-border bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/15 transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5 shrink-0" />
                Exportar
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => handleExportAs('txt')}>Texto (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAs('md')}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportAs('html')}>HTML (.html)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAs('css')}>CSS (.css)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAs('json')}>JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAs('js')}>JavaScript (.js)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAs('svg')}>SVG (.svg)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportZip}>
                Todos como ZIP (.zip)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Copiar conteúdo */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-border bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/15 transition-colors cursor-pointer"
            title="Copiar conteúdo"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            Copiar
          </button>

          {/* Tema */}
          <button
            onClick={() => setShowThemeSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-ring/5 text-accent-foreground hover:text-primary hover:bg-primary/20 transition-colors font-medium cursor-pointer"
            title="Configurações de Tema"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>


        </div>

        {/* Window controls (Tauri only) */}
        {isTauriEnv && (
          <div className="flex items-center ml-2 shrink-0">
            <button
              onClick={() => getCurrentWindow().minimize()}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors cursor-pointer"
              title="Minimizar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => getCurrentWindow().toggleMaximize()}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors cursor-pointer"
              title={isMaximized ? "Restaurar" : "Maximizar"}
            >
              {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={() => getCurrentWindow().close()}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-red-500/80 hover:text-white rounded transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel
          ref={sidebarPanelRef}
          id="sidebar-panel"
          defaultSize={17}
          minSize={5}
          collapsible
          collapsedSize={2}
          className="flex flex-col"
        >
          <AtomSidebar
            files={files}
            activeId={activeId}
            onSelect={handleSidebarSelect}
            onCreate={handleCreate}
            onDelete={handleSidebarDelete}
            onCollapse={() => sidebarPanelRef.current?.collapse()}
            onExpand={() => sidebarPanelRef.current?.expand()}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/60 active:bg-primary transition-colors cursor-col-resize" />
        <Panel id="main-panel" className="flex flex-col min-w-0">
        <main className="h-full flex flex-col min-w-0">
          <AtomTabs
            files={openFiles}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={handleTabClose}
            onRename={handleRename}
            onCreate={handleCreate}
          />

          {active ? (
            <>
              {(() => {
                const isMedia = active.language === 'image' || active.language === 'video' || active.language === 'pdf';
                const effectiveViewMode = isMedia ? 'preview' : viewMode;
                return (
                  <>
                    <LanguageBar
                      language={active.language}
                      auto={autoDetect}
                      onAutoChange={setAutoDetect}
                      onLanguageChange={handleLanguage}
                      showAutoDetect={!isMedia}
                      showPreview={!isMedia && effectiveViewMode !== 'editor'}
                      previewBg={activePreviewBg}
                      onPreviewBgChange={handlePreviewBgChange}
                      zoom={editorZoom}
                      onZoomIn={() => setEditorZoom((z) => Math.min(z + 10, 200))}
                      onZoomOut={() => setEditorZoom((z) => Math.max(z - 10, 50))}
                      onZoomReset={() => setEditorZoom(100)}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      isMedia={isMedia}
                    />
                    <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                      {effectiveViewMode !== 'preview' && (
                        <Panel id="editor-panel" order={1} defaultSize={effectiveViewMode === 'split' ? 50 : 100} minSize={20} className="relative">
                          <AtomEditor
                            value={active.content}
                            language={active.language}
                            onChange={handleContent}
                            editorRef={editorRef}
                            onSearchOpen={() => setShowSearch(true)}
                            onScrollY={effectiveViewMode === 'split' ? syncFromEditor : undefined}
                            onSelectionChange={effectiveViewMode === 'split' && active.language === 'markdown' ? setSelectedLines : undefined}
                          />
                          {showSearch && (
                            <SearchPanel
                              view={editorRef.current?.view}
                              onClose={() => setShowSearch(false)}
                            />
                          )}
                        </Panel>
                      )}
                      {effectiveViewMode === 'split' && (
                        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/60 active:bg-primary transition-colors cursor-col-resize" />
                      )}
                      {effectiveViewMode !== 'editor' && (
                        <Panel id="preview-panel" order={2} defaultSize={effectiveViewMode === 'split' ? 50 : 100} minSize={20}>
                          <AtomPreview ref={previewRef} content={active.content} language={active.language} previewBg={activePreviewBg} onScroll={effectiveViewMode === 'split' ? syncFromPreview : undefined} zoom={editorZoom} selectedLines={effectiveViewMode === 'split' ? selectedLines : undefined} />
                        </Panel>
                      )}
                    </PanelGroup>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm select-none">
              Selecione um arquivo no painel lateral para abrir
            </div>
          )}
        </main>
        </Panel>
      </PanelGroup>

      {/* Status bar */}
      <footer className="h-6 bg-[hsl(var(--status-bar))] border-t border-border flex items-center px-3 text-[12px] text-muted-foreground gap-4">
       <span className=" text-[hsl(var(--primary))] font-semibold">© Notecoder v.1.0</span>    
       <span className="text-[hsl(var(--muted-))] italic ">Feito 90% com IA, e 10% com energético.</span>
        <div className="flex-1" />
        {folder && (
          <span className="flex items-center gap-1.5 min-w-0">
            {syncStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
            {syncStatus === "saved" && <Check className="w-3 h-3 text-green-400 shrink-0" />}
            {syncStatus === "error" && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
            {syncStatus === "idle" && <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />}
            <button
              onClick={openFolder}
              title={folder}
              className="truncate max-w-[260px] hover:text-foreground hover:underline transition-colors text-left"
            >
              {folder}
            </button>
          </span>
        )}

       {/* <span>{autoDetect ? "Detecção automática de código" : "Código escolhido manualmente"}</span>
      <span className="uppercase tracking-wide text-[hsl(var(--primary))]">{active?.language ?? ""}</span>*/}
            
    <span className="flex items-center gap-1.5">
    <List className="w-3.5 h-3.5 opacity-70 font-bold text-muted-foreground" />
    <span className="font-bold text-muted-foreground">Linhas</span>
    </span>

    <span className="flex items-center gap-1.5">
    <Type className="w-3.5 h-3.5 opacity-70 font-bold text-muted-foreground" />
    <span className="font-bold text-muted-foreground">{status.chars}</span> 
    <span className="font-bold text-muted-foreground">Caracteres</span>
    </span>

      
      </footer>

      {/* Theme Settings Modal */}
      <ThemeSettings
        isOpen={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
        onThemeChange={setTheme}
        currentTheme={theme}
        customization={customization}
        onCustomizationChange={setCustomization}
      />

      <GitHubImportModal
        open={showGitHubModal}
        onImport={handleGitHubImport}
        onCancel={() => setShowGitHubModal(false)}
      />
    </div>
  );
};

function renameForLanguage(currentName: string, lang: Language): string {
  const extMap: Record<Language, string> = {
    html: "html",
    css: "css",
    javascript: "js",
    markdown: "md",
    svg: "svg",
    json: "json",
    python: "py",
    csv: "csv",
    yaml: "yaml",
    xml: "xml",
    image: "",
    video: "",
    pdf: "pdf",
  };
  const desired = extMap[lang];
  if (!desired) return currentName;
  const dot = currentName.lastIndexOf(".");
  const base = dot > 0 ? currentName.slice(0, dot) : currentName;
  return `${base}.${desired}`;
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    ico: 'image/x-icon', tiff: 'image/tiff', avif: 'image/avif',
    heic: 'image/heic', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
    mov: 'video/quicktime', hevc: 'video/hevc',
    pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

export default Index;
