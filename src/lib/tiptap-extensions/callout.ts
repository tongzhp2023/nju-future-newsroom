import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (options?: { type?: 'info' | 'warning' | 'tip' | 'danger' }) => ReturnType
    }
  }
}

const CALLOUT_STYLES: Record<string, { icon: string; bg: string; border: string; text: string }> = {
  info:    { icon: 'ℹ️', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300' },
  warning: { icon: '⚠️', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300' },
  tip:     { icon: '💡', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-300' },
  danger:  { icon: '🚫', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300' },
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: { default: 'info' },
    }
  },

  parseHTML() { return [{ tag: 'div[data-callout]' }] },

  renderHTML({ HTMLAttributes }) {
    const type = (HTMLAttributes.type as string) || 'info'
    const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info
    return ['div', {
      'data-callout': '',
      class: `flex gap-3 p-4 my-4 rounded-lg border ${style.bg} ${style.border} ${style.text}`,
    },
      ['div', { class: 'shrink-0 text-lg' }, style.icon],
      ['div', { class: 'flex-1 min-w-0' }, 0],
    ]
  },

  addCommands() {
    return {
      setCallout: (options) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: options,
        content: [{ type: 'paragraph' }],
      }),
    }
  },
})
