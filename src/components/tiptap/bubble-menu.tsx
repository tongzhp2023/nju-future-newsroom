'use client'

import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import { LinkIcon } from './icons'
import { FONT_SIZES, FONT_FAMILIES, COLOR_PALETTE } from './types'
import { ColorGrid } from './color-picker'

interface BubbleMenuProps {
  editor: Editor
  onAddLink: () => void
  onFormatPainter: () => void
}

export function EditorBubbleMenu({ editor, onAddLink, onFormatPainter }: BubbleMenuProps) {
  return (
    <TiptapBubbleMenu
      editor={editor}
      options={{ placement: 'top' as const }}
      className="flex items-center gap-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-1.5 py-1 flex-wrap max-w-[480px]"
    >
      {/* 格式刷 */}
      <BubbleBtn title="格式刷" onClick={onFormatPainter}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="14" height="6" rx="1" /><path d="M10 9v12h4V9" /><path d="M3 6h14" /><path d="M7 3v3" />
        </svg>
      </BubbleBtn>
      {/* 清除格式 */}
      <BubbleBtn title="清除格式" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0L21 5.2c.8.8.8 2 0 2.8L12 17" /><line x1="6" y1="20" x2="10" y2="20" /><line x1="18" y1="8" x2="14" y2="4" />
        </svg>
      </BubbleBtn>
      <BubbleSep />

      {/* B/I/S/U */}
      <BubbleBtn active={editor.isActive('bold')} title="加粗" onClick={() => editor.chain().focus().toggleBold().run()}><b className="text-xs">B</b></BubbleBtn>
      <BubbleBtn active={editor.isActive('italic')} title="斜体" onClick={() => editor.chain().focus().toggleItalic().run()}><i className="text-xs">I</i></BubbleBtn>
      <BubbleBtn active={editor.isActive('strike')} title="删除线" onClick={() => editor.chain().focus().toggleStrike().run()}><s className="text-[10px]">S</s></BubbleBtn>
      <BubbleBtn active={editor.isActive('underline')} title="下划线" onClick={() => editor.chain().focus().toggleUnderline().run()}><u className="text-[10px]">U</u></BubbleBtn>
      <BubbleSep />

      {/* 字号 */}
      <BubbleDropdown label={<span className="text-[9px] font-medium">字号</span>} width="w-20">
        {FONT_SIZES.slice(4, 14).map(s => (
          <BubbleDropItem key={s.value} label={s.label}
            onClick={() => editor.chain().focus().setFontSize(s.value).run()} />
        ))}
      </BubbleDropdown>

      {/* 字体 */}
      <BubbleDropdown label={<span className="text-[9px] font-medium">字体</span>} width="w-28">
        {FONT_FAMILIES.slice(0, 10).map(f => (
          <BubbleDropItem key={f.value} label={f.label} style={{ fontFamily: f.value }}
            onClick={() => editor.chain().focus().setFontFamily(f.value).run()} />
        ))}
      </BubbleDropdown>

      {/* 文字颜色 */}
      <BubbleDropdown label={<span className="flex flex-col items-center leading-none"><span className="text-[9px] font-bold">A</span><span className="w-2.5 h-0.5 rounded-sm mt-px" style={{ background: editor.getAttributes('textStyle').color || '#000' }} /></span>} width="w-auto">
        <ColorGrid colors={COLOR_PALETTE} cols={10} onSelect={c => editor.chain().focus().setColor(c).run()} />
      </BubbleDropdown>

      {/* 背景色 */}
      <BubbleDropdown label={<span className="flex flex-col items-center"><span className="w-3.5 h-3 rounded text-[7px] flex items-center justify-center border border-[var(--border-light)]" style={{ background: editor.getAttributes('textStyle').backgroundColor || '#FFEC3D' }}>A</span></span>} width="w-auto">
        <ColorGrid colors={COLOR_PALETTE} cols={10} onSelect={c => editor.chain().focus().setBackgroundColor(c).run()} />
      </BubbleDropdown>

      {/* 高亮 */}
      <BubbleBtn active={editor.isActive('highlight')} title="高亮" onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
      </BubbleBtn>

      {/* 上标/下标 */}
      <BubbleBtn active={editor.isActive('superscript')} title="上标" onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        <span className="text-[10px]">X²</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive('subscript')} title="下标" onClick={() => editor.chain().focus().toggleSubscript().run()}>
        <span className="text-[10px]">X₂</span>
      </BubbleBtn>

      <BubbleSep />
      {/* 链接 */}
      <BubbleBtn active={editor.isActive('link')} title="链接" onClick={onAddLink}><LinkIcon /></BubbleBtn>
    </TiptapBubbleMenu>
  )
}

function BubbleBtn({ children, active, onClick, title }: { children: React.ReactNode; active?: boolean; onClick: () => void; title: string }) {
  return <button type="button" onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded text-sm transition ${active ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]' : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-hover)]'}`}>{children}</button>
}
function BubbleSep() { return <div className="w-px h-5 bg-[var(--border)] mx-0.5" /> }

function BubbleDropdown({ label, width, children }: { label: React.ReactNode; width: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }; if (open) document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [open])
  return <div className="relative" ref={ref}>
    <button type="button" onClick={() => setOpen(!open)} className={`h-7 px-1 flex items-center gap-0.5 rounded text-xs transition hover:bg-[var(--surface-hover)] text-[var(--foreground)] ${open ? 'bg-[var(--surface-hover)]' : ''}`}>{label}<svg className="w-2 h-2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
    {open && <div className={`absolute bottom-full mb-1 ${width} bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto left-0`}>{children}</div>}
  </div>
}
function BubbleDropItem({ label, onClick, style }: { label: string; onClick: () => void; style?: React.CSSProperties }) {
  return <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition text-[var(--foreground)]" onClick={onClick} style={style}>{label}</button>
}

import { useState, useRef, useEffect } from 'react'
