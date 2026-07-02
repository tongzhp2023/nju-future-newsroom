'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { getExtensions } from './extensions'
import { EditorBubbleMenu } from './bubble-menu'
import Toolbar from './toolbar'
import {
  trackChangesState,
  restoreRevisionsFromDoc,
} from '@/lib/tiptap-extensions/track-changes'
import { SearchReplacePluginKey as SRKey } from '@/lib/tiptap-extensions/search-replace'
import type { TiptapEditorProps } from './types'

export default function TiptapEditor({
  content,
  onChange,
  editable = true,
  trackChangesEnabled = false,
  authorName = 'unknown',
  onSelectionChange,
}: TiptapEditorProps) {
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const [painterMarks, setPainterMarks] = useState<unknown[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [codeView, setCodeView] = useState(false)
  const isInternalChange = useRef(false)

  // 内联批注浮窗
  const [inlineAnnotation, setInlineAnnotation] = useState<{
    show: boolean; top: number; left: number; text: string; from: number; to: number
  } | null>(null)

  const editor = useEditor({
    extensions: getExtensions({ trackChangesEnabled, authorName }),
    content: content || undefined,
    editable,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      if (onChange) {
        const json = editor.getJSON()
        const text = editor.getText()
        onChange(json as Record<string, unknown>, text)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ')
        if (onSelectionChange) onSelectionChange(text, from, to)

        const view = editor.view
        const start = view.coordsAtPos(from)
        const end = view.coordsAtPos(to)
        const editorDOM = view.dom.closest('.editor-scroll-area')
        if (editorDOM) {
          const rect = editorDOM.getBoundingClientRect()
          setInlineAnnotation({
            show: true,
            top: end.bottom - rect.top + editorDOM.scrollTop + 4,
            left: (start.left + end.left) / 2 - rect.left,
            text, from, to,
          })
        }

        if (formatPainterActive && painterMarks.length > 0) {
          editor.chain().focus().setTextSelection({ from, to }).unsetAllMarks().run()
          for (const mark of painterMarks) {
            const m = mark as { type: { name: string }; attrs?: Record<string, unknown> }
            try { editor.chain().focus().setMark(m.type.name, m.attrs).run() } catch { /* skip */ }
          }
          setFormatPainterActive(false)
          setPainterMarks([])
        }
      } else {
        setInlineAnnotation(null)
        if (onSelectionChange) onSelectionChange('', 0, 0)
      }
    },
    immediatelyRender: false,
  })

  // 同步 TrackChanges 状态
  useEffect(() => {
    trackChangesState.enabled = trackChangesEnabled
    trackChangesState.author = authorName
  }, [trackChangesEnabled, authorName])

  // 暴露 editor 到 window / 恢复修订记录
  const restoredRef = useRef(false)
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__tiptapEditor = editor
      if (!restoredRef.current) {
        restoreRevisionsFromDoc(editor)
        restoredRef.current = true
      }
    }
    return () => {
      if (typeof window !== 'undefined') delete (window as unknown as Record<string, unknown>).__tiptapEditor
    }
  }, [editor])

  // 外部 content 变化时同步
  const initialContentRef = useRef(content)
  useEffect(() => {
    if (!editor || !content) return
    if (isInternalChange.current) { isInternalChange.current = false; initialContentRef.current = content; return }
    if (content === initialContentRef.current) return
    editor.commands.setContent(content)
    initialContentRef.current = content
  }, [editor, content])

  // 格式刷
  const activateFormatPainter = useCallback(() => {
    if (!editor) return
    const { from } = editor.state.selection
    const resolved = editor.state.doc.resolve(from)
    const marks = resolved.marks()
    setPainterMarks([...marks])
    setFormatPainterActive(true)
  }, [editor])

  // 插入链接
  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('输入链接地址', previousUrl)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  // 插入图片
  const addImage = useCallback(() => {
    const url = window.prompt('输入图片链接')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  // 插入视频
  const addVideo = useCallback(() => {
    const url = window.prompt('输入视频链接')
    if (url && editor) editor.chain().focus().setVideo({ src: url }).run()
  }, [editor])

  // 插入嵌入网页
  const addIframe = useCallback(() => {
    const url = window.prompt('输入嵌入网页链接')
    if (url && editor) editor.chain().focus().setIframe({ src: url }).run()
  }, [editor])

  // 插入附件
  const addAttachment = useCallback(() => {
    const url = window.prompt('输入附件链接')
    if (!url || !editor) return
    const name = window.prompt('输入附件名称', '附件文件') || '附件文件'
    editor.chain().focus().setAttachment({ name, url }).run()
  }, [editor])

  // 查找替换
  const performSearch = useCallback(() => {
    if (!editor) return
    const tr = editor.state.tr.setMeta(SRKey, { searchTerm, replaceTerm, results: [] })
    editor.view.dispatch(tr)
  }, [editor, searchTerm, replaceTerm])

  const performReplaceAll = useCallback(() => {
    if (!editor || !searchTerm) return
    const { doc } = editor.state
    const replacements: { from: number; to: number }[] = []
    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text || ''
        const lower = text.toLowerCase()
        const searchLower = searchTerm.toLowerCase()
        let idx = 0
        while ((idx = lower.indexOf(searchLower, idx)) !== -1) {
          replacements.push({ from: pos + idx, to: pos + idx + searchLower.length })
          idx += searchLower.length
        }
      }
    })
    const tr = editor.state.tr
    for (let i = replacements.length - 1; i >= 0; i--) {
      tr.delete(replacements[i].from, replacements[i].to).insertText(replaceTerm || '', replacements[i].from)
    }
    editor.view.dispatch(tr)
    setShowSearch(false)
  }, [editor, searchTerm, replaceTerm])

  // 内联批注
  const submitInlineComment = useCallback((commentText: string) => {
    if (!editor || !inlineAnnotation) return
    const { from, to } = inlineAnnotation
    const commentId = `comment-${Date.now()}`
    editor.chain().focus()
      .setTextSelection({ from, to })
      .setMark('commentMark', { commentId, author: authorName })
      .setTextSelection(to)
      .run()
    setInlineAnnotation(null)
    window.dispatchEvent(new CustomEvent('tiptap:comment-added', {
      detail: { commentId, selectedText: inlineAnnotation.text, commentText },
    }))
  }, [editor, inlineAnnotation, authorName])

  if (!editor) {
    return <div className="flex-1 flex items-center justify-center text-[var(--muted)]">编辑器加载中…</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      {editable && (
        <Toolbar
          editor={editor}
          trackChangesEnabled={trackChangesEnabled}
          onFormatPainter={activateFormatPainter}
          onAddLink={addLink}
          onAddImage={addImage}
          onAddVideo={addVideo}
          onAddIframe={addIframe}
          onAddAttachment={addAttachment}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onToggleCodeView={() => setCodeView(!codeView)}
          formatPainterActive={formatPainterActive}
        />
      )}

      {/* 查找替换栏 */}
      {showSearch && editable && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <input
            type="text" placeholder="查找…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-40 border border-[var(--border)] rounded px-2 py-1 text-xs bg-[var(--surface)] text-[var(--foreground)]"
          />
          <input
            type="text" placeholder="替换为…" value={replaceTerm}
            onChange={e => setReplaceTerm(e.target.value)}
            className="w-40 border border-[var(--border)] rounded px-2 py-1 text-xs bg-[var(--surface)] text-[var(--foreground)]"
          />
          <button onClick={performSearch} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">查找</button>
          <button onClick={performReplaceAll} className="text-xs px-2 py-1 border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition text-[var(--foreground)]">全部替换</button>
          <button onClick={() => { setShowSearch(false); setSearchTerm(''); setReplaceTerm('') }} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">关闭</button>
        </div>
      )}

      {/* 编辑器内容区 — Word 风格：灰底白页 */}
      <div className="flex-1 overflow-y-auto editor-scroll-area relative bg-gray-100 dark:bg-gray-900" style={{ cursor: formatPainterActive ? 'crosshair' : undefined }}>
        <div className="max-w-4xl mx-auto my-8 bg-white dark:bg-gray-950 shadow-md border border-gray-200 dark:border-gray-800 rounded-sm min-h-[800px] px-10 py-10">
          {codeView ? (
            <pre className="text-xs font-mono bg-[var(--surface-raised)] p-4 rounded-lg overflow-auto max-h-full whitespace-pre-wrap text-[var(--foreground)]">
              {JSON.stringify(editor.getJSON(), null, 2)}
            </pre>
          ) : (
            <>
              <EditorContent
                editor={editor}
                className="prose prose-base max-w-none dark:prose-invert [&_.tiptap]:outline-none [&_.tiptap]:ring-0 [&_.tiptap]:border-0 [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-0 [&_.ProseMirror-focused]:outline-none [&_.ProseMirror-focused]:ring-0 [&_.ProseMirror-focused]:border-0 [&_.ProseMirror-focused]:shadow-none [&_:focus]:outline-none [&_:focus-visible]:outline-none [&_.tiptap]:min-h-[500px] [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-sm [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_.selectedCell]:bg-blue-50 dark:[&_.selectedCell]:bg-blue-900/20"
              />
              {editor && <EditorBubbleMenu editor={editor} onAddLink={addLink} />}
            </>
          )}
        </div>

        {/* 内联批注浮窗 */}
        {inlineAnnotation?.show && editable && (
          <div
            className="absolute z-40 flex items-center gap-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-1 py-0.5"
            style={{ top: inlineAnnotation.top, left: Math.max(inlineAnnotation.left - 80, 8), pointerEvents: 'auto' }}
          >
            <button
              onClick={() => {
                const commentText = window.prompt('输入批注内容')
                if (commentText?.trim()) submitInlineComment(commentText.trim())
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)]"
              title="添加批注"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              注¹
            </button>
            <span className="w-px h-4 bg-[var(--border)]" />
            <button onClick={addLink} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)]" title="插入链接">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <span className="w-px h-4 bg-[var(--border)]" />
            <span className="px-2 py-1 text-[11px] text-[var(--muted)]">{inlineAnnotation.text.length} 字</span>
          </div>
        )}
      </div>
    </div>
  )
}
