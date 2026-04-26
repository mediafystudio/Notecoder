import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X } from 'lucide-react'

const GitHubIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.05.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GHNode {
  type: 'file' | 'dir'
  name: string
  path: string
  children?: GHNode[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseGitHubUrl(raw: string): { owner: string; repo: string; ref: string; subpath: string } | null {
  try {
    const u = new URL(raw.trim())
    if (u.hostname !== 'github.com') return null
    const parts = u.pathname.replace(/^\//, '').split('/')
    const [owner, rawRepo, mode, ref, ...rest] = parts
    const repo = rawRepo?.replace(/\.git$/, '')
    if (!owner || !repo) return null
    if (mode === 'blob' || mode === 'tree') return { owner, repo, ref: ref ?? 'HEAD', subpath: rest.join('/') }
    return { owner, repo, ref: 'HEAD', subpath: '' }
  } catch {
    return null
  }
}

function buildTree(paths: string[]): GHNode[] {
  const root: GHNode = { type: 'dir', name: '', path: '', children: [] }

  for (const path of paths) {
    const parts = path.split('/')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const nodePath = parts.slice(0, i + 1).join('/')
      if (!node.children) node.children = []
      if (i === parts.length - 1) {
        node.children.push({ type: 'file', name: part, path })
      } else {
        let dir = node.children.find((c) => c.type === 'dir' && c.name === part)
        if (!dir) {
          dir = { type: 'dir', name: part, path: nodePath, children: [] }
          node.children.push(dir)
        }
        node = dir
      }
    }
  }

  return root.children ?? []
}

function sortNodes(nodes: GHNode[]): GHNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

function getFilePaths(nodes: GHNode[]): string[] {
  const out: string[] = []
  for (const n of nodes) {
    if (n.type === 'file') out.push(n.path)
    if (n.children) out.push(...getFilePaths(n.children))
  }
  return out
}

// ── FileTree component ─────────────────────────────────────────────────────────

function FileTree({
  nodes,
  selected,
  onToggleFile,
  onToggleDir,
  depth = 0,
}: {
  nodes: GHNode[]
  selected: Set<string>
  onToggleFile: (path: string) => void
  onToggleDir: (paths: string[], select: boolean) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  return (
    <ul className="space-y-0.5">
      {sortNodes(nodes).map((node) => {
        if (node.type === 'dir') {
          const isOpen = expanded.has(node.path)
          const dirPaths = getFilePaths(node.children ?? [])
          const selectedCount = dirPaths.filter((p) => selected.has(p)).length
          const isActive = selectedCount > 0

          return (
            <li key={node.path}>
              <button
                style={{ background: isActive ? 'hsl(var(--primary) / 0.08)' : undefined }}
                className={cn(
                  'flex items-center gap-1.5 w-full px-2 py-1 rounded text-sm text-left transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted/60',
                )}
                onClick={() =>
                  setExpanded((prev) => {
                    const s = new Set(prev)
                    s.has(node.path) ? s.delete(node.path) : s.add(node.path)
                    return s
                  })
                }
              >
                {isOpen
                  ? <ChevronDown size={13} className="shrink-0 opacity-60" />
                  : <ChevronRight size={13} className="shrink-0 opacity-60" />}
                {isOpen
                  ? <FolderOpen size={13} className="shrink-0" />
                  : <Folder size={13} className="shrink-0 opacity-60" />}
                <span className="flex-1 truncate">{node.name}</span>
                {isActive && (
                  <span
                    role="button"
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onToggleDir(dirPaths, false)
                    }}
                  >
                    <X size={11} />
                  </span>
                )}
              </button>
              {isOpen && node.children && (
                <div style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                  <FileTree
                    nodes={node.children}
                    selected={selected}
                    onToggleFile={onToggleFile}
                    onToggleDir={onToggleDir}
                    depth={depth + 1}
                  />
                </div>
              )}
            </li>
          )
        }

        const isSelected = selected.has(node.path)
        return (
          <li key={node.path}>
            <button
              className={cn(
                'flex items-center gap-1.5 w-full px-2 py-1 rounded text-sm text-left transition-colors',
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground',
              )}
              onClick={() => onToggleFile(node.path)}
            >
              <FileText size={13} className="opacity-50 shrink-0" />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onImport: (files: { name: string; content: string; path: string }[]) => void
  onCancel: () => void
}

const TOKEN_KEY = 'gh_import_token'

function isRateLimit(msg: string) {
  return /rate limit/i.test(msg)
}

export function GitHubImportModal({ open, onImport, onCancel }: Props) {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenPrompt, setShowTokenPrompt] = useState(false)
  const [showTokenText, setShowTokenText] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; ref: string } | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const tree = useMemo(() => buildTree(filePaths), [filePaths])

  function ghHeaders(tok = token) {
    const h: Record<string, string> = { Accept: 'application/vnd.github+json' }
    const t = tok.trim()
    if (t) h['Authorization'] = `Bearer ${t}`
    return h
  }

  async function handleFetch(tok = token) {
    setError('')
    setFilePaths([])
    setSelected(new Set())
    setRepoInfo(null)
    setShowTokenPrompt(false)

    const parsed = parseGitHubUrl(url)
    if (!parsed) { setError('URL inválida. Use: https://github.com/owner/repo'); return }

    setLoading(true)
    try {
      let ref = parsed.ref
      if (ref === 'HEAD') {
        const r = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
          headers: ghHeaders(tok),
        })
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          throw new Error((e as any).message ?? `HTTP ${r.status}`)
        }
        const d = await r.json()
        ref = d.default_branch ?? 'main'
      }

      const r = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${ref}?recursive=1`,
        { headers: ghHeaders(tok) },
      )
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error((e as any).message ?? `HTTP ${r.status}`)
      }
      const data = await r.json()

      let paths: string[] = (data.tree as any[])
        .filter((item: any) => item.type === 'blob')
        .map((item: any) => item.path as string)

      if (parsed.subpath) {
        const prefix = parsed.subpath + '/'
        paths = paths
          .filter((p) => p.startsWith(prefix) || p === parsed.subpath)
          .map((p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p))
      }

      if (data.truncated) {
        setError('Repositório muito grande — apenas parte da árvore foi carregada.')
      }

      setFilePaths(paths)
      setRepoInfo({ owner: parsed.owner, repo: parsed.repo, ref })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar repositório'
      if (isRateLimit(msg)) {
        setShowTokenPrompt(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSaveToken() {
    const t = tokenInput.trim()
    if (!t) return
    localStorage.setItem(TOKEN_KEY, t)
    setToken(t)
    setTokenInput('')
    handleFetch(t)
  }

  function toggleFile(path: string) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(path) ? s.delete(path) : s.add(path)
      return s
    })
  }

  function toggleDir(paths: string[], select: boolean) {
    setSelected((prev) => {
      const s = new Set(prev)
      for (const p of paths) select ? s.add(p) : s.delete(p)
      return s
    })
  }

  async function handleImport() {
    if (!repoInfo || selected.size === 0) { setError('Selecione ao menos um arquivo'); return }
    setImporting(true)
    setError('')
    const { owner, repo, ref } = repoInfo
    const paths = Array.from(selected)
    const results: { name: string; content: string; path: string }[] = []
    const BATCH = 15
    setProgress({ done: 0, total: paths.length })
    try {
      for (let i = 0; i < paths.length; i += BATCH) {
        const batch = paths.slice(i, i + BATCH)
        const batchResults = await Promise.all(
          batch.map(async (path) => {
            const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`, {
              headers: token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {},
            })
            if (!res.ok) return null
            return { name: path.split('/').pop() ?? path, content: await res.text(), path: `${repo}/${path}` }
          })
        )
        results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null))
        setProgress({ done: Math.min(i + BATCH, paths.length), total: paths.length })
      }
      onImport(results)
      handleClose()
    } catch {
      setError('Falha ao baixar arquivos')
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  function handleClose() {
    setUrl('')
    setFilePaths([])
    setSelected(new Set())
    setError('')
    setRepoInfo(null)
    setShowTokenPrompt(false)
    setTokenInput('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitHubIcon size={16} />
            Importar do GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground outline-none focus:border-primary transition-colors"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleFetch()}
            autoFocus
          />
          <button
            onClick={() => handleFetch()}
            disabled={loading || !url.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Buscar
          </button>
        </div>

        {showTokenPrompt && (
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3 text-xs">
            <p className="font-medium text-foreground">
              Limite da API do GitHub atingido
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A API pública do GitHub permite apenas <strong>60 requisições por hora</strong> sem autenticação.
              Para continuar, gere um token pessoal gratuito:
            </p>
            <ol className="text-muted-foreground space-y-0.5 list-decimal list-inside leading-relaxed">
              <li>Acesse <strong>github.com → Settings → Developer settings</strong></li>
              <li>Clique em <strong>Personal access tokens → Tokens (classic)</strong></li>
              <li>Clique em <strong>Generate new token</strong></li>
              <li>Marque o escopo <strong>public_repo</strong> e gere o token</li>
              <li>Cole o token abaixo e clique em Salvar e tentar novamente</li>
            </ol>
            <div className="flex gap-2 items-center pt-1">
              <input
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground outline-none focus:border-primary transition-colors font-mono text-xs"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                type={showTokenText ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                autoFocus
              />
              <button
                onClick={() => setShowTokenText((v) => !v)}
                className="px-2 py-2 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors text-muted-foreground shrink-0"
              >
                {showTokenText ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTokenPrompt(false)}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToken}
                disabled={!tokenInput.trim()}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Salvar e tentar novamente
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {tree.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selected.size} de {filePaths.length} arquivo{filePaths.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-3">
                <button className="hover:text-foreground transition-colors" onClick={() => setSelected(new Set(filePaths))}>
                  Selecionar tudo
                </button>
                {selected.size > 0 && (
                  <button className="hover:text-foreground transition-colors" onClick={() => setSelected(new Set())}>
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-background p-2">
              <FileTree
                nodes={tree}
                selected={selected}
                onToggleFile={toggleFile}
                onToggleDir={toggleDir}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
          {tree.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {importing && <Loader2 size={13} className="animate-spin" />}
              {progress
                ? `${progress.done}/${progress.total} arquivos…`
                : `Importar${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
