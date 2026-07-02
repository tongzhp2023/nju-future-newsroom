import { Node } from '@tiptap/core'

export interface IframeOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string; width?: string; height?: string }) => ReturnType
    }
  }
}

export const Iframe = Node.create<IframeOptions>({
  name: 'iframe',
  group: 'block',
  atom: true,

  addOptions() { return { HTMLAttributes: {} } },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: '400' },
    }
  },

  parseHTML() { return [{ tag: 'iframe' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'my-4 overflow-hidden rounded-lg' },
      ['iframe', {
        src: HTMLAttributes.src,
        width: HTMLAttributes.width,
        height: HTMLAttributes.height,
        style: 'border: none; max-width: 100%;',
        allowfullscreen: 'true',
        ...this.options.HTMLAttributes,
      }],
    ]
  },

  addCommands() {
    return {
      setIframe: (options) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: options,
      }),
    }
  },
})
