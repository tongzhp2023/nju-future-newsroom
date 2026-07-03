'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { ColorGrid, ColorResetButton } from './color-picker'
import {
  UndoIcon, RedoIcon, FormatPainterIcon, EraserIcon, AlignIcon,
  UlIcon, OlIcon, TaskIcon, OutdentIcon, IndentIcon, TableGridIcon,
  ImageIcon, LinkIcon, MoreIcon, HrIcon, AttachmentIcon, CalloutIcon,
  SearchIcon, ColumnIcon, MentionIcon, ParagraphIcon, MarginIcon,
} from './icons'
import { FONT_SIZES, FONT_FAMILIES, LINE_HEIGHTS, PARAGRAPH_SPACE_LINES, FIRST_LINE_INDENT_CHARS, MARGIN_PRESETS, COLOR_PALETTE } from './types'

interface ToolbarProps {
  editor: Editor
  trackChangesEnabled?: boolean
  onFormatPainter: () => void
  onAddLink: () => void
  onAddImage: () => void
  onAddAttachment: () => void
  onToggleSearch: () => void
  onMarginChange: (preset: (typeof MARGIN_PRESETS)[number]) => void
  currentMargin: (typeof MARGIN_PRESETS)[number]
  formatPainterActive: boolean
}

export default function Toolbar({
  editor, trackChangesEnabled, onFormatPainter, onAddLink, onAddImage,
  onAddAttachment, onToggleSearch, onMarginChange, currentMargin,
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
    for (let l = 1; l <= 6; l++) if (editor.isActive('heading', { level: l })) return `标题 ${l}`
    return '正文'
  })()

  const currentFontSize = (() => {
    const val = editor.getAttributes('textStyle').fontSize
    if (val) {
      const match = FONT_SIZES.find(f => f.value === val)
      return match?.label || val.replace('pt', '')
    }
    return '五号'
  })()

  const currentFontFamily = (() => {
    const explicit = editor.getAttributes('textStyle').fontFamily
    if (explicit) {
      const match = FONT_FAMILIES.find(f => f.value === explicit)
      return match?.label || '自定义'
    }
    return '默认'
  })()

  const currentAlign = editor.isActive({ textAlign: 'center' }) ? 'center' as const
    : editor.isActive({ textAlign: 'right' }) ? 'right' as const
    : editor.isActive({ textAlign: 'justify' }) ? 'justify' as const
    : 'left' as const

  return (
    <div ref={toolbarRef} className="shrink-0 flex items-center gap-0.5 px-1.5 py-1 border-b border-[var(--border)] bg-[var(--surface)] flex-wrap min-h-[36px]">

      {/* === 历史 === */}
      <TbBtn icon={<UndoIcon />} title="撤销 (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <TbBtn icon={<RedoIcon />} title="重做 (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      <TbSep />

      {/* === 格式刷 + 清除格式 + 查找 === */}
      <TbBtn icon={<FormatPainterIcon />} title="格式刷（双击锁定，ESC 取消）" onClick={onFormatPainter} active={formatPainterActive} />
      <TbBtn icon={<EraserIcon />} title="清除格式" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />
      <TbBtn icon={<SearchIcon />} title="查找替换" onClick={onToggleSearch} />
      <TbSep />

      {/* === 正文/标题 === */}
      <TbDropdown name="heading" label={currentHeading.substring(0, 3)} active={activeDropdown} toggle={toggleDropdown} width="w-28">
        <TbDropItem label="正文" onClick={() => { editor.chain().focus().setParagraph().run(); setActiveDropdown(null) }} active={!editor.isActive('heading')} />
        {([1, 2, 3, 4, 5, 6] as const).map(l => (
          <TbDropItem key={l} label={`标题 ${l}`} className={`font-bold ${l === 1 ? 'text-lg' : l === 2 ? 'text-base' : l === 3 ? 'text-sm' : 'text-xs'}`}
            onClick={() => { editor.chain().focus().toggleHeading({ level: l }).run(); setActiveDropdown(null) }}
            active={editor.isActive('heading', { level: l })} />
        ))}
      </TbDropdown>

      {/* === 字体族 === */}
      <TbDropdown name="fontFamily" label={currentFontFamily} active={activeDropdown} toggle={toggleDropdown} width="w-36">
        <div className="max-h-64 overflow-y-auto">
          {FONT_FAMILIES.map(f => (
            <TbDropItem key={f.value} label={f.label} style={{ fontFamily: f.value }}
              onClick={() => { editor.chain().focus().setFontFamily(f.value).run(); setActiveDropdown(null) }}
              active={editor.getAttributes('textStyle').fontFamily === f.value || (!editor.getAttributes('textStyle').fontFamily && f.value === FONT_FAMILIES[0].value)} />
          ))}
        </div>
      </TbDropdown>

      {/* === 字号 === */}
      <TbDropdown name="fontSize" label={currentFontSize} active={activeDropdown} toggle={toggleDropdown} width="w-16">
        {FONT_SIZES.map(s => (
          <TbDropItem key={s.value} label={s.label} onClick={() => { editor.chain().focus().setFontSize(s.value).run(); setActiveDropdown(null) }} active={currentFontSize === s.label} />
        ))}
      </TbDropdown>

      {/* === 段落面板 === */}
      <TbDropdown name="para" label={<ParagraphIcon />} active={activeDropdown} toggle={toggleDropdown} width="w-64">
        <div className="p-3 space-y-3">
          {/* 行距 */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">行距</p>
            <div className="flex flex-wrap gap-1">
              {LINE_HEIGHTS.map(h => (
                <button key={h.value} type="button" className={`px-2.5 py-1 text-[11px] border rounded hover:bg-[var(--surface-hover)] transition ${editor.getAttributes('textStyle').lineHeight === h.value ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-600' : 'border-[var(--border)] text-[var(--foreground)]'}`}
                  onClick={() => { editor.chain().focus().setLineHeight(h.value).run(); }}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          {/* 段前间距 */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">段前间距（行）</p>
            <div className="flex flex-wrap gap-1">
              {PARAGRAPH_SPACE_LINES.map(v => (
                <button key={'before'+v} type="button" className={`px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--surface-hover)] transition border-[var(--border)] text-[var(--foreground)]`}
                  onClick={() => { editor.chain().focus().updateAttributes('paragraph', { marginTop: v === '0' ? null : `${v}em` }).run(); }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {/* 段后间距 */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">段后间距（行）</p>
            <div className="flex flex-wrap gap-1">
              {PARAGRAPH_SPACE_LINES.map(v => (
                <button key={'after'+v} type="button" className={`px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--surface-hover)] transition border-[var(--border)] text-[var(--foreground)]`}
                  onClick={() => { editor.chain().focus().updateAttributes('paragraph', { marginBottom: v === '0' ? null : `${v}em` }).run(); }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {/* 首行缩进 */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">首行缩进（字符）</p>
            <div className="flex flex-wrap gap-1">
              {FIRST_LINE_INDENT_CHARS.map(v => (
                <button key={'indent'+v} type="button" className={`px-2 py-0.5 text-[11px] border rounded hover:bg-[var(--surface-hover)] transition border-[var(--border)] text-[var(--foreground)]`}
                  onClick={() => { editor.chain().focus().updateAttributes('paragraph', { textIndent: v === '0' ? null : `${v}em` }).run(); }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {/* 缩进（左右） */}
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">左右缩进</p>
            <div className="flex gap-2">
              <button className="flex-1 px-2 py-1 text-[11px] border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition text-[var(--foreground)]"
                onClick={() => { if (editor.can().liftListItem('listItem')) editor.chain().focus().liftListItem('listItem').run(); else editor.chain().focus().outdent().run(); }}>
                ↩ 减少
              </button>
              <button className="flex-1 px-2 py-1 text-[11px] border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition text-[var(--foreground)]"
                onClick={() => { if (editor.can().sinkListItem('listItem')) editor.chain().focus().sinkListItem('listItem').run(); else editor.chain().focus().indent().run(); }}>
                ↪ 增加
              </button>
            </div>
          </div>
        </div>
      </TbDropdown>
      <TbSep />

      {/* === B/I/S/U === */}
      <TbBtn icon={<b>B</b>} title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <TbBtn icon={<i>I</i>} title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <TbBtn icon={<s className="text-xs">S</s>} title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <TbBtn icon={<u className="text-xs">U</u>} title="下划线" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />

      {/* === 颜色 === */}
      <TbDropdown name="textColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
        label={<span className="flex flex-col items-center leading-none"><span className="text-[10px] font-bold">A</span><span className="w-3 h-0.5 rounded-sm mt-px" style={{ background: editor.getAttributes('textStyle').color || '#000' }} /></span>}>
        <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setColor(c).run(); setActiveDropdown(null) }} />
        <ColorResetButton onClick={() => { editor.chain().focus().unsetColor().run(); setActiveDropdown(null) }} />
      </TbDropdown>

      <TbDropdown name="bgColor" active={activeDropdown} toggle={toggleDropdown} width="w-auto"
        label={<span className="flex flex-col items-center leading-none"><span className="w-4 h-3.5 rounded text-[8px] flex items-center justify-center border border-[var(--border-light)]" style={{ background: editor.getAttributes('textStyle').backgroundColor || '#FFEC3D' }}>A</span></span>}>
        <ColorGrid colors={COLOR_PALETTE} onSelect={c => { editor.chain().focus().setBackgroundColor(c).run(); setActiveDropdown(null) }} />
        <ColorResetButton onClick={() => { editor.chain().focus().unsetBackgroundColor().run(); setActiveDropdown(null) }} />
      </TbDropdown>

      <TbBtn icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>}
        title="高亮" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} />

      <TbDropdown name="subSup" active={activeDropdown} toggle={toggleDropdown} width="w-24" label={<span className="text-[10px]">X²</span>}>
        <TbDropItem label="X² 上标" onClick={() => { editor.chain().focus().toggleSuperscript().run(); setActiveDropdown(null) }} active={editor.isActive('superscript')} />
        <TbDropItem label="X₂ 下标" onClick={() => { editor.chain().focus().toggleSubscript().run(); setActiveDropdown(null) }} active={editor.isActive('subscript')} />
      </TbDropdown>
      <TbSep />

      {/* === 对齐 === */}
      <TbDropdown name="align" active={activeDropdown} toggle={toggleDropdown} width="w-28" label={<AlignIcon type={currentAlign} />}>
        {(['left', 'center', 'right', 'justify'] as const).map(a => (
          <TbDropItem key={a} icon={<AlignIcon type={a} />}
            label={a === 'left' ? '左对齐' : a === 'center' ? '居中' : a === 'right' ? '右对齐' : '两端对齐'}
            onClick={() => { editor.chain().focus().setTextAlign(a).run(); setActiveDropdown(null) }}
            active={editor.isActive({ textAlign: a })} />
        ))}
      </TbDropdown>
      <TbSep />

      {/* === 列表 === */}
      <TbBtn icon={<UlIcon />} title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <TbBtn icon={<OlIcon />} title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <TbBtn icon={<TaskIcon />} title="任务列表" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <TbSep />

      {/* === 插入 === */}
      <TbBtn icon={<ImageIcon />} title="插入图片" onClick={onAddImage} />
      <TbBtn icon={<LinkIcon />} title="插入链接" active={editor.isActive('link')} onClick={onAddLink} />
      <TbBtn icon={<AttachmentIcon />} title="插入附件" onClick={onAddAttachment} />
      <TbDropdown name="table" active={activeDropdown} toggle={toggleDropdown} width="w-auto" label={<TableGridIcon />}>
        <div className="p-2">
          <p className="text-xs font-medium text-[var(--foreground)] mb-2">插入表格</p>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }} onMouseLeave={() => setTableGrid({ rows: 0, cols: 0 })}>
            {Array.from({ length: 36 }, (_, i) => {
              const r = Math.floor(i / 6) + 1; const c = (i % 6) + 1
              return (<button key={i} className={`w-5 h-5 rounded-sm border transition ${r <= tableGrid.rows && c <= tableGrid.cols ? 'bg-blue-500 border-blue-400' : 'bg-[var(--surface)] border-[var(--border-light)] hover:border-blue-300'}`}
                onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
                onClick={() => { editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setActiveDropdown(null); setTableGrid({ rows: 0, cols: 0 }) }} />)
            })}
          </div>
          {tableGrid.rows > 0 && <p className="text-[11px] text-center text-[var(--muted)] mt-1.5">{tableGrid.cols} × {tableGrid.rows}</p>}
        </div>
      </TbDropdown>

      <TbDropdown name="margin" label={<MarginIcon />} active={activeDropdown} toggle={toggleDropdown} width="w-32">
        <p className="px-3 py-1.5 text-[11px] font-medium text-[var(--muted)]">页边距</p>
        {MARGIN_PRESETS.map(m => (
          <TbDropItem key={m.label} label={m.label}
            onClick={() => { onMarginChange(m); setActiveDropdown(null) }}
            active={currentMargin.label === m.label} />
        ))}
      </TbDropdown>

      <TbDropdown name="more" label={<MoreIcon />} active={activeDropdown} toggle={toggleDropdown} width="w-36">
        <TbDropItem icon={<HrIcon />} label="分隔线" onClick={() => { editor.chain().focus().setHorizontalRule().run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<CalloutIcon />} label="标注块" onClick={() => { editor.chain().focus().setCallout({ type: 'info' }).run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<ColumnIcon />} label="双栏布局" onClick={() => { editor.chain().focus().setColumns(2).run(); setActiveDropdown(null) }} />
        <TbDropItem icon={<MentionIcon />} label="提及(@)" onClick={() => { setActiveDropdown(null) }} />
      </TbDropdown>

      {trackChangesEnabled && (
        <><TbSep /><span className="px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />修订中</span></>
      )}
    </div>
  )
}

// ============================================
function TbBtn({ icon, title, onClick, active, disabled }: { icon: ReactNode; title: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={title}
    className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${active ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]' : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-hover)]'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>{icon}</button>
}
function TbSep() { return <div className="w-px h-5 bg-[var(--border)] mx-0.5" /> }
function TbDropdown({ name, label, active, toggle, width, children }: { name: string; label: ReactNode; active: string | null; toggle: (n: string) => void; width: string; children: ReactNode }) {
  const isOpen = active === name; const dropRef = useRef<HTMLDivElement>(null); const [alignRight, setAlignRight] = useState(false)
  useEffect(() => { if (isOpen && dropRef.current) setAlignRight(dropRef.current.getBoundingClientRect().right > window.innerWidth - 8) }, [isOpen])
  return <div className="relative">
    <button type="button" onClick={() => toggle(name)} className={`h-7 px-1 flex items-center gap-0.5 rounded text-xs transition hover:bg-[var(--surface-hover)] text-[var(--foreground)] ${isOpen ? 'bg-[var(--surface-hover)]' : ''}`}>{label}<svg className="w-2.5 h-2.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
    {isOpen && <div ref={dropRef} className={`absolute top-full mt-1 ${width} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto ${alignRight ? 'right-0' : 'left-0'}`}>{children}</div>}
  </div>
}
function TbDropItem({ label, icon, onClick, active, className, style }: { label: string; icon?: ReactNode; onClick: () => void; active?: boolean; className?: string; style?: React.CSSProperties }) {
  return <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-[var(--foreground)]'} ${className || ''}`} onClick={onClick} style={style}>{icon}{label}</button>
}
