'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  TrackInsert,
  TrackDelete,
  TrackChanges,
  CommentMark,
  trackChangesState,
  restoreRevisionsFromDoc,
} from '@/lib/tiptap-extensions/track-changes'
import { Indent } from '@/lib/tiptap-extensions/indent'

// ============================================
// 类型和常量
// ============================================

export interface TiptapEditorProps {
  content?: Record<string, unknown> | null
  onChange?: (json: Record<string, unknown>, text: string) => void
  editable?: boolean
  trackChangesEnabled?: boolean
  authorName?: string
  onSelectionChange?: (selectedText: string, from: number, to: number) => void
}

const FONT_SIZES = ['9', '10', '11', '12', '14', '16', '18', '22', '24', '30', '36']

// 学城同款 7×10 颜色表（从上图提取）
const COLOR_PALETTE = [
  // Row 1: 黑灰白
  '#000000', '#262626', '#595959', '#8C8C8C', '#BFBFBF', '#D9D9D9', '#E8E8E8', '#F5F5F5', '#FAFAFA', '#FFFFFF',
  // Row 2: 鲜亮色
  '#F5222D', '#FA8C16', '#FADB14', '#52C41A', '#13C2C2', '#1890FF', '#722ED1', '#EB2F96', '#FFD666', '#FF85C0',
  // Row 3: 浅色
  '#FFF1F0', '#FFF7E6', '#FEFFE6', '#F6FFED', '#E6FFFB', '#E6F7FF', '#F9F0FF', '#FFF0F6', '#FFFBE6', '#FFE6F0',
  // Row 4: 淡色
  '#FFCCC7', '#FFE7BA', '#FFFB8F', '#B7EB8F', '#87E8DE', '#91D5FF', '#D3ADF7', '#FFADD2', '#FFE58F', '#FFB8D2',
  // Row 5: 中等色
  '#FF7875', '#FFC069', '#FFF566', '#95DE64', '#5CDBD3', '#69C0FF', '#B37FEB', '#FF85C0', '#FFD666', '#FF9EC7',
  // Row 6: 深色
  '#FF4D4F', '#FFA940', '#FFEC3D', '#73D13D', '#36CFC9', '#40A9FF', '#9254DE', '#F759AB', '#FFC53D', '#FF7AAE',
  // Row 7: 最深色
  '#CF1322', '#D46B08', '#D4B106', '#389E0D', '#08979C', '#096DD9', '#531DAB', '#C41D7F', '#D48806', '#C41D68',
]

// ============================================
// 主编辑器组件
// ============================================

export default function TiptapEditor({
  content,
  onChange,
  editable = true,
  trackChangesEnabled = false,
  authorName = 'unknown',
  onSelectionChange,
}: TiptapEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [tableGrid, setTableGrid] = useState({ rows: 0, cols: 0 })
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const [painterMarks, setPainterMarks] = useState<unknown[]>([])
  const toolbarRef = useRef<HTMLDivElement>(null)

  // 内联批注浮窗
  const [inlineAnnotation, setInlineAnnotation] = useState<{
    show: boolean
    top: number
    left: number
    text: string
    from: number
    to: number
  } | null>(null)

  // 标记编辑器自身 onUpdate 产生的变更，防止 content prop 回写导致 setContent 重置光标
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({ placeholder: '开始撰写你的稿件…' }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg my-4' },
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyleKit,
      Indent,
      TrackInsert,
      TrackDelete,
      CommentMark,
      TrackChanges.configure({ enabled: trackChangesEnabled, author: authorName }),
    ],
    content: content || undefined,
    editable,
    onUpdate: ({ editor }) => {
      // 标记为编辑器内部变更，防止 content prop 回写导致 setContent 重置光标
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

        // 获取选区在视口中的位置，展示内联批注浮窗
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
            text,
            from,
            to,
          })
        }

        // 格式刷应用
        if (formatPainterActive && painterMarks.length > 0) {
          editor.chain().focus()
            .setTextSelection({ from, to })
            .unsetAllMarks()
            .run()
          for (const mark of painterMarks) {
            const m = mark as { type: { name: string }; attrs?: Record<string, unknown> }
            try { editor.chain().focus().setMark(m.type.name, m.attrs).run() } catch { /* skip unsupported marks */ }
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

  // 同步 TrackChanges 启用状态到共享状态对象（修复 Bug 3：插件始终注册，通过共享状态动态控制开关）
  useEffect(() => {
    trackChangesState.enabled = trackChangesEnabled
    trackChangesState.author = authorName
  }, [trackChangesEnabled, authorName])

  // 暴露 editor 实例到 window，方便调试和自动化测试
  // 同时从文档 marks 恢复修订记录（持久化恢复）
  const restoredRef = useRef(false)
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__tiptapEditor = editor
      // 首次创建时从文档 marks 恢复修订记录
      if (!restoredRef.current) {
        restoreRevisionsFromDoc(editor)
        restoredRef.current = true
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__tiptapEditor
      }
    }
  }, [editor])

  // 外部 content prop 变化时更新编辑器（Word 上传场景）
  // 问题：onUpdate → onChange → 父组件 setContent → content prop 变化 →
  //       useEffect 触发 setContent → 光标跳到末尾
  // 修复：用 ref 标记编辑器自身产生的变更，跳过这些变更
  const initialContentRef = useRef(content)
  useEffect(() => {
    if (!editor || !content) return
    // 编辑器自身 onUpdate 产生的 content 变化，跳过
    if (isInternalChange.current) {
      isInternalChange.current = false
      initialContentRef.current = content
      return
    }
    // 跳过首次渲染时传入的初始 content（useEditor 已加载）
    if (content === initialContentRef.current) return
    editor.commands.setContent(content)
    initialContentRef.current = content
  }, [editor, content])

  // 点击外部关闭所有下拉菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleDropdown = useCallback((name: string) => {
    setActiveDropdown(prev => prev === name ? null : name)
  }, [])

  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('输入链接地址', previousUrl)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt('输入图片链接')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  // 格式刷
  const activateFormatPainter = useCallback(() => {
    if (!editor) return
    const { from } = editor.state.selection
    const resolved = editor.state.doc.resolve(from)
    const marks = resolved.marks()
    setPainterMarks([...marks])
    setFormatPainterActive(true)
  }, [editor])

  // 内联批注提交
  const submitInlineComment = useCallback((commentText: string) => {
    if (!editor || !inlineAnnotation) return
    const { from, to, text } = inlineAnnotation
    const commentId = `comment-${Date.now()}`
    editor.chain().focus()
      .setTextSelection({ from, to })
      .setMark('commentMark', { commentId, author: authorName })
      .setTextSelection(to)
      .run()
    setInlineAnnotation(null)
    window.dispatchEvent(new CustomEvent('tiptap:comment-added', {
      detail: { commentId, selectedText: text, commentText }
    }))
  }, [editor, inlineAnnotation, authorName])

  if (!editor) {
    return <div className="flex-1 flex items-center justify-center text-[var(--muted)]">编辑器加载中…</div>
  }

  // 获取当前文本格式 (正文 / H1-H6)
  const currentHeading = (() => {
    for (let l = 1; l <= 6; l++) {
      if (editor.isActive('heading', { level: l })) return `标题 ${l}`
    }
    return '正文'
  })()

  // 获取当前字号
  // Bug 1 修复：未设置 fontSize 时从 DOM 计算样式获取实际字号
  const currentFontSize = (() => {
    const explicit = editor.getAttributes('textStyle').fontSize?.replace('px', '')
    if (explicit) return explicit
    // 获取 ProseMirror DOM 的实际计算字号
    try {
      const el = editor.view.dom as HTMLElement
      const computed = window.getComputedStyle(el).fontSize
      return computed ? Math.round(parseFloat(computed)).toString() : '16'
    } catch {
      return '16'
    }
  })()

  return (
    <div className="flex flex-col h-full">
      {/* ═══════ 工具栏（单行，复刻学城设计）═══════ */}
      {editable && (
        <div ref={toolbarRef} className="shrink-0 flex items-center gap-0.5 px-2 py-1 border-b border-[var(--border)] bg-[var(--surface)] flex-wrap min-h-[40px]" onClick={e => e.stopPropagation()}>

          {/* 撤销 / 重做 */}
          <Btn icon={<UndoIcon />} title="撤销" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
          <Btn icon={<RedoIcon />} title="重做" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />

          <Sep />

          {/* 格式刷 */}
          <Btn icon={<FormatPainterIcon />} title="格式刷" onClick={activateFormatPainter} active={formatPainterActive} />
          {/* 清除格式 */}
          <Btn icon={<ClearFormatIcon />} title="清除格式" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />

          <Sep />

          {/* 文本格式（正文 / 标题） */}
          <Dropdown name="heading" label={currentHeading} active={activeDropdown} toggle={toggleDropdown} width="w-36">
            <DropItem label="正文" onClick={() => { editor.chain().focus().setParagraph().run(); setActiveDropdown(null) }} active={!editor.isActive('heading')} />
            {([1, 2, 3, 4, 5, 6] as const).map(l => (
              <DropItem key={l} label={`标题 ${l}`} className={`font-bold ${l <= 2 ? 'text-base' : l <= 4 ? 'text-sm' : 'text-xs'}`}
                onClick={() => { editor.chain().focus().toggleHeading({ level: l }).run(); setActiveDropdown(null) }}
                active={editor.isActive('heading', { level: l })} />
            ))}
          </Dropdown>

          <Sep />

          {/* 字号 */}
          <Dropdown name="fontSize" label={currentFontSize} active={activeDropdown} toggle={toggleDropdown} width="w-16">
            {FONT_SIZES.map(s => (
              <DropItem key={s} label={s} onClick={() => { editor.chain().focus().setFontSize(`${s}px`).run(); setActiveDropdown(null) }}
                active={currentFontSize === s} />
            ))}
          </Dropdown>

          <Sep />

          {/* 粗体 / 斜体 / 删除线 / 下划线 */}
          <Btn icon={<b>B</b>} title="粗体" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
          <Btn icon={<i>I</i>} title="斜体" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
          <Btn icon={<s className="text-xs">S</s>} title="删除线" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} />
          <Btn icon={<u className="text-xs">U</u>} title="下划线" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />

          {/* 文字颜色 */}
          <Dropdown name="textColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
            label={<span className="flex flex-col items-center leading-none">
              <span className="text-xs font-semibold">A</span>
              <span className="w-4 h-1 rounded-sm mt-px" style={{ background: editor.getAttributes('textStyle').color || '#000' }} />
            </span>}>
            <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setColor(c).run(); setActiveDropdown(null) }} />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] border-t border-[var(--border-light)]"
              onClick={() => { editor.chain().focus().unsetColor().run(); setActiveDropdown(null) }}>
              <span className="w-4 h-4 rounded bg-black" /> 恢复默认
            </button>
          </Dropdown>

          {/* 背景色 */}
          <Dropdown name="bgColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
            label={<span className="flex flex-col items-center leading-none">
              <span className="w-4 h-4 rounded text-[10px] flex items-center justify-center font-semibold border border-[var(--border-light)]" style={{ background: editor.getAttributes('textStyle').backgroundColor || '#FFEC3D' }}>A</span>
            </span>}>
            <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setBackgroundColor(c).run(); setActiveDropdown(null) }} />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] border-t border-[var(--border-light)]"
              onClick={() => { editor.chain().focus().unsetBackgroundColor().run(); setActiveDropdown(null) }}>
              <span className="w-4 h-4 rounded bg-white border border-gray-300" /> 恢复默认
            </button>
          </Dropdown>

          {/* 上标 / 下标 */}
          <Dropdown name="subSup" active={activeDropdown} toggle={toggleDropdown} width="w-28"
            label={<span className="text-xs">X<sub>2</sub></span>}>
            <DropItem label="X² 上标" onClick={() => { editor.chain().focus().toggleSuperscript().run(); setActiveDropdown(null) }} active={editor.isActive('superscript')} />
            <DropItem label="X₂ 下标" onClick={() => { editor.chain().focus().toggleSubscript().run(); setActiveDropdown(null) }} active={editor.isActive('subscript')} />
          </Dropdown>

          <Sep />

          {/* 对齐方式 */}
          <Dropdown name="align" active={activeDropdown} toggle={toggleDropdown} width="w-32"
            label={<AlignIcon type={editor.isActive({ textAlign: 'center' }) ? 'center' : editor.isActive({ textAlign: 'right' }) ? 'right' : editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left'} />}>
            <DropItem icon={<AlignIcon type="left" />} label="左对齐" onClick={() => { editor.chain().focus().setTextAlign('left').run(); setActiveDropdown(null) }} active={editor.isActive({ textAlign: 'left' })} />
            <DropItem icon={<AlignIcon type="center" />} label="居中对齐" onClick={() => { editor.chain().focus().setTextAlign('center').run(); setActiveDropdown(null) }} active={editor.isActive({ textAlign: 'center' })} />
            <DropItem icon={<AlignIcon type="right" />} label="右对齐" onClick={() => { editor.chain().focus().setTextAlign('right').run(); setActiveDropdown(null) }} active={editor.isActive({ textAlign: 'right' })} />
            <DropItem icon={<AlignIcon type="justify" />} label="两端对齐" onClick={() => { editor.chain().focus().setTextAlign('justify').run(); setActiveDropdown(null) }} active={editor.isActive({ textAlign: 'justify' })} />
          </Dropdown>

          <Sep />

          {/* 列表 */}
          <Btn icon={<UlIcon />} title="无序列表" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
          <Btn icon={<OlIcon />} title="有序列表" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
          <Btn icon={<TaskIcon />} title="任务列表" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} />

          {/* 减少缩进 / 增加缩进 — Bug 2 修复：支持普通段落缩进 */}
          <Btn icon={<OutdentIcon />} title="减少缩进" onClick={() => {
            if (editor.can().liftListItem('listItem')) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              editor.chain().focus().outdent().run()
            }
          }} />
          <Btn icon={<IndentIcon />} title="增加缩进" onClick={() => {
            if (editor.can().sinkListItem('listItem')) {
              editor.chain().focus().sinkListItem('listItem').run()
            } else {
              editor.chain().focus().indent().run()
            }
          }} />

          <Sep />

          {/* 表格 */}
          <Dropdown name="table" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
            label={<TableGridIcon />}>
            <div className="p-2">
              <p className="text-xs font-medium text-[var(--foreground)] mb-2">表格</p>
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
                onMouseLeave={() => setTableGrid({ rows: 0, cols: 0 })}>
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6) + 1
                  const c = (i % 6) + 1
                  return (
                    <button key={i}
                      className={`w-5 h-5 rounded-sm border transition ${r <= tableGrid.rows && c <= tableGrid.cols ? 'bg-blue-500 border-blue-400' : 'bg-[var(--surface)] border-[var(--border-light)] hover:border-blue-300'}`}
                      onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
                      onClick={() => { editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setActiveDropdown(null); setTableGrid({ rows: 0, cols: 0 }) }}
                    />
                  )
                })}
              </div>
              {tableGrid.rows > 0 && <p className="text-[11px] text-center text-[var(--muted)] mt-1.5">{tableGrid.cols} × {tableGrid.rows}</p>}
            </div>
          </Dropdown>

          {/* 图片 */}
          <Btn icon={<ImageIcon />} title="图片" onClick={addImage} />
          {/* 超链接 */}
          <Btn icon={<LinkIcon />} title="超链接" onClick={addLink} active={editor.isActive('link')} />

          {/* 更多 */}
          <Dropdown name="more" active={activeDropdown} toggle={toggleDropdown} width="w-40" label={<MoreIcon />}>
            <DropItem icon={<QuoteIcon />} label="引用" onClick={() => { editor.chain().focus().toggleBlockquote().run(); setActiveDropdown(null) }} active={editor.isActive('blockquote')} />
            <DropItem icon={<CodeIcon />} label="代码块" onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setActiveDropdown(null) }} active={editor.isActive('codeBlock')} />
            <DropItem icon={<HrIcon />} label="水平线" onClick={() => { editor.chain().focus().setHorizontalRule().run(); setActiveDropdown(null) }} />
            <DropItem icon={<InlineCodeIcon />} label="行内代码" onClick={() => { editor.chain().focus().toggleCode().run(); setActiveDropdown(null) }} active={editor.isActive('code')} />
          </Dropdown>

          {/* 修订模式标记 */}
          {trackChangesEnabled && (
            <>
              <Sep />
              <span className="px-2 py-0.5 rounded text-[11px] bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                修订中
              </span>
            </>
          )}
        </div>
      )}

      {/* ═══════ 编辑器内容区 — 唯一可滚动区域 ═══════ */}
      <div className="flex-1 overflow-y-auto editor-scroll-area relative" style={{ cursor: formatPainterActive ? 'crosshair' : undefined }}>
        <div className="max-w-3xl mx-auto px-8 py-6">
          <EditorContent
            editor={editor}
            className="prose prose-base max-w-none focus:outline-none dark:prose-invert [&_.tiptap]:outline-none [&_.tiptap]:min-h-[500px] [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0"
          />
        </div>

        {/* ═══════ 内联批注浮窗（学城同款）═══════ */}
        {inlineAnnotation?.show && editable && (
          <InlineAnnotationBar
            top={inlineAnnotation.top}
            left={inlineAnnotation.left}
            wordCount={inlineAnnotation.text.length}
            onComment={() => {
              const commentText = window.prompt('输入批注内容')
              if (commentText?.trim()) submitInlineComment(commentText.trim())
            }}
            onLink={addLink}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// 内联批注浮窗（选中文字后出现在下方）
// ============================================

function InlineAnnotationBar({ top, left, wordCount, onComment, onLink }: {
  top: number; left: number; wordCount: number; onComment: () => void; onLink: () => void
}) {
  return (
    <div
      className="absolute z-40 flex items-center gap-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-1 py-0.5"
      style={{ top, left: Math.max(left - 80, 8), pointerEvents: 'auto' }}
    >
      <button onClick={onComment} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)]" title="添加批注">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        注¹
      </button>
      <span className="w-px h-4 bg-[var(--border)]" />
      <button onClick={onLink} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)]" title="插入链接">
        <LinkIcon />
      </button>
      <span className="w-px h-4 bg-[var(--border)]" />
      <span className="px-2 py-1 text-[11px] text-[var(--muted)]">{wordCount} 字</span>
    </div>
  )
}

// ============================================
// 颜色网格
// ============================================

function ColorGrid({ colors, onSelect }: { colors: string[]; onSelect: (color: string) => void }) {
  return (
    <div className="grid gap-[3px] p-2.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
      {colors.map((c, i) => (
        <button key={i} className="w-5 h-5 rounded-sm border border-transparent hover:scale-125 hover:border-[var(--foreground)] transition"
          style={{ background: c }} title={c} onClick={() => onSelect(c)} />
      ))}
    </div>
  )
}

// ============================================
// 工具栏基础组件
// ============================================

function Btn({ icon, title, onClick, active, disabled }: {
  icon: React.ReactNode; title: string; onClick: () => void; active?: boolean; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
        active ? 'bg-[var(--foreground)]/10 text-[var(--foreground)] font-semibold' : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-hover)]'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      {icon}
    </button>
  )
}

function Sep() { return <div className="w-px h-5 bg-[var(--border)] mx-0.5" /> }

function Dropdown({ name, label, active, toggle, width, children }: {
  name: string; label: React.ReactNode; active: string | null; toggle: (n: string) => void; width: string; children: React.ReactNode
}) {
  const isOpen = active === name
  const dropRef = useRef<HTMLDivElement>(null)
  const [alignRight, setAlignRight] = useState(false)

  useEffect(() => {
    if (isOpen && dropRef.current) {
      const rect = dropRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth - 8) {
        setAlignRight(true)
      } else {
        setAlignRight(false)
      }
    }
  }, [isOpen])

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => toggle(name)}
        className={`h-7 px-1.5 flex items-center gap-0.5 rounded text-xs transition hover:bg-[var(--surface-hover)] text-[var(--foreground)] ${isOpen ? 'bg-[var(--surface-hover)]' : ''}`}>
        {label}
        <svg className="w-2.5 h-2.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div ref={dropRef} className={`absolute top-full mt-1 ${width} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto ${alignRight ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropItem({ label, icon, onClick, active, className }: {
  label: string; icon?: React.ReactNode; onClick: () => void; active?: boolean; className?: string
}) {
  return (
    <button className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-[var(--foreground)]'} ${className || ''}`}
      onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

// ============================================
// SVG 图标（学城同款线条风格）
// ============================================

function UndoIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5" /><path strokeLinecap="round" d="M4 9h10.5a5.5 5.5 0 010 11H16" /></svg> }
function RedoIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 14l5-5-5-5" /><path strokeLinecap="round" d="M20 9H9.5a5.5 5.5 0 000 11H8" /></svg> }
function FormatPainterIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 3h14v4H5z" /><path d="M8 7v3h3v11h2V10h3V7" /></svg> }
function ClearFormatIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 4h12M10 4v6M14 4v3" /><path d="M4 20l16-16" strokeLinecap="round" /></svg> }

function AlignIcon({ type }: { type: 'left' | 'center' | 'right' | 'justify' }) {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{
    type === 'left' ? <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></>
    : type === 'center' ? <><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>
    : type === 'right' ? <><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></>
    : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
  }</svg>
}

function UlIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="11" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg> }
function OlIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="11" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">1</text><text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">2</text><text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">3</text></svg> }
function TaskIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="5" width="4" height="4" rx="0.5" /><line x1="11" y1="7" x2="21" y2="7" /><rect x="3" y="15" width="4" height="4" rx="0.5" /><line x1="11" y1="17" x2="21" y2="17" /><path d="M4 6.5l1 1 2-2" /></svg> }
function OutdentIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><path d="M7 15l-4-3 4-3" /></svg> }
function IndentIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><path d="M3 15l4-3-4-3" /></svg> }
function TableGridIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg> }
function ImageIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg> }
function LinkIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg> }
function MoreIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg> }
function QuoteIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" /></svg> }
function CodeIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 6l-6 6 6 6M16 6l6 6-6 6" /></svg> }
function InlineCodeIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l-4 6 4 6M15 6l4 6-4 6" /><line x1="10" y1="4" x2="14" y2="20" /></svg> }
function HrIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="12" x2="21" y2="12" strokeDasharray="4 2" /></svg> }
