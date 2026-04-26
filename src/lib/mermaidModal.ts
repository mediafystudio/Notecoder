// ── Module-level modal state ──────────────────────────────────────────────────
let modalZoomScale = 1
let modalPanX = 0
let modalPanY = 0
let modalIsDragging = false
let modalDragStart = { x: 0, y: 0 }
let modalCurrentSvgEl: SVGSVGElement | null = null
let modalReady = false

function applyModalTransform() {
  if (modalCurrentSvgEl) {
    modalCurrentSvgEl.style.transform =
      `translate(${modalPanX}px, ${modalPanY}px) scale(${modalZoomScale})`
  }
}

export function closeMermaidModal() {
  const modal = document.getElementById('mermaid-zoom-modal')
  const area = document.getElementById('mermaid-modal-diagram')
  if (!modal?.classList.contains('active')) return
  modal.classList.remove('active')
  if (area) area.innerHTML = ''
  modalCurrentSvgEl = null
  modalZoomScale = 1
  modalPanX = 0
  modalPanY = 0
}

export function openMermaidZoomModal(container: Element) {
  const svgEl = container.querySelector<SVGSVGElement>('svg')
  if (!svgEl) return
  const modal = ensureModal()
  const area = document.getElementById('mermaid-modal-diagram')!
  area.innerHTML = ''
  modalZoomScale = 1
  modalPanX = 0
  modalPanY = 0

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('width')
  clone.removeAttribute('height')
  Object.assign(clone.style, {
    width: 'auto',
    height: 'auto',
    maxWidth: '86vw',
    maxHeight: '75vh',
    transformOrigin: 'center',
    transition: 'transform 0.1s ease',
  })
  area.appendChild(clone)
  modalCurrentSvgEl = clone
  modal.classList.add('active')
}

// ── Export helpers ────────────────────────────────────────────────────────────

function svgToDataUrl(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  const bbox = svgEl.getBoundingClientRect()
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.round(bbox.width)))
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.round(bbox.height)))
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
}

function svgToCanvas(svgEl: SVGSVGElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const bbox = svgEl.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    const w = Math.max(Math.round(bbox.width), 1)
    const h = Math.max(Math.round(bbox.height), 1)
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    const rawBg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
    ctx.fillStyle = rawBg ? `hsl(${rawBg})` : '#ffffff'
    ctx.fillRect(0, 0, w, h)
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0, w, h); resolve(canvas) }
    img.onerror = reject
    img.src = svgToDataUrl(svgEl)
  })
}

async function downloadMermaidPng(svgEl: SVGSVGElement): Promise<void> {
  const canvas = await svgToCanvas(svgEl)
  await new Promise<void>((res) =>
    canvas.toBlob((blob) => {
      if (!blob) return res()
      const url = URL.createObjectURL(blob)
      Object.assign(document.createElement('a'), { href: url, download: `diagram-${Date.now()}.png` }).click()
      URL.revokeObjectURL(url)
      res()
    }, 'image/png')
  )
}

async function copyMermaidImage(svgEl: SVGSVGElement): Promise<void> {
  const canvas = await svgToCanvas(svgEl)
  await new Promise<void>((res, rej) =>
    canvas.toBlob(async (blob) => {
      if (!blob) return rej(new Error('no blob'))
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]) } catch { /* silent */ }
      res()
    }, 'image/png')
  )
}

function downloadMermaidSvg(svgEl: SVGSVGElement) {
  const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: `diagram-${Date.now()}.svg` }).click()
  URL.revokeObjectURL(url)
}

export async function withBtnFeedback(btn: HTMLButtonElement, fn: () => Promise<void>) {
  const span = btn.querySelector('span')
  const orig = span?.textContent ?? ''
  if (span) span.textContent = '...'
  try { await fn(); if (span) span.textContent = '✓' }
  catch { if (span) span.textContent = '!' }
  setTimeout(() => { if (span) span.textContent = orig }, 1800)
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function makeSvgIcon(paths: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  Object.assign(svg.style, { width: '14px', height: '14px', display: 'block', flexShrink: '0' })
  svg.innerHTML = paths
  return svg
}

const ICONS = {
  expand: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
  copy:   '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  png:    '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.71.15L14 16.5l-1.29-1.29a2 2 0 0 0-2.71.15L8.5 17H20z"/>',
  svg:    '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 13 7 15 9 17"/><polyline points="15 13 17 15 15 17"/>',
}

function mkBtn(icon: SVGSVGElement, label: string, title: string, onClick: (btn: HTMLButtonElement) => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'mermaid-toolbar-btn'
  btn.title = title
  btn.appendChild(icon)
  if (label) {
    const span = document.createElement('span')
    span.textContent = label
    btn.appendChild(span)
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(btn) })
  return btn
}

export function addMermaidToolbars(previewEl: HTMLElement) {
  previewEl.querySelectorAll<HTMLElement>('.mermaid-container').forEach((container) => {
    if (container.querySelector('.mermaid-toolbar')) return
    const svgEl = container.querySelector<SVGSVGElement>('.mermaid-rendered svg')
    if (!svgEl) return

    const toolbar = document.createElement('div')
    toolbar.className = 'mermaid-toolbar'
    toolbar.setAttribute('aria-label', 'Diagram actions')

    toolbar.appendChild(mkBtn(makeSvgIcon(ICONS.expand), '', 'Zoom diagram', () => openMermaidZoomModal(container)))
    toolbar.appendChild(mkBtn(makeSvgIcon(ICONS.copy), 'Copiar', 'Copiar imagem', async (btn) => {
      await withBtnFeedback(btn, () => copyMermaidImage(svgEl))
    }))
    toolbar.appendChild(mkBtn(makeSvgIcon(ICONS.png), 'PNG', 'Download PNG', async (btn) => {
      await withBtnFeedback(btn, () => downloadMermaidPng(svgEl))
    }))
    toolbar.appendChild(mkBtn(makeSvgIcon(ICONS.svg), 'SVG', 'Download SVG', () => {
      downloadMermaidSvg(svgEl)
    }))

    container.appendChild(toolbar)
  })
}

// ── Modal creation ────────────────────────────────────────────────────────────

function ensureModal(): HTMLElement {
  if (modalReady) return document.getElementById('mermaid-zoom-modal')!

  const el = document.createElement('div')
  el.id = 'mermaid-zoom-modal'

  const content = document.createElement('div')
  content.className = 'mermaid-modal-content'

  // Header
  const header = document.createElement('div')
  header.className = 'mermaid-modal-header'
  const title = document.createElement('span')
  title.textContent = 'Diagram'
  const closeBtn = document.createElement('button')
  closeBtn.id = 'mermaid-modal-close'
  closeBtn.className = 'mermaid-modal-close'
  closeBtn.title = 'Close'
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  header.appendChild(title)
  header.appendChild(closeBtn)

  // Diagram area
  const area = document.createElement('div')
  area.id = 'mermaid-modal-diagram'
  area.className = 'mermaid-modal-diagram'

  // Controls
  const controls = document.createElement('div')
  controls.className = 'mermaid-modal-controls'

  const btnZoomIn = document.createElement('button')
  btnZoomIn.className = 'mermaid-toolbar-btn'
  btnZoomIn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg><span>Zoom In</span>'
  const btnZoomOut = document.createElement('button')
  btnZoomOut.className = 'mermaid-toolbar-btn'
  btnZoomOut.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg><span>Zoom Out</span>'
  const btnReset = document.createElement('button')
  btnReset.className = 'mermaid-toolbar-btn'
  btnReset.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg><span>Reset</span>'
  const btnCopy = document.createElement('button')
  btnCopy.className = 'mermaid-toolbar-btn'
  btnCopy.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copiar PNG</span>'
  const btnPng = document.createElement('button')
  btnPng.className = 'mermaid-toolbar-btn'
  btnPng.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.71.15L14 16.5l-1.29-1.29a2 2 0 0 0-2.71.15L8.5 17H20z"/></svg><span>PNG</span>'
  const btnSvg = document.createElement('button')
  btnSvg.className = 'mermaid-toolbar-btn'
  btnSvg.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 13 7 15 9 17"/><polyline points="15 13 17 15 15 17"/></svg><span>SVG</span>'

  controls.append(btnZoomIn, btnZoomOut, btnReset, btnCopy, btnPng, btnSvg)
  content.append(header, area, controls)
  el.appendChild(content)

  // Event handlers
  el.addEventListener('click', (e) => { if (e.target === el) closeMermaidModal() })
  closeBtn.addEventListener('click', closeMermaidModal)
  btnZoomIn.addEventListener('click', () => { modalZoomScale = Math.min(modalZoomScale + 0.25, 10); applyModalTransform() })
  btnZoomOut.addEventListener('click', () => { modalZoomScale = Math.max(modalZoomScale - 0.25, 0.1); applyModalTransform() })
  btnReset.addEventListener('click', () => { modalZoomScale = 1; modalPanX = 0; modalPanY = 0; applyModalTransform() })
  btnCopy.addEventListener('click', async () => {
    if (!modalCurrentSvgEl) return
    await withBtnFeedback(btnCopy, () => copyMermaidImage(modalCurrentSvgEl!))
  })
  btnPng.addEventListener('click', async () => {
    if (!modalCurrentSvgEl) return
    await withBtnFeedback(btnPng, () => downloadMermaidPng(modalCurrentSvgEl!))
  })
  btnSvg.addEventListener('click', () => { if (modalCurrentSvgEl) downloadMermaidSvg(modalCurrentSvgEl) })

  // Wheel zoom
  area.addEventListener('wheel', (e) => {
    e.preventDefault()
    modalZoomScale = Math.min(Math.max(modalZoomScale + (e.deltaY < 0 ? 0.15 : -0.15), 0.1), 10)
    applyModalTransform()
  }, { passive: false })

  // Drag to pan
  area.addEventListener('mousedown', (e) => {
    modalIsDragging = true
    modalDragStart = { x: e.clientX - modalPanX, y: e.clientY - modalPanY }
    area.style.cursor = 'grabbing'
  })
  document.addEventListener('mousemove', (e) => {
    if (!modalIsDragging) return
    modalPanX = e.clientX - modalDragStart.x
    modalPanY = e.clientY - modalDragStart.y
    applyModalTransform()
  })
  document.addEventListener('mouseup', () => {
    if (modalIsDragging) { modalIsDragging = false; area.style.cursor = 'grab' }
  })

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMermaidModal() })
  document.body.appendChild(el)
  modalReady = true
  return el
}
