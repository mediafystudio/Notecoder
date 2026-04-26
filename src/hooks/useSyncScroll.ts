import { useRef, useCallback } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import type { PreviewRef } from '@/components/atom/Preview'

export function useSyncScroll(enabled: boolean) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const previewRef = useRef<PreviewRef>(null)
  const syncingFrom = useRef<'editor' | 'preview' | null>(null)

  const syncFromEditor = useCallback(() => {
    if (!enabled || syncingFrom.current === 'preview') return
    const scrollDOM = (editorRef.current?.view as any)?.scrollDOM as HTMLElement | undefined
    const preview = previewRef.current
    if (!scrollDOM || !preview) return
    syncingFrom.current = 'editor'
    const ratio = scrollDOM.scrollTop / (scrollDOM.scrollHeight - scrollDOM.clientHeight || 1)
    preview.setScrollTop(ratio * (preview.scrollHeight - preview.clientHeight))
    requestAnimationFrame(() => { syncingFrom.current = null })
  }, [enabled])

  const syncFromPreview = useCallback(() => {
    if (!enabled || syncingFrom.current === 'editor') return
    const scrollDOM = (editorRef.current?.view as any)?.scrollDOM as HTMLElement | undefined
    const preview = previewRef.current
    if (!scrollDOM || !preview) return
    syncingFrom.current = 'preview'
    const ratio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1)
    scrollDOM.scrollTop = ratio * (scrollDOM.scrollHeight - scrollDOM.clientHeight)
    requestAnimationFrame(() => { syncingFrom.current = null })
  }, [enabled])

  return { editorRef, previewRef, syncFromEditor, syncFromPreview }
}
