import { useState } from "react";
import { useTheme, ThemeColors, defaultTheme } from "@/hooks/useTheme";

const syntaxTokenDefs: { key: keyof ThemeColors; label: string; desc: string; italic?: boolean }[] = [
  { key: "syntaxPurple", label: "Keywords controle", desc: "if, return, for, while, try, catch", italic: true },
  { key: "syntaxBlue",   label: "Definições & Funções", desc: "const, let, function, import, export" },
  { key: "syntaxCyan",   label: "Tipos & Operadores", desc: "string, number, ===, ||, ??, regex" },
  { key: "syntaxGreen",  label: "Strings", desc: "\"texto\", 'texto', `template`" },
  { key: "syntaxOrange", label: "Números & Booleanos", desc: "42, true, false, null" },
  { key: "syntaxYellow", label: "Propriedades", desc: "obj.prop, CSS property:" },
  { key: "syntaxRed",    label: "Tags HTML / JSX", desc: "<div>, <Component />" },
  { key: "syntaxComment",label: "Comentários", desc: "// linha,  /* bloco */" },
];

export interface ThemeCustomization {
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'sans' | 'serif';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
}

interface ThemePreset {
  name: string;
  colors: ThemeColors;
}

const themePresets: ThemePreset[] = [
  {
    name: "Notecoder Night",
    colors: {
      ...defaultTheme,
      background: "234 19% 13%",
      foreground: "204 42% 86%",
      card: "240 16% 10%",
      cardForeground: "229 35% 75%",
      primary: "220 89% 72%",
      primaryForeground: "234 19% 13%",
      secondary: "234 17% 15%",
      secondaryForeground: "229 35% 75%",
      muted: "234 16% 17%",
      mutedForeground: "229 23% 44%",
      accent: "228 23% 21%",
      accentForeground: "229 35% 75%",
      destructive: "0 67% 58%",
      destructiveForeground: "234 19% 13%",
      border: "240 11% 7%",
      input: "234 17% 15%",
      ring: "220 89% 72%",
      tabBar: "240 16% 10%",
      tabActive: "234 19% 13%",
      tabInactive: "240 16% 10%",
      sidebarBg: "240 16% 10%",
      statusBar: "240 16% 10%",
      editorBg: "234 19% 13%",
      editorLine: "228 23% 21%",
      editorSelectionMatch: "220 89% 72%",
      previewBg: "234 19% 13%",
      syntaxPurple: "261 86% 79%",
      syntaxBlue: "220 89% 72%",
      syntaxGreen: "89 51% 61%",
      syntaxYellow: "35 66% 64%",
      syntaxOrange: "23 100% 70%",
      syntaxCyan: "171 58% 65%",
      syntaxRed: "351 88% 71%",
      syntaxComment: "229 23% 44%",
    },
  },
  {
    name: "Notecoder Storm",
    colors: {
      ...defaultTheme,
      background: "229 24% 19%",
      foreground: "229 73% 86%",
      card: "229 26% 16%",
      cardForeground: "229 73% 86%",
      primary: "220 89% 72%",
      primaryForeground: "229 24% 19%",
      secondary: "229 22% 22%",
      secondaryForeground: "229 73% 86%",
      muted: "229 20% 24%",
      mutedForeground: "229 23% 44%",
      accent: "229 22% 27%",
      accentForeground: "229 73% 86%",
      destructive: "0 67% 58%",
      destructiveForeground: "229 24% 19%",
      border: "230 26% 14%",
      input: "229 22% 22%",
      ring: "220 89% 72%",
      tabBar: "229 26% 16%",
      tabActive: "229 24% 19%",
      tabInactive: "229 26% 16%",
      sidebarBg: "229 26% 16%",
      statusBar: "229 26% 16%",
      editorBg: "229 24% 19%",
      editorLine: "229 22% 27%",
      editorSelectionMatch: "220 89% 72%",
      previewBg: "229 24% 19%",
      syntaxPurple: "261 86% 79%",
      syntaxBlue: "220 89% 72%",
      syntaxGreen: "89 51% 61%",
      syntaxYellow: "35 66% 64%",
      syntaxOrange: "23 100% 70%",
      syntaxCyan: "171 58% 65%",
      syntaxRed: "351 88% 71%",
      syntaxComment: "229 23% 44%",
    },
  },
  {
    name: "Notecoder Light",
    colors: {
      ...defaultTheme,
      background: "0 0% 94%",
      foreground: "225 18% 26%",
      card: "0 0% 94%",
      cardForeground: "225 18% 26%",
      primary: "220 79% 49%",
      primaryForeground: "0 0% 98%",
      secondary: "227 10% 89%",
      secondaryForeground: "225 18% 26%",
      muted: "0 0% 86%",
      mutedForeground: "0 0% 34%",
      accent: "0 0% 88%",
      accentForeground: "225 18% 26%",
      destructive: "0 52% 38%",
      destructiveForeground: "0 0% 98%",
      border: "230 5% 77%",
      input: "227 10% 89%",
      ring: "220 79% 49%",
      tabBar: "0 0% 94%",
      tabActive: "0 0% 98%",
      tabInactive: "0 0% 91%",
      sidebarBg: "0 0% 94%",
      statusBar: "0 0% 91%",
      editorBg: "0 0% 98%",
      editorLine: "0 0% 91%",
      editorSelectionMatch: "220 79% 49%",
      previewBg: "0 0% 96%",
      syntaxPurple: "268 50% 41%",
      syntaxBlue: "213 44% 37%",
      syntaxGreen: "88 76% 21%",
      syntaxYellow: "36 74% 32%",
      syntaxOrange: "22 59% 37%",
      syntaxCyan: "171 32% 29%",
      syntaxRed: "351 60% 45%",
      syntaxComment: "226 7% 61%",
    },
  },
];

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (colors: ThemeColors) => void;
  currentTheme: ThemeColors;
  customization: ThemeCustomization;
  onCustomizationChange: (customization: ThemeCustomization) => void;
}

const colorGroups = [
  {
    label: "Base",
    keys: [
      { key: "background", label: "Fundo" },
      { key: "foreground", label: "Texto" },
      { key: "primary", label: "Primário" },
      { key: "primaryForeground", label: "Texto Primário" },
      { key: "secondary", label: "Secundário" },
      { key: "secondaryForeground", label: "Texto Secundário" },
      { key: "destructive", label: "Destrutivo" },
      { key: "destructiveForeground", label: "Texto Destrutivo" },
    ],
  },
  {
    label: "Interface",
    keys: [
      { key: "card", label: "Painel" },
      { key: "cardForeground", label: "Texto Painel" },
      { key: "muted", label: "Suavizado" },
      { key: "mutedForeground", label: "Texto Suavizado" },
      { key: "accent", label: "Destaque" },
      { key: "accentForeground", label: "Texto Destaque" },
      { key: "border", label: "Bordas" },
      { key: "input", label: "Input" },
      { key: "ring", label: "Foco" },
    ],
  },
  {
    label: "Editor",
    keys: [
      { key: "editorBg", label: "Fundo Editor" },
      { key: "previewBg", label: "Fundo Preview" },
      { key: "editorLine", label: "Linha Ativa" },
      { key: "editorSelectionMatch", label: "Seleção" },
      { key: "sidebarBg", label: "Barra Lateral" },
      { key: "tabBar", label: "Barra de Abas" },
      { key: "tabActive", label: "Aba Ativa" },
      { key: "tabInactive", label: "Aba Inativa" },
      { key: "statusBar", label: "Barra de Status" },
    ],
  },
  {
    label: "Sintaxe",
    keys: [
      { key: "syntaxPurple", label: "Roxo (keywords)" },
      { key: "syntaxGreen", label: "Verde (strings)" },
      { key: "syntaxYellow", label: "Amarelo (props)" },
      { key: "syntaxOrange", label: "Laranja (numbers)" },
      { key: "syntaxCyan", label: "Ciano (types)" },
      { key: "syntaxRed", label: "Vermelho (tags)" },
    ],
  },
];

export const ThemeSettings = ({
  isOpen,
  onClose,
  onThemeChange,
  currentTheme,
  customization,
  onCustomizationChange,
}: ThemeSettingsProps) => {
  const { hslToHex, hexToHsl } = useTheme();
  const [activeTab, setActiveTab] = useState<"presets" | "colors" | "editor" | "syntax">("presets");
  const [customColors, setCustomColors] = useState<ThemeColors>(currentTheme);
  const [activeGroup, setActiveGroup] = useState(0);

  const updateCustomization = (updates: Partial<ThemeCustomization>) => {
    onCustomizationChange({ ...customization, ...updates });
  };

  const applyPreset = (preset: ThemePreset) => {
    setCustomColors(preset.colors);
    onThemeChange(preset.colors);
  };

  const updateCustomColor = (key: keyof ThemeColors, value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    onThemeChange(newColors);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "presets" as const, label: "Predefinidos" },
    { id: "colors" as const, label: "Cores" },
    { id: "editor" as const, label: "Editor" },
    { id: "syntax" as const, label: "Sintaxe" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Configuração de Tema</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Predefinidos */}
          {activeTab === "presets" && (
            <div className="grid grid-cols-1 gap-2">
              {themePresets.map((preset) => (
                <button
                  key={preset.name}
                  className="flex items-center gap-3 border border-border rounded-md p-3 hover:bg-accent/50 transition-colors text-left w-full"
                  onClick={() => applyPreset(preset)}
                >
                  {/* Color strip */}
                  <div className="flex rounded overflow-hidden shrink-0 border border-border/50">
                    {[
                      preset.colors.background,
                      preset.colors.card,
                      preset.colors.primary,
                      preset.colors.secondary,
                      preset.colors.accent,
                      preset.colors.syntaxPurple,
                      preset.colors.syntaxGreen,
                      preset.colors.syntaxCyan,
                    ].map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-8"
                        style={{ backgroundColor: `hsl(${color})` }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{preset.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clique para aplicar este tema
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Cores */}
          {activeTab === "colors" && (
            <div className="flex gap-3 h-full">
              {/* Group nav */}
              <div className="flex flex-col gap-1 shrink-0 w-24">
                {colorGroups.map((group, i) => (
                  <button
                    key={group.label}
                    onClick={() => setActiveGroup(i)}
                    className={`px-2 py-1.5 text-xs rounded text-left transition-colors ${
                      activeGroup === i
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              {/* Color list */}
              <div className="flex-1 space-y-2">
                {colorGroups[activeGroup].keys.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground w-28 shrink-0">{label}</label>
                    <input
                      type="color"
                      value={hslToHex(customColors[key as keyof ThemeColors])}
                      onChange={(e) => updateCustomColor(key as keyof ThemeColors, hexToHsl(e.target.value))}
                      className="w-8 h-7 rounded border border-border cursor-pointer shrink-0 p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={hslToHex(customColors[key as keyof ThemeColors])}
                      onChange={(e) => {
                        const hex = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                          updateCustomColor(key as keyof ThemeColors, hexToHsl(hex));
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-input border border-border rounded text-foreground text-xs font-mono"
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sintaxe */}
          {activeTab === "syntax" && (
            <div className="space-y-4">
              {/* Live code preview */}
              <div className="rounded-md border border-border overflow-hidden">
                <p className="text-xs text-muted-foreground px-3 py-1.5 border-b border-border bg-muted/20">
                  Pré-visualização ao vivo
                </p>
                <div
                  className="p-3 text-xs leading-6 overflow-x-auto"
                  style={{ backgroundColor: `hsl(${customColors.editorBg})`, fontFamily: "var(--editor-font-family, monospace)", whiteSpace: "pre" }}
                >
                  <div><span style={{ color: `hsl(${customColors.syntaxComment})`, fontStyle: "italic" }}>{"// comentário de exemplo"}</span></div>
                  <div>
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>import</span>
                    {" { useState } "}
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>from</span>
                    {" "}
                    <span style={{ color: `hsl(${customColors.syntaxGreen})` }}>"react"</span>
                  </div>
                  <div>{" "}</div>
                  <div>
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>const</span>
                    {" count: "}
                    <span style={{ color: `hsl(${customColors.syntaxCyan})` }}>number</span>
                    {" = "}
                    <span style={{ color: `hsl(${customColors.syntaxOrange})` }}>42</span>
                  </div>
                  <div>
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>const</span>
                    {" label = "}
                    <span style={{ color: `hsl(${customColors.syntaxGreen})` }}>"Tokyo Night"</span>
                  </div>
                  <div>{" "}</div>
                  <div>
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>function</span>
                    {" "}
                    <span style={{ color: `hsl(${customColors.syntaxBlue})` }}>render</span>
                    {"("}
                    <span style={{ color: `hsl(${customColors.foreground})` }}>name</span>
                    {": "}
                    <span style={{ color: `hsl(${customColors.syntaxCyan})` }}>string</span>
                    {") {"}
                  </div>
                  <div>
                    {"  "}
                    <span style={{ color: `hsl(${customColors.syntaxPurple})`, fontStyle: "italic" }}>if</span>
                    {" (count "}
                    <span style={{ color: `hsl(${customColors.syntaxCyan})` }}>{"==="}</span>
                    {" "}
                    <span style={{ color: `hsl(${customColors.syntaxOrange})` }}>0</span>
                    {") "}
                    <span style={{ color: `hsl(${customColors.syntaxPurple})`, fontStyle: "italic" }}>return</span>
                    {" "}
                    <span style={{ color: `hsl(${customColors.syntaxOrange})` }}>null</span>
                  </div>
                  <div>
                    {"  "}
                    <span style={{ color: `hsl(${customColors.syntaxPurple})`, fontStyle: "italic" }}>return</span>
                    {" ("}
                  </div>
                  <div>
                    {"    "}
                    <span style={{ color: `hsl(${customColors.syntaxRed})` }}>{"<div"}</span>
                    {" "}
                    <span style={{ color: `hsl(${customColors.syntaxPurple})` }}>className</span>
                    {"="}
                    <span style={{ color: `hsl(${customColors.syntaxGreen})` }}>"container"</span>
                    <span style={{ color: `hsl(${customColors.syntaxRed})` }}>{">"}</span>
                  </div>
                  <div>
                    {"      "}
                    <span style={{ color: `hsl(${customColors.syntaxYellow})` }}>label</span>
                    {": {name}"}
                  </div>
                  <div>
                    {"    "}
                    <span style={{ color: `hsl(${customColors.syntaxRed})` }}>{"</div>"}</span>
                  </div>
                  <div>{"  )"}</div>
                  <div>{"}"}</div>
                </div>
              </div>

              {/* Token color pickers */}
              <div className="space-y-2">
                {syntaxTokenDefs.map(({ key, label, desc, italic }) => (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0 border border-black/20"
                      style={{ backgroundColor: `hsl(${customColors[key]})` }}
                    />
                    <div className="w-44 shrink-0">
                      <p className="text-xs text-foreground" style={italic ? { fontStyle: "italic" } : undefined}>{label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
                    </div>
                    <input
                      type="color"
                      value={hslToHex(customColors[key])}
                      onChange={(e) => updateCustomColor(key, hexToHsl(e.target.value))}
                      className="w-8 h-7 rounded border border-border cursor-pointer shrink-0 p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={hslToHex(customColors[key])}
                      onChange={(e) => {
                        const hex = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                          updateCustomColor(key, hexToHsl(hex));
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-input border border-border rounded text-foreground text-xs font-mono"
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          {activeTab === "editor" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tamanho da Fonte</label>
                  <select
                    value={customization.fontSize}
                    onChange={(e) => updateCustomization({ fontSize: e.target.value as ThemeCustomization['fontSize'] })}
                    className="w-full px-2 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                  >
                    <option value="small">Pequeno (11px)</option>
                    <option value="medium">Médio (13px)</option>
                    <option value="large">Grande (15px)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Família da Fonte</label>
                  <select
                    value={customization.fontFamily}
                    onChange={(e) => updateCustomization({ fontFamily: e.target.value as ThemeCustomization['fontFamily'] })}
                    className="w-full px-2 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                  >
                    <option value="mono">Cascadia Code (padrão)</option>
                    <option value="sans">Sem Serifa</option>
                    <option value="serif">Com Serifa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Altura da Linha</label>
                  <select
                    value={customization.lineHeight}
                    onChange={(e) => updateCustomization({ lineHeight: e.target.value as ThemeCustomization['lineHeight'] })}
                    className="w-full px-2 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                  >
                    <option value="tight">Compacta (1.4)</option>
                    <option value="normal">Normal (1.6)</option>
                    <option value="relaxed">Relaxada (1.9)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Raio das Bordas</label>
                  <select
                    value={customization.borderRadius}
                    onChange={(e) => updateCustomization({ borderRadius: e.target.value as ThemeCustomization['borderRadius'] })}
                    className="w-full px-2 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                  >
                    <option value="none">Nenhum (0px)</option>
                    <option value="small">Pequeno (4px)</option>
                    <option value="medium">Médio (6px)</option>
                    <option value="large">Grande (8px)</option>
                  </select>
                </div>
              </div>

              <div className="border border-border rounded-md p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs" style={{ borderRadius: 'var(--radius)' }}>Primário</span>
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs" style={{ borderRadius: 'var(--radius)' }}>Secundário</span>
                  <span className="px-3 py-1 border border-border text-foreground text-xs" style={{ borderRadius: 'var(--radius)' }}>Borda</span>
                  <span className="px-3 py-1 bg-destructive text-destructive-foreground text-xs" style={{ borderRadius: 'var(--radius)' }}>Destrutivo</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">Alterações aplicadas em tempo real</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCustomColors(defaultTheme);
                onThemeChange(defaultTheme);
              }}
              className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Restaurar padrão
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
