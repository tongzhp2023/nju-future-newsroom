import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (options: { name: string; url: string; size?: string; type?: string }) => ReturnType
    }
  }
}

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      name: { default: null },
      url: { default: null },
      size: { default: null },
      fileType: { default: null },
    }
  },

  parseHTML() { return [{ tag: 'div[data-attachment]' }] },

  renderHTML({ HTMLAttributes }) {
    const { name, url, size, fileType } = HTMLAttributes
    return ['div', { 'data-attachment': '', class: 'my-3' },
      ['a', {
        href: url,
        download: name,
        class: 'flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition no-underline',
      },
        ['div', { class: 'flex-1 min-w-0' },
          ['div', { class: 'text-sm font-medium text-[var(--foreground)] truncate' }, name],
          ['div', { class: 'text-xs text-[var(--muted)] mt-0.5' }, [size, fileType].filter(Boolean).join(' · ')],
        ],
        ['div', { class: 'shrink-0' },
          ['svg', { class: 'w-5 h-5 text-[var(--muted)]', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: '2' },
            ['path', { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' }],
          ],
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setAttachment: (options) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: options,
      }),
    }
  },
})
