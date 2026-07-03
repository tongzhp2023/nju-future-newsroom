'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'

interface TableBubbleProps {
  editor: Editor
}

export default function TableBubbleMenu({ editor }: TableBubbleProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const { from } = editor.state.selection
    const view = editor.view
    const start = view.coordsAtPos(from)
    const editorDOM = view.dom.closest('.editor-scroll-area')
    if (!editorDOM) return
    const rect = editorDOM.getBoundingClientRect()
    setPos({
      top: start.top - rect.top - 44,
      left: Math.max(start.left - rect.left - 60, 8),
    })
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      if (editor.isActive('table')) {
        updatePosition()
      } else {
        setPos(null)
      }
    }
    editor.on('selectionUpdate', handler)
    editor.on('transaction', handler)
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', handler)
    }
  }, [editor, updatePosition])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!pos || !editor.isActive('table')) return null

  const btn = (label: string, onClick: () => void, title: string) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      title={title}
      className="px-2.5 py-1.5 text-[11px] hover:bg-[var(--surface-hover)] rounded transition text-[var(--foreground)] whitespace-nowrap"
    >
      {label}
    </button>
  )

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl px-1 py-1"
      style={{ top: pos.top, left: pos.left, pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-0.5 flex-wrap">
        {btn('+⬆行', () => editor.chain().focus().addRowBefore().run(), '上方插入行')}
        {btn('+⬇行', () => editor.chain().focus().addRowAfter().run(), '下方插入行')}
        {btn('+⬅列', () => editor.chain().focus().addColumnBefore().run(), '左侧插入列')}
        {btn('+➡列', () => editor.chain().focus().addColumnAfter().run(), '右侧插入列')}
        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
        {btn('✕行', () => editor.chain().focus().deleteRow().run(), '删除行')}
        {btn('✕列', () => editor.chain().focus().deleteColumn().run(), '删除列')}
        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
        {btn('合并', () => editor.chain().focus().mergeCells().run(), '合并单元格')}
        {btn('拆分', () => editor.chain().focus().splitCell().run(), '拆分单元格')}
        <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
        {btn('🗑表', () => editor.chain().focus().deleteTable().run(), '删除表格')}
      </div>
    </div>
  )
}
