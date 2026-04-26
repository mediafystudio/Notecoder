# NSIS Dark Theme — Guia Completo

Documentação de todas as técnicas usadas para criar um instalador NSIS totalmente dark no Notecoder,
usando Tauri v2 + NSIS v3 + Windows 10/11.

---

## Estrutura de arquivos

```
src-tauri/
├── tauri.conf.json          # Configuração do bundle
├── Cargo.toml               # Nome do binário instalado
├── installer/
│   ├── installer.nsi        # Template NSIS customizado (Handlebars)
│   ├── header.bmp           # 150×57 px — cabeçalho de cada tela
│   ├── sidebar.bmp          # 164×314 px — lateral da tela de boas-vindas/fim
│   ├── gerar-imagens.ps1    # Script PowerShell para regenerar os BMPs
│   └── NSIS-DARK-THEME.md   # Este arquivo
└── icons/
    ├── icon.ico             # Ícone multi-resolução (16/24/32/48/64/256 px, 32bpp)
    └── icon.png             # Fonte PNG 1024×1024 (gerada do SVG)
```

---

## tauri.conf.json — configuração essencial

```json
{
  "productName": "Notecoder",
  "version": "1.0.0",
  "bundle": {
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "languages": ["PortugueseBR"],
        "displayLanguageSelector": false,
        "template": "installer/installer.nsi",
        "headerImage": "installer/header.bmp",
        "sidebarImage": "installer/sidebar.bmp",
        "installerIcon": "icons/icon.ico",
        "installMode": "currentUser"
      }
    }
  }
}
```

### Observações

- `installerIcon` — em alguns builds do Tauri v2 o campo pode não ser passado para `{{installer_icon}}`.
  Use o fallback com `${__FILEDIR__}` no template (ver seção de ícone abaixo).
- `productName` sem versão — o nome aparece no título do instalador, atalho, entrada de desinstalação
  e no nome da pasta de instalação.

---

## Cargo.toml — nome do binário instalado

Para que o EXE instalado tenha nome com letra maiúscula (`Notecoder.exe`), adicione
a seção `[[bin]]` explicitamente (sem ela o Cargo usa o `name` do `[package]`, em minúsculas):

```toml
[[bin]]
name = "Notecoder"
path = "src/main.rs"

[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
```

> No Windows o sistema de arquivos é case-insensitive, mas o nome visual no Explorer
> usará a capitalização definida aqui.

---

## installer.nsi — template completo

### 1. Defines de cores e DWM (no topo, antes de tudo)

```nsi
; ─── Tema dark ────────────────────────────────────────────────────────────────
!define MUI_BGCOLOR              "000000"          ; fundo preto
!define MUI_TEXTCOLOR            "A9B1D6"          ; texto cinza-azulado
!define MUI_INSTFILESPAGE_COLORS "A9B1D6 000000"   ; tela de progresso

; Atributos DWM para title bar e borda
!define DWMWA_USE_IMMERSIVE_DARK_MODE 20   ; Win 10 1903+ e Win 11
!define DWMWA_BORDER_COLOR             34   ; Win 11+ — cor da borda
!define DWMWA_CAPTION_COLOR            35   ; Win 11+ — cor do título

; Cores como strings NSIS (sem # e sem 0x)
!define NC_FG   "A9B1D6"
!define NC_BG   "000000"

; Macro que aplica dark em um controle individual:
;   1. SetWindowTheme " " → desativa UxTheme → GDI clássico → responde a SetCtlColors
;   2. SetCtlColors     → aplica fg/bg
;   3. InvalidateRect   → marca o controle como sujo para repintura
!macro _DarkCtl HWD
  System::Call 'uxtheme::SetWindowTheme(p ${HWD}, w " ", w " ")'
  SetCtlColors ${HWD} "${NC_FG}" "${NC_BG}"
  System::Call 'user32::InvalidateRect(p ${HWD}, p 0, i 1)'
!macroend
!define DarkCtl "!insertmacro _DarkCtl"
```

> **Por que `SetWindowTheme(" ", " ")` e não `("", "")`?**
> Uma string vazia `""` significa "usar tema padrão". Uma string não-vazia que não corresponde
> a nenhum tema (`" "` — espaço) desativa efetivamente o UxTheme para aquele controle,
> fazendo-o usar GDI clássico. Apenas com GDI clássico o `SetCtlColors` funciona em
> radio buttons e checkboxes.

---

### 2. Ícone do instalador — fallback com `${__FILEDIR__}`

Tauri v2 nem sempre preenche `{{installer_icon}}`. Use este bloco para garantir o ícone:

```nsi
; O script é compilado de: src-tauri\target\release\nsis\x64\
; 4 níveis acima (x64 → nsis → release → target → src-tauri) chegamos ao src-tauri
!if "${INSTALLERICON}" != ""
  !define MUI_ICON "${INSTALLERICON}"
!else
  !define MUI_ICON "${__FILEDIR__}\..\..\..\..\icons\icon.ico"
!endif
!if "${UNINSTALLERICON}" != ""
  !define MUI_UNICON "${UNINSTALLERICON}"
!else
  !define MUI_UNICON "${__FILEDIR__}\..\..\..\..\icons\icon.ico"
!endif
```

> `${__FILEDIR__}` é uma variável de pré-processamento do NSIS 3.x que retorna o
> diretório absoluto do arquivo `.nsi` em compilação. Permite paths absolutos sem
> depender de variáveis de ambiente.

---

### 3. Hooks de tema por página MUI

Adicione **antes de cada `!insertmacro MUI_PAGE_*`**:

```nsi
!define MUI_PAGE_CUSTOMFUNCTION_PRE  SkipIfPassive
!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme
!insertmacro MUI_PAGE_WELCOME

!define MUI_PAGE_CUSTOMFUNCTION_PRE  SkipIfPassive
!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme
!insertmacro MUI_PAGE_DIRECTORY

!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme
!insertmacro MUI_PAGE_STARTMENU Application $AppStartMenuFolder

!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme
!insertmacro MUI_PAGE_INSTFILES

!define MUI_PAGE_CUSTOMFUNCTION_PRE  SkipIfPassive
!define MUI_PAGE_CUSTOMFUNCTION_SHOW ApplyDarkTheme
!insertmacro MUI_PAGE_FINISH
```

> MUI2 reseta os defines `MUI_PAGE_CUSTOMFUNCTION_*` após cada `!insertmacro MUI_PAGE_*`,
> então é necessário redefinir antes de cada página.

---

### 4. Página customizada (nsDialogs) — PageReinstall

Para páginas criadas com `nsDialogs::Create`, aplique dark em cada controle
logo após a criação:

```nsi
Function PageReinstall
  Call ApplyDarkTheme   ; aplica dark no frame principal antes de criar o diálogo

  ; ... lógica de versão ...

  nsDialogs::Create 1018
  Pop $R4
  ${DarkCtl} $R4        ; escurece o próprio diálogo nsDialogs

  ${NSD_CreateLabel} 0 0 100% 24u $R1
  Pop $R1
  ${DarkCtl} $R1

  ${NSD_CreateRadioButton} 30u 50u -30u 8u $R2
  Pop $R2
  ${DarkCtl} $R2        ; SetWindowTheme remove UxTheme → radio fica dark

  ${NSD_CreateRadioButton} 30u 70u -30u 8u $R3
  Pop $R3
  ${DarkCtl} $R3

  ; ... resto da função ...
  nsDialogs::Show
FunctionEnd
```

---

### 5. Checkbox dinâmico na tela de desinstalação

O checkbox "deletar dados" é criado via `CreateWindowEx` em `un.ConfirmShow`.
Aplique dark imediatamente após criá-lo:

```nsi
Function un.ConfirmShow
  Call un.ApplyDarkTheme
  ; ... cria o checkbox com CreateWindowEx ...
  Pop $DeleteAppDataCheckbox
  SendMessage $HWNDPARENT ${WM_GETFONT} 0 0 $1
  SendMessage $DeleteAppDataCheckbox ${WM_SETFONT} $1 1
  ${DarkCtl} $DeleteAppDataCheckbox   ; ← adicionar aqui
FunctionEnd
```

---

### 6. Função ApplyDarkTheme

```nsi
Function ApplyDarkTheme
  ; ── Title bar e borda via DWM ──────────────────────────────────────────────
  ; Attr 19 = dark mode em Win 10 1809 (undocumented); 20 = Win 10 1903+ e Win 11
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 19, *i 1, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE}, *i 1, i 4)'
  ; Caption color preta (Win 11+ — DWMWA_CAPTION_COLOR = 35, COLORREF 0x000000 = preto)
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_CAPTION_COLOR}, *i 0, i 4)'
  ; Sem borda (Win 11+ — DWMAPI_COLOR_NONE = 0xFFFFFFFE = -2 signed)
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_BORDER_COLOR}, *i -2, i 4)'
  ; SWP_NOSIZE|NOMOVE|NOZORDER|FRAMECHANGED = 0x27 — força repintura do frame
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i 0, i 0, i 0, i 0, i 0x27)'

  ; ── Controles da janela ────────────────────────────────────────────────────
  ${DarkCtl} $HWNDPARENT

  ; Enumera 3 níveis de filhos e aplica dark em cada um
  StrCpy $R6 0
  L1:
    System::Call 'user32::FindWindowEx(p $HWNDPARENT, p R6, p 0, p 0) p .R6'
    ${If} $R6 = 0
      Goto _DarkDone
    ${EndIf}
    ${DarkCtl} $R6
    StrCpy $R7 0
    L2:
      System::Call 'user32::FindWindowEx(p R6, p R7, p 0, p 0) p .R7'
      ${If} $R7 = 0
        Goto L1
      ${EndIf}
      ${DarkCtl} $R7
      StrCpy $R8 0
      L3:
        System::Call 'user32::FindWindowEx(p R7, p R8, p 0, p 0) p .R8'
        ${If} $R8 = 0
          Goto L2
        ${EndIf}
        ${DarkCtl} $R8
        Goto L3
  _DarkDone:
  ; RDW_INVALIDATE(1)|RDW_ERASE(4)|RDW_ALLCHILDREN(0x80) = 0x85
  System::Call 'user32::RedrawWindow(p $HWNDPARENT, p 0, p 0, i 0x0085)'
FunctionEnd
```

> Crie também `Function un.ApplyDarkTheme` com o mesmo conteúdo e labels `uL1/uL2/uL3`
> (NSIS não permite labels duplicados entre funções installer e uninstaller).

---

### 7. Inicialização antecipada do DWM (antes do primeiro SHOW)

O callback `MUI_PAGE_CUSTOMFUNCTION_SHOW` roda *depois* que a janela já foi renderizada.
Para que a title bar nasça preta, aplique os atributos DWM no callback `PRE`
(que roda *antes* do SHOW). Use a função `SkipIfPassive` que já é o PRE de todas as páginas:

```nsi
Var _DWMInitDone

Function SkipIfPassive
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  ; Roda apenas uma vez — na primeira página, antes do SHOW
  ${If} $_DWMInitDone = 0
    StrCpy $_DWMInitDone 1
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 19, *i 1, i 4)'
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE}, *i 1, i 4)'
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_CAPTION_COLOR}, *i 0, i 4)'
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_BORDER_COLOR}, *i -2, i 4)'
    System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i 0, i 0, i 0, i 4, i 0x27)'
  ${EndIf}
FunctionEnd
```

---

### 8. Refresh do cache de ícones após instalação

Adicione ao final da `Section Install`, após criar os atalhos:

```nsi
; Notifica o Windows para invalidar o cache de ícones
; SHCNE_ASSOCCHANGED (0x8000000) — força refresh global de ícones
System::Call 'shell32::SHChangeNotify(l 0x8000000, i 0, p 0, p 0)'
```

Sem isso, o atalho na área de trabalho pode mostrar o ícone antigo em cache mesmo
que o EXE tenha um ícone novo.

---

## Compatibilidade por versão do Windows

| Recurso | Win 10 1809 | Win 10 1903+ | Win 11 |
|---|---|---|---|
| `DWMWA_USE_IMMERSIVE_DARK_MODE` (attr 19) | ✓ | — | — |
| `DWMWA_USE_IMMERSIVE_DARK_MODE` (attr 20) | — | ✓ | ✓ |
| `DWMWA_CAPTION_COLOR` (attr 35) — cor exata | — | — | ✓ |
| `DWMWA_BORDER_COLOR` (attr 34) — sem borda | — | — | ✓ |
| `SetWindowTheme` → radio/checkbox dark | ✓ | ✓ | ✓ |
| `MUI_BGCOLOR` — fundo das páginas MUI | ✓ | ✓ | ✓ |

> No Win 10 a title bar ficará *escura* (cinza escuro do sistema). No Win 11 ficará
> *preta exata* graças a `DWMWA_CAPTION_COLOR = 0`.

---

## Geração do icon.ico multi-resolução

```powershell
# 1. Renderizar SVG para PNG 1024×1024 com resvg (alta qualidade)
npx @resvg/resvg-js-cli --fit-width 1024 --fit-height 1024 `
    --shape-rendering 2 --image-rendering 0 `
    src-tauri/icons/icone-notecoder.svg `
    src-tauri/icons/icon.png

# 2. Gerar todos os tamanhos e o ICO multi-resolução via Tauri CLI
npm run tauri -- icon src-tauri/icons/icon.png
```

O ICO resultante deve conter: 16×16, 24×24, 32×32, 48×48, 64×64, 256×256 (todos 32bpp).

---

## Problemas conhecidos e limitações

### Template Handlebars — `{{|}}`
O Tauri usa Handlebars para processar o `.nsi`. A sequência `{{|}}` usada em
`${IfThen} condição ${|} ação ${|}` é interpretada como Handlebars e quebra a compilação.

**Solução:** substituir todo `${IfThen}` que contenha `{{|}}` por blocos `${If}/${EndIf}`:

```nsi
; ERRADO — quebra o Handlebars:
${IfThen} $PassiveMode = 1 ${|} Abort ${|}

; CORRETO:
${If} $PassiveMode = 1
  Abort
${EndIf}
```

### `.onGUIInit` — conflito com Tauri
O Tauri injeta sua própria função `.onGUIInit`. Definir outra no template causa erro de compilação.

**Solução:** não declarar `.onGUIInit`. Usar `MUI_PAGE_CUSTOMFUNCTION_SHOW` e
`MUI_PAGE_CUSTOMFUNCTION_PRE` para rodar código no início de cada página.

### Ícone do instalador não passado pelo Tauri
Em alguns builds o `{{installer_icon}}` chega vazio ao template.

**Solução:** usar `${__FILEDIR__}` para construir o path absoluto (ver seção de ícone).

### Title bar cinza no Win 10
`DWMWA_CAPTION_COLOR` não existe no Win 10. A title bar ficará cinza escuro
(dark mode), não preta. Não há solução sem remover o frame da janela (o que
eliminaria os botões de minimizar/fechar).
