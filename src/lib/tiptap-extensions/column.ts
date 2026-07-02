import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (count?: number) => ReturnType
    }
  }
}

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  isolating: true,

  addAttributes() {
    return { count: { default: 2 } }
  },

  parseHTML() { return [{ tag: 'div[data-columns]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', {
      'data-columns': '',
      class: 'flex gap-4 my-4',
      style: 'display: flex; gap: 1rem;',
    }, 0]
  },

  addCommands() {
    return {
      setColumns: (count = 2) => ({ commands }) => {
        const columns = Array.from({ length: count }, () => ({
          type: 'column',
          content: [{ type: 'paragraph' }],
        }))
        return commands.insertContent({ type: this.name, content: columns })
      },
    }
  },
})

export const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  isolating: true,

  parseHTML() { return [{ tag: 'div[data-column]' }] },

  renderHTML() {
    return ['div', {
      'data-column': '',
      class: 'flex-1 min-w-0',
      style: 'flex: 1; min-width: 0;',
    }, 0]
  },
})
