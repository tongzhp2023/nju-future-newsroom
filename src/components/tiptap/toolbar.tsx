'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { ColorGrid, ColorResetButton } from './color-picker'
import {
  UndoIcon, RedoIcon, FormatPainterIcon, ClearFormatIcon, AlignIcon,
  UlIcon, OlIcon, TaskIcon, OutdentIcon, IndentIcon, TableGridIcon,
  ImageIcon, LinkIcon, MoreIcon, QuoteIcon, HrIcon,
  VideoIcon, IframeIcon, AttachmentIcon, CalloutIcon,
  SearchIcon, CodeViewIcon, DrawerIcon, ColumnIcon, TextDirectionIcon, MentionIcon,
} from './icons'
import { FONT_SIZES, FONT_FAMILIES, LINE_HEIGHTS, COLOR_PALETTE } from './types'

interface ToolbarProps {
  editor: Editor
  trackChangesEnabled?: boolean
  onFormatPainter: () => void
  onAddLink: () => void
  onAddImage: () => void
  onAddVideo: () => void
  onAddIframe: () => void
  onAddAttachment: () => void
  onToggleSearch: () => void
  onToggleCodeView: () => void
  formatPainterActive: boolean
}

export default function Toolbar({
  editor, trackChangesEnabled, onFormatPainter, onAddLink, onAddImage,
  onAddVideo, onAddIframe, onAddAttachment, onToggleSearch, onToggleCodeView,
  formatPainterActive,
}: ToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [tableGrid, setTableGrid] = useState({ rows: 0, cols: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
        setTableGrid({ rows: 0, cols: 0 })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleDropdown = useCallback((name: string) => {
    setActiveDropdown(prev => prev === name ? null : name)
  }, [])

  const currentHeading = (() => {
    for (let l = 1; l <= 6; l++) {
      if (editor.isActive('heading', { level: l })) return `标题 ${l}`
    }
    return '正文'
  })()

  const currentFontSize = (() => {
    const explicit = editor.getAttributes('textStyle').fontSize?.replace('px', '')
    if (explicit) return explicit
    try {
      const computed = window.getComputedStyle(editor.view.dom).fontSize
      return Math.round(parseFloat(computed)).toString()
    } catch { return '16' }
  })()

  const currentFontFamily = (() => {
    const explicit = editor.getAttributes('textStyle').fontFamily
    if (explicit) {
      const match = FONT_FAMILIES.find(f => f.value === explicit)
      return match?.label || '自定义'
    }
    return '默认'
  })()

  const currentAlign = editor.isActive({ textAlign: 'center' }) ? 'center'
    : editor.isActive({ textAlign: 'right' }) ? 'right'
    : editor.isActive({ textAlign: 'justify' }) ? 'justify'
    : 'left'

  return (
    <div ref={toolbarRef} className="shrink-0 flex items-center gap-0.5 px-2 py-1 border-b border-[var(--border)] bg-[var(--surface)] flex-wrap min-h-[40px]">

      {/* === 撤销/重做 === */}
      <TbBtn icon={<UndoIcon />} title="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <TbBtn icon={<RedoIcon />} title="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      <TbSep />

      {/* === 格式刷 / 清除格式 === */}
      <TbBtn icon={<FormatPainterIcon />} title="格式刷" onClick={onFormatPainter} active={formatPainterActive} />
      <TbBtn icon={<ClearFormatIcon />} title="清除格式" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />
      <TbSep />

      {/* === 段落格式 === */}
      <TbDropdown name="heading" label={currentHeading} active={activeDropdown} toggle={toggleDropdown} width="w-36">
        <TbDropItem label="正文" onClick={() => { editor.chain().focus().setParagraph().run(); setActiveDropdown(null) }} active={!editor.isActive('heading')} />
        {([1, 2, 3, 4, 5, 6] as const).map(l => (
          <TbDropItem key={l} label={`标题 ${l}`} className={`font-bold ${l <= 2 ? 'text-base' : l <= 4 ? 'text-sm' : 'text-xs'}`}
            onClick={() => { editor.chain().focus().toggleHeading({ level: l }).run(); setActiveDropdown(null) }}
            active={editor.isActive('heading', { level: l })} />
        ))}
      </TbDropdown>
      <TbSep />

      {/* === 字体族 === */}
      <TbDropdown name="fontFamily" label={currentFontFamily} active={activeDropdown} toggle={toggleDropdown} width="w-32">
        {FONT_FAMILIES.map(f => (
          <TbDropItem key={f.value} label={f.label} style={{ fontFamily: f.value }}
            onClick={() => { editor.chain().focus().setFontFamily(f.value).run(); setActiveDropdown(null) }}
            active={editor.getAttributes('textStyle').fontFamily === f.value || (!editor.getAttributes('textStyle').fontFamily && f.value === FONT_FAMILIES[0].value)} />
        ))}
      </TbDropdown>

      {/* === 字号 === */}
      <TbDropdown name="fontSize" label={currentFontSize} active={activeDropdown} toggle={toggleDropdown} width="w-16">
        {FONT_SIZES.map(s => (
          <TbDropItem key={s} label={s} onClick={() => { editor.chain().focus().setFontSize(`${s}px`).run(); setActiveDropdown(null) }} active={currentFontSize === s} />
        ))}
      </TbDropdown>
      <TbSep />

      {/* === 行距 === */}
      <TbDropdown name="lineHeight" label={<span className="text-xs flex items-center gap-0.5"><span className="text-[10px]">⇅</span></span>} active={activeDropdown} toggle={toggleDropdown} width="w-20">
        {LINE_HEIGHTS.map(h => (
          <TbDropItem key={h.value} label={h.label} onClick={() => { editor.chain().focus().setLineHeight(h.value).run(); setActiveDropdown(null) }} />
        ))}
      </TbDropdown>
      <TbSep />

      {/* === 加粗/斜体/删除线/下划线 === */}
      <TbBtn icon={<b>B</b>} title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <TbBtn icon={<i>I</i>} title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <TbBtn icon={<s className="text-xs">S</s>} title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <TbBtn icon={<u className="text-xs">U</u>} title="下划线" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />

      {/* === 文字颜色 === */}
      <TbDropdown name="textColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
        label={
          <span className="flex flex-col items-center leading-none">
            <span className="text-xs font-semibold">A</span>
            <span className="w-4 h-1 rounded-sm mt-px" style={{ background: editor.getAttributes('textStyle').color || '#000' }} />
          </span>
        }>
        <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setColor(c).run(); setActiveDropdown(null) }} />
        <ColorResetButton onClick={() => { editor.chain().focus().unsetColor().run(); setActiveDropdown(null) }} />
      </TbDropdown>

      {/* === 背景色 === */}
      <TbDropdown name="bgColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
        label={
          <span className="flex flex-col items-center leading-none">
            <span className="w-4 h-4 rounded text-[10px] flex items-center justify-center font-semibold border border-[var(--border-light)]"
              style={{ background: editor.getAttributes('textStyle').backgroundColor || '#FFEC3D' }}>A</span>
          </span>
        }>
        <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setBackgroundColor(c).run(); setActiveDropdown(null) }} />
        <ColorResetButton onClick={() => { editor.chain().focus().unsetBackgroundColor().run(); setActiveDropdown(null) }} />
      </TbDropdown>

      {/* === 高亮标记 === */}
      <TbBtn icon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      } title="高亮" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} />

      {/* === 上标/下标 === */}
      <TbDropdown name="subSup" active={activeDropdown} toggle={toggleDropdown} width="w-28" label={<span className="text-xs">X<sub>2</sub></span>}>
        <TbDropItem label="X² 上标" onClick={() => { editor.chain().focus().toggleSuperscript().run(); setActiveDropdown(null) }} active={editor.isActive('superscript')} />
        <TbDropItem label="X₂ 下标" onClick={() => { editor.chain().focus().toggleSubscript().run(); setActiveDropdown(null) }} active={editor.isActive('subscript')} />
      </TbDropdown>
      <TbSep />

      {/* === 对齐 === */}
      <TbDropdown name="align" active={activeDropdown} toggle={toggleDropdown} width="w-32" label={<AlignIcon type={currentAlign as 'left' | 'center' | 'right' | 'justify'} />}>
        {(['left', 'center', 'right', 'justify'] as const).map(a => (
          <TbDropItem key={a} icon={<AlignIcon type={a} />}
            label={a === 'left' ? '左对齐' : a === 'center' ? '居中' : a === 'right' ? '右对齐' : '两端对齐'}
            onClick={() => { editor.chain().focus().setTextAlign(a).run(); setActiveDropdown(null) }}
            active={editor.isActive({ textAlign: a })} />
        ))}
      </TbDropdown>
      <TbSep />

      {/* === 列表 + 缩进 === */}
      <TbBtn icon={<UlIcon />} title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <TbBtn icon={<OlIcon />} title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <TbBtn icon={<TaskIcon />} title="任务列表" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <TbBtn icon={<OutdentIcon />} title="减少缩进" onClick={() => {
        if (editor.can().liftListItem('listItem')) editor.chain().focus().liftListItem('listItem').run()
        else editor.chain().focus().outdent().run()
      }} />
      <TbBtn icon={<IndentIcon />} title="增加缩进" onClick={() => {
        if (editor.can().sinkListItem('listItem')) editor.chain().focus().sinkListItem('listItem').run()
        else editor.chain().focus().indent().run()
      }} />
      <TbSep />

      {/* === 插入：表格 === */}
      <TbDropdown name="table" active={activeDropdown} toggle={toggleDropdown} width="w-auto" label={<TableGridIcon />}>
        <div className="p-2">
          <p className="text-xs font-medium text-[var(--foreground)] mb-2">插入表格</p>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
            onMouseLeave={() => setTableGrid({ rows: 0, cols: 0 })}>
            {Array.from({ length: 36 }, (_, i) => {
              const r = Math.floor(i / 6) + 1; const c = (i % 6) + 1
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
      </TbDropdown>

      {/* === 插入：图片/视频/链接/附件/iframe === */}
      <TbBtn icon={<ImageIcon />} title="图片" onClick={onAddImage} />
      <TbBtn icon={<VideoIcon />} title="视频" onClick={onAddVideo} />
      <TbBtn icon={<LinkIcon />} title="超链接" active={editor.isActive('link')} onClick={onAddLink} />
      <TbBtn icon={<AttachmentIcon />} title="附件" onClick={onAddAttachment} />

      <TbSep />

      {/* === 更多（下拉）=== */}
      <TbDropdown name="more" active={activeDropdown} toggle={toggleDropdown} width="w-44" label={<MoreIcon />}>
        <TbDropItem icon={<QuoteIcon />} label="引用" active={editor.isActive('blockquote')}
          onClick={() => { editor.chain().focus().toggleBlockquote().run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<HrIcon />} label="分隔线"
          onClick={() => { editor.chain().focus().setHorizontalRule().run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<IframeIcon />} label="嵌入网页"
          onClick={() => { onAddIframe(); setActiveDropdown(null) }} />
        <TbDropItem icon={<CalloutIcon />} label="标注块"
          onClick={() => { editor.chain().focus().setCallout({ type: 'info' }).run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<ColumnIcon />} label="双栏布局"
          onClick={() => { editor.chain().focus().setColumns(2).run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<MentionIcon />} label="提及(@)"
          onClick={() => { setActiveDropdown(null) }} />
        <TbDropItem icon={<TextDirectionIcon />} label="切换文字方向"
          onClick={() => { editor.chain().focus().setTextDirection('rtl').run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<DrawerIcon />} label="侧边面板"
          onClick={() => { setActiveDropdown(null) }} />
      </TbDropdown>

      <TbSep />

      {/* === 工具：查找替换 / 源码视图 === */}
      <TbBtn icon={<SearchIcon />} title="查找替换" onClick={onToggleSearch} />
      <TbBtn icon={<CodeViewIcon />} title="源码视图" onClick={onToggleCodeView} />

      {/* === 修订模式标记 === */}
      {trackChangesEnabled && (
        <>
          <TbSep />
          <span className="px-2 py-0.5 rounded text-[11px] bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            修订中
          </span>
        </>
      )}
    </div>
  )
}

// ---- 工具栏基础组件 ----

function TbBtn({ icon, title, onClick, active, disabled }: {
  icon: ReactNode; title: string; onClick: () => void; active?: boolean; disabled?: boolean
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

function TbSep() { return <div className="w-px h-5 bg-[var(--border)] mx-0.5" /> }

function TbDropdown({ name, label, active, toggle, width, children }: {
  name: string; label: ReactNode; active: string | null; toggle: (n: string) => void; width: string; children: ReactNode
}) {
  const isOpen = active === name
  const dropRef = useRef<HTMLDivElement>(null)
  const [alignRight, setAlignRight] = useState(false)

  useEffect(() => {
    if (isOpen && dropRef.current) {
      setAlignRight(dropRef.current.getBoundingClientRect().right > window.innerWidth - 8)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button type="button" onClick={() => toggle(name)}
        className={`h-7 px-1.5 flex items-center gap-0.5 rounded text-xs transition hover:bg-[var(--surface-hover)] text-[var(--foreground)] ${isOpen ? 'bg-[var(--surface-hover)]' : ''}`}>
        {label}
        <svg className="w-2.5 h-2.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div ref={dropRef} className={`absolute top-full mt-1 ${width} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto ${alignRight ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

function TbDropItem({ label, icon, onClick, active, className, style }: {
  label: string; icon?: ReactNode; onClick: () => void; active?: boolean; className?: string; style?: React.CSSProperties
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-[var(--foreground)]'} ${className || ''}`}
      onClick={onClick} style={style}>
      {icon}{label}
    </button>
  )
}
