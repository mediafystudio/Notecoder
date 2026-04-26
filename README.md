<h1><img src="src-tauri/icons/icone-notecoder.svg" width="40" align="center" /> Notecoder</h1>

Editor de código e markdown com preview em tempo real. Roda como aplicativo desktop no Windows (via Tauri) e pode ser aberto no navegador durante o desenvolvimento.

**Demo ao vivo:** https://notecoder.vercel.app

| Funcionalidade | Web | Desktop |
|---|:---:|:---:|
| Editor de código com syntax highlighting | ✅ | ✅ |
| Preview de Markdown em tempo real | ✅ | ✅ |
| Suporte a fórmulas matemáticas (KaTeX) | ✅ | ✅ |
| Diagramas Mermaid (com zoom e export PNG/SVG) | ✅ | ✅ |
| Múltiplas abas | ✅ | ✅ |
| Temas claro e escuro | ✅ | ✅ |
| Importar repositório do GitHub | ✅ | ✅ |
| Importar arquivo do computador | ✅ | ✅ |
| Importar pasta inteira | ✅ | ✅ |
| Exportar arquivo (download) | ✅ | ✅ |
| Exportar pasta como .zip | ✅ | ✅ |
| Pasta de backup automático no disco | ❌ | ✅ |
| Monitorar mudanças na pasta de backup | ❌ | ✅ |
| Ícone na bandeja do sistema | ❌ | ✅ |

---

## Estrutura do Projeto

O projeto tem dois lados que trabalham juntos:

```
notecoder/
│
├── src/                  ← LADO WEB — tudo que aparece na tela
│   ├── components/
│   │   ├── atom/         ← Componentes principais do editor
│   │   └── ui/           ← Biblioteca de botões, menus, diálogos (shadcn/ui)
│   ├── hooks/            ← Lógicas reutilizáveis (tema, backup, scroll)
│   ├── lib/              ← Utilitários (markdown, mermaid, detecção de linguagem)
│   ├── pages/            ← Páginas da aplicação
│   ├── App.tsx           ← Componente raiz
│   └── main.tsx          ← Ponto de entrada
│
├── src-tauri/            ← LADO DESKTOP — transforma o app em .exe
│   ├── src/
│   │   ├── main.rs       ← Ponto de entrada Rust
│   │   └── lib.rs        ← Comandos do sistema (salvar, ler, deletar arquivos)
│   ├── icons/            ← Ícones do app (Windows, Mac, Linux, Android, iOS)
│   ├── installer/        ← Tema dark para o instalador NSIS do Windows
│   ├── capabilities/
│   │   └── default.json  ← Permissões do app (sistema de arquivos, etc.)
│   ├── tauri.conf.json   ← Configuração principal: nome, versão, janela
│   └── Cargo.toml        ← Dependências Rust
│
├── public/               ← Arquivos estáticos (logo, favicon)
├── index.html            ← HTML base
├── package.json          ← Dependências e scripts JS
├── vite.config.ts        ← Configuração do bundler Vite
└── tailwind.config.ts    ← Configuração do Tailwind CSS
```

> O Tauri compila o lado web primeiro e o embute no executável. A estrutura `src/` + `src-tauri/` é o padrão oficial do Tauri.

---

## O que o lado Rust faz

O código em `src-tauri/src/lib.rs` expõe estes comandos para o frontend:

| Comando | O que faz |
|---|---|
| `pick_folder` | Abre o diálogo nativo para escolher pasta de backup |
| `save_file` | Salva um arquivo de texto na pasta de backup |
| `delete_file` | Deleta um arquivo da pasta de backup |
| `load_files` | Carrega todos os arquivos de uma pasta |
| `open_folder` | Abre a pasta no explorador de arquivos do sistema |
| `start_folder_watch` | Monitora mudanças na pasta (polling a cada 1s) |
| `stop_folder_watch` | Para o monitoramento |

---

## Comandos do Dia a Dia

### Rodar em modo desenvolvimento

```bash
bun run tauri:dev
```

Abre o app desktop com hot-reload — qualquer mudança no código reflete na hora.

### Rodar só a interface web (sem Tauri)

```bash
bun run dev
```

Abre no navegador em `http://localhost:8080`. Útil para trabalhar só na parte visual.

### Gerar o instalador (.exe)

```bash
bun run tauri:build
```

O instalador aparece em: `src-tauri/target/release/bundle/nsis/`

### Rodar os testes

```bash
bun run test
```

---

## Como Atualizar Dependências

### Dependências JavaScript

```bash
# Ver o que está desatualizado
bun outdated

# Atualizar tudo
bun update

# Atualizar um pacote específico
bun add nome-do-pacote@latest
```

### Dependências Rust

```bash
cd src-tauri
cargo update
```

### Atualizar o próprio Tauri

```bash
bun add -D @tauri-apps/cli@latest
bun add @tauri-apps/api@latest
```

---

## Como Lançar uma Nova Versão

1. Edite o campo `"version"` em dois arquivos:
   - `package.json`
   - `src-tauri/tauri.conf.json`
2. Rode `bun run tauri:build`
3. O novo instalador estará em `src-tauri/target/release/bundle/nsis/`

---

## Pastas Geradas Automaticamente (não editar)

| Pasta | Gerada por | Como recriar |
|---|---|---|
| `dist/` | `bun run build` | `bun run build` |
| `node_modules/` | `bun install` | `bun install` |
| `src-tauri/target/` | `cargo build` | `bun run tauri:build` |

---

## Tecnologias Utilizadas

**Interface (Web)**
- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS (estilos)
- CodeMirror 6 (editor de código)
- Marked + KaTeX + Mermaid (renderização de markdown)
- shadcn/ui (componentes de interface)

**Desktop**
- Tauri 2 (wrapper desktop)
- Rust (backend nativo)
- NSIS (instalador Windows com tema dark customizado)
