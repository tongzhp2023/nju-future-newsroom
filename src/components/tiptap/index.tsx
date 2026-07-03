'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { getExtensions } from './extensions'
import { EditorBubbleMenu } from './bubble-menu'
import Toolbar from './toolbar'
import { PageWrapper } from 'tiptap-community-pages/react'
import 'tiptap-community-pages/styles.css'
import {
  trackChangesState,
  restoreRevisionsFromDoc,
} from '@/lib/tiptap-extensions/track-changes'
import { SearchReplacePluginKey as SRKey } from '@/lib/tiptap-extensions/search-replace'
import { MARGIN_PRESETS, DEFAULT_MARGIN } from './types'
import type { TiptapEditorProps } from './types'
import type { PageMargins } from 'tiptap-community-pages'
import { TextSelection } from '@tiptap/pm/state'

export default function TiptapEditor({
  content,
  onChange,
  editable = true,
  trackChangesEnabled = false,
  authorName = 'unknown',
  onSelectionChange,
}: TiptapEditorProps) {
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const [formatPainterLocked, setFormatPainterLocked] = useState(false)
  const [painterMarks, setPainterMarks] = useState<unknown[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [margin, setMargin] = useState<(typeof MARGIN_PRESETS)[number]>(DEFAULT_MARGIN)
  const isInternalChange = useRef(false)
  const painterRef = useRef({ active: false, locked: false, marks: [] as unknown[] })

  // 右键菜单
  const [tableCtxMenu, setTableCtxMenu] = useState<{ x: number; y: number } | null>(null)

  // 内联批注浮窗
  const [inlineAnnotation, setInlineAnnotation] = useState<{
    show: boolean; top: number; left: number; text: string; from: number; to: number
  } | null>(null)

  // 同步 painterRef
  useEffect(() => {
    painterRef.current = { active: formatPainterActive, locked: formatPainterLocked, marks: painterMarks }
  }, [formatPainterActive, formatPainterLocked, painterMarks])

  const editor = useEditor({
    extensions: getExtensions({ trackChangesEnabled, authorName }),
    content: content || undefined,
    editable,
    editorProps: {
      handleDOMEvents: {
        // 格式刷：在 mouseup 时应用格式（支持拖拽选区）
        mouseup: (view, event) => {
          const { active, locked, marks } = painterRef.current
          if (!active || marks.length === 0) return false
          // 延迟一帧，等 ProseMirror 更新选区
          requestAnimationFrame(() => {
            const { from, to } = view.state.selection
            if (from === to) return // 没有选区
            const tr = view.state.tr
            for (const mark of marks) {
              const m = mark as { type: { name: string }; attrs?: Record<string, unknown> }
              try { tr.addMark(from, to, view.state.schema.marks[m.type.name]?.create(m.attrs)) } catch { /* skip */ }
            }
            view.dispatch(tr)
            if (!locked) {
              setFormatPainterActive(false)
              setFormatPainterLocked(false)
              setPainterMarks([])
            }
          })
          return false
        },
        // 表格右键菜单
        contextmenu: (view, event) => {
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (pos) {
            const node = view.state.doc.nodeAt(pos.pos)
            if (node?.type.name === 'table' || node?.type.name === 'tableCell' || node?.type.name === 'tableHeader' || node?.type.name === 'tableRow') {
              event.preventDefault()
              // 聚焦到表格内的位置
              const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos.pos)))
              view.dispatch(tr)
              setTableCtxMenu({ x: event.clientX, y: event.clientY })
            }
          }
          return false
        },
      },
      handleClick: () => {
        setTableCtxMenu(null)
        return false
      },
    },
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
        const editorDOM = view.dom.closest('.ctp-pages-breaks')
        if (editorDOM) {
          const rect = editorDOM.getBoundingClientRect()
          setInlineAnnotation({
            show: true,
            top: end.bottom - rect.top + editorDOM.scrollTop + 4,
            left: (start.left + end.left) / 2 - rect.left,
            text, from, to,
          })
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

  // 暴露 editor + 恢复修订记录
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

  // 外部 content 变化同步
  const initialContentRef = useRef(content)
  useEffect(() => {
    if (!editor || !content) return
    if (isInternalChange.current) { isInternalChange.current = false; initialContentRef.current = content; return }
    if (content === initialContentRef.current) return
    editor.commands.setContent(content)
    initialContentRef.current = content
  }, [editor, content])

  // ---- 格式刷：单击取样+双击锁定 ----
  const paintClickTimer = useRef(0)
  const activateFormatPainter = useCallback(() => {
    if (!editor) return
    // 如果已激活，取消它（toggle）
    if (formatPainterActive) {
      setFormatPainterActive(false)
      setFormatPainterLocked(false)
      setPainterMarks([])
      return
    }
    const now = Date.now()
    // 检测双击（500ms 内再次触发）
    if (now - paintClickTimer.current < 500) {
      // 双击：取样并锁定
      const { from } = editor.state.selection
      const resolved = editor.state.doc.resolve(from)
      const marks = resolved.marks()
      if (marks.length === 0) return
      setPainterMarks([...marks])
      setFormatPainterActive(true)
      setFormatPainterLocked(true)
      paintClickTimer.current = 0
      return
    }
    paintClickTimer.current = now
    // 单击：取样
    const { from } = editor.state.selection
    const resolved = editor.state.doc.resolve(from)
    const marks = resolved.marks()
    if (marks.length === 0) return
    setPainterMarks([...marks])
    setFormatPainterActive(true)
    setFormatPainterLocked(false)
  }, [editor, formatPainterActive])

  // ESC 退出格式刷
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormatPainterActive(false)
        setFormatPainterLocked(false)
        setPainterMarks([])
        setTableCtxMenu(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ---- 链接 ----
  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('输入链接地址', previousUrl)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  // ---- 图片上传 ----
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addImage = useCallback(() => { fileInputRef.current?.click() }, [])
  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const url = URL.createObjectURL(file)
    editor.chain().focus().setImage({ src: url }).run()
    e.target.value = ''
  }, [editor])

  // 粘贴图片
  useEffect(() => {
    if (!editor) return
    const handler = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const url = URL.createObjectURL(file)
            editor.chain().focus().setImage({ src: url }).run()
          }
        }
      }
    }
    const dom = editor.view.dom
    dom.addEventListener('paste', handler)
    return () => dom.removeEventListener('paste', handler)
  }, [editor])

  // ---- 附件上传 ----
  const attachInputRef = useRef<HTMLInputElement>(null)
  const addAttachment = useCallback(() => { attachInputRef.current?.click() }, [])
  const handleAttachmentFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const url = URL.createObjectURL(file)
    const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`
    editor.chain().focus().setAttachment({ name: file.name, url, size, fileType: file.type || '未知类型' }).run()
    e.target.value = ''
  }, [editor])

  // ---- 查找替换 ----
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
    if (replacements.length === 0) { alert('未找到匹配内容'); return }
    const tr = editor.state.tr
    for (let i = replacements.length - 1; i >= 0; i--) {
      tr.delete(replacements[i].from, replacements[i].to).insertText(replaceTerm || '', replacements[i].from)
    }
    editor.view.dispatch(tr)
    setShowSearch(false)
  }, [editor, searchTerm, replaceTerm])

  // ---- 页边距切换 ----
  const handleMarginChange = useCallback((preset: (typeof MARGIN_PRESETS)[number]) => {
    setMargin(preset)
    editor?.commands.setMargins?.({ top: preset.top, bottom: preset.bottom, left: preset.left, right: preset.right })
  }, [editor])

  // ---- 内联批注 ----
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

  const marginObj: Partial<PageMargins> = {
    top: margin.top, bottom: margin.bottom, left: margin.left, right: margin.right,
  }

  return (
    <div className="flex flex-col h-full">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input ref={attachInputRef} type="file" className="hidden" onChange={handleAttachmentFile} />

      {editable && (
        <Toolbar
          editor={editor}
          trackChangesEnabled={trackChangesEnabled}
          onFormatPainter={activateFormatPainter}
          onAddLink={addLink}
          onAddImage={addImage}
          onAddAttachment={addAttachment}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onMarginChange={handleMarginChange}
          currentMargin={margin}
          formatPainterActive={formatPainterActive}
        />
      )}
      {showSearch && editable && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <input type="text" placeholder="查找…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-36 border border-[var(--border)] rounded px-2 py-1 text-xs bg-[var(--surface)] text-[var(--foreground)]" />
          <input type="text" placeholder="替换为…" value={replaceTerm} onChange={e => setReplaceTerm(e.target.value)}
            className="w-36 border border-[var(--border)] rounded px-2 py-1 text-xs bg-[var(--surface)] text-[var(--foreground)]" />
          <button onClick={performReplaceAll} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">全部替换</button>
          <button onClick={() => { setShowSearch(false); setSearchTerm(''); setReplaceTerm('') }} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">关闭</button>
        </div>
      )}

      {/* A4 分页编辑区 */}
      <div className="flex-1 overflow-y-auto editor-scroll-area relative bg-gray-100 dark:bg-gray-900"
        style={{ cursor: formatPainterActive ? 'crosshair' : undefined }}>
        <PageWrapper
          format="A4"
          orientation="portrait"
          margins={marginObj}
          showShadow
          containerClassName="flex justify-center"
          scale={1}
        >
          <EditorContent
            editor={editor}
            className="prose prose-base max-w-none dark:prose-invert
              [&_.tiptap]:outline-none [&_.tiptap]:ring-0 [&_.tiptap]:border-0
              [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-0
              [&_.ProseMirror-focused]:outline-none [&_.ProseMirror-focused]:ring-0 [&_.ProseMirror-focused]:shadow-none
              [&_:focus]:outline-none [&_:focus-visible]:outline-none
              [&_.tiptap]:min-h-[500px]
              [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
              [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2
              [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:mt-3 [&_h5]:mb-1
              [&_h6]:text-xs [&_h6]:font-semibold [&_h6]:mt-2 [&_h6]:mb-1
              [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:!pl-0
              [&_li[data-type=taskItem]]:!flex [&_li[data-type=taskItem]]:!items-start [&_li[data-type=taskItem]]:gap-2
              [&_li[data-type=taskItem]_div]:!flex-1
              [&_li[data-type=taskItem]_label]:!inline-flex [&_li[data-type=taskItem]_label]:!items-center
              [&_table]:border-collapse [&_table]:w-full [&_table]:my-4
              [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-sm
              [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
              [&_.selectedCell]:bg-blue-50 dark:[&_.selectedCell]:bg-blue-900/20
            "
          />
          {editor && <EditorBubbleMenu editor={editor} onAddLink={addLink} onFormatPainter={activateFormatPainter} />}
        </PageWrapper>

        {/* 表格右键菜单 */}
        {tableCtxMenu && (
          <div className="fixed z-50 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: tableCtxMenu.x, top: tableCtxMenu.y }}>
            {[
              ['上方插入行', () => { editor?.chain().focus().addRowBefore().run(); setTableCtxMenu(null) }],
              ['下方插入行', () => { editor?.chain().focus().addRowAfter().run(); setTableCtxMenu(null) }],
              ['左侧插入列', () => { editor?.chain().focus().addColumnBefore().run(); setTableCtxMenu(null) }],
              ['右侧插入列', () => { editor?.chain().focus().addColumnAfter().run(); setTableCtxMenu(null) }],
              ['---'],
              ['删除行', () => { editor?.chain().focus().deleteRow().run(); setTableCtxMenu(null) }],
              ['删除列', () => { editor?.chain().focus().deleteColumn().run(); setTableCtxMenu(null) }],
              ['---'],
              ['合并单元格', () => { editor?.chain().focus().mergeCells().run(); setTableCtxMenu(null) }],
              ['拆分单元格', () => { editor?.chain().focus().splitCell().run(); setTableCtxMenu(null) }],
              ['---'],
              ['删除表格', () => { editor?.chain().focus().deleteTable().run(); setTableCtxMenu(null) }],
            ].map((item, i) => item[0] === '---' ? (
              <div key={i} className="h-px bg-[var(--border)] my-1" />
            ) : (
              (() => { const [label, fn] = item as [string, () => void]; return (
              <button key={i} type="button" className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition text-[var(--foreground)]"
                onClick={fn}>{label}</button>
              )})()
            ))}
          </div>
        )}

        {/* 内联批注浮窗 */}
        {inlineAnnotation?.show && editable && (
          <div className="absolute z-40 flex items-center gap-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-1 py-0.5"
            style={{ top: inlineAnnotation.top, left: Math.max(inlineAnnotation.left - 60, 8), pointerEvents: 'auto' }}>
            <button onClick={() => {
              const commentText = window.prompt('输入批注内容')
              if (commentText?.trim()) submitInlineComment(commentText.trim())
            }} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)]" title="添加批注">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>注¹
            </button>
            <span className="w-px h-4 bg-[var(--border)]" />
            <span className="px-2 py-1 text-[11px] text-[var(--muted)]">{inlineAnnotation.text.length} 字</span>
          </div>
        )}
      </div>
    </div>
  )
}
