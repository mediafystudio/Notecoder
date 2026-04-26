Add-Type -AssemblyName System.Drawing

# ─── Cores do Notecoder Night ────────────────────────────────────────────────
$bgColor       = [System.Drawing.Color]::FromArgb(0, 0, 0)        # #000000
$surfaceColor  = [System.Drawing.Color]::FromArgb(0, 0, 0)        # #000000
$primaryColor  = [System.Drawing.Color]::FromArgb(122, 162, 247) # #02F48D
$fgColor       = [System.Drawing.Color]::FromArgb(169, 177, 214) # #EDEDED
$mutedColor    = [System.Drawing.Color]::FromArgb(65, 72, 104)   # #2A2A2A

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ─── HEADER — 150×57px ───────────────────────────────────────────────────────
# Aparece no topo de cada tela do instalador
$headerW = 150
$headerH = 57

$header = New-Object System.Drawing.Bitmap($headerW, $headerH)
$g = [System.Drawing.Graphics]::FromImage($header)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fundo
$g.Clear($bgColor)

# Linha de destaque no topo (azul primário)
$g.FillRectangle([System.Drawing.SolidBrush]::new($primaryColor), 0, 0, $headerW, 2)

# Ícone real do Notecoder + texto
$iconPath = Join-Path (Split-Path $scriptDir -Parent) "icons\icon.png"
$iconImg = [System.Drawing.Image]::FromFile($iconPath)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($iconImg, 8, 10, 36, 36)
$iconImg.Dispose()
$font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush($fgColor)
$g.DrawString("Notecoder", $font, $brush, 50, 18)

$g.Dispose()
$headerPath = Join-Path $scriptDir "header.bmp"
$header.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$header.Dispose()
Write-Host "header.bmp criado: $headerPath"

# ─── SIDEBAR — 164×314px ─────────────────────────────────────────────────────
# Aparece na tela de boas-vindas e conclusão (lado esquerdo)
$sideW = 164
$sideH = 314

$sidebar = New-Object System.Drawing.Bitmap($sideW, $sideH)
$g = [System.Drawing.Graphics]::FromImage($sidebar)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fundo escuro (surface)
$g.Clear($surfaceColor)

# Gradiente sutil de cima para baixo
$gradRect = New-Object System.Drawing.Rectangle(0, 0, $sideW, $sideH)
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $gradRect,
    [System.Drawing.Color]::FromArgb(40, $primaryColor.R, $primaryColor.G, $primaryColor.B),
    [System.Drawing.Color]::Transparent,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillRectangle($gradBrush, $gradRect)

# Linha vertical de destaque azul (borda direita)
$g.FillRectangle([System.Drawing.SolidBrush]::new($primaryColor), $sideW - 2, 0, 2, $sideH)

# Logo: ícone real do Notecoder (icon.png)
$iconPath = Join-Path (Split-Path $scriptDir -Parent) "icons\icon.png"
$iconSize = 72
$iconX = [int](($sideW - $iconSize) / 2)
$iconY = 36
$iconImg = [System.Drawing.Image]::FromFile($iconPath)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($iconImg, $iconX, $iconY, $iconSize, $iconSize)
$iconImg.Dispose()

# Nome do app
$fontName = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$brushFg = New-Object System.Drawing.SolidBrush($fgColor)
$nameSize = $g.MeasureString("Notecoder", $fontName)
$nameX = ($sideW - $nameSize.Width) / 2
$g.DrawString("Notecoder", $fontName, $brushFg, $nameX, 118)

# Linha separadora
$penMuted = New-Object System.Drawing.Pen($mutedColor, 1)
$g.DrawLine($penMuted, 20, 162, $sideW - 20, 162)

# Tagline
$fontTag = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Italic)
$tagLine1 = "Editor de código"
$tagLine2 = "para desenvolvedores"
$tag1Size = $g.MeasureString($tagLine1, $fontTag)
$tag2Size = $g.MeasureString($tagLine2, $fontTag)
$g.DrawString($tagLine1, $fontTag, $brushMuted, ($sideW - $tag1Size.Width) / 2, 172)
$g.DrawString($tagLine2, $fontTag, $brushMuted, ($sideW - $tag2Size.Width) / 2, 185)

$g.Dispose()
$sidebarPath = Join-Path $scriptDir "sidebar.bmp"
$sidebar.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$sidebar.Dispose()
Write-Host "sidebar.bmp criado: $sidebarPath"

Write-Host ""
Write-Host "Imagens do installer geradas com sucesso!" -ForegroundColor Green
Write-Host "Coloque seu logo em src-tauri/installer/ e rode este script novamente para atualizar." -ForegroundColor Cyan
