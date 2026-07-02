'use client'

import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import { LinkIcon } from './icons'

interface BubbleMenuProps {
  editor: Editor
  onAddLink: () => void
}

export function EditorBubbleMenu({ editor, onAddLink }: BubbleMenuProps) {
  return (
    <TiptapBubbleMenu
      editor={editor}
      options={{ placement: 'top' as const }}
      className="flex items-center gap-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-1 py-0.5"
    >
      <BubbleBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="加粗">
        <b className="text-sm">B</b>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体">
        <i className="text-sm">I</i>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线">
        <u className="text-sm">U</u>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
        <s className="text-xs">S</s>
      </BubbleBtn>
      <div className="w-px h-4 bg-[var(--border)] mx-0.5" />
      <BubbleBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="行内代码">
        <span className="text-xs font-mono">{'</>'}</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive('link')} onClick={onAddLink} title="链接">
        <LinkIcon />
      </BubbleBtn>
      <BubbleBtn onClick={() => editor.chain().focus().unsetAllMarks().run()} title="清除格式">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 20l16-16" strokeLinecap="round" />
        </svg>
      </BubbleBtn>
    </TiptapBubbleMenu>
  )
}

function BubbleBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition ${
        active
          ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]'
          : 'text-[var(--foreground)]/80 hover:bg-[var(--surface-hover)]'
      }`}
    >
      {children}
    </button>
  )
}
