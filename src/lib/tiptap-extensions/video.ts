import { Node } from '@tiptap/core'

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; width?: string; height?: string }) => ReturnType
    }
  }
}

export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: 'auto' },
    }
  },

  parseHTML() {
    return [{ tag: 'video' }, { tag: 'div[data-video]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-video': '', class: 'my-4' },
      ['video', {
        src: HTMLAttributes.src,
        controls: 'true',
        style: `width: ${HTMLAttributes.width}; height: ${HTMLAttributes.height}; border-radius: 8px;`,
        ...this.options.HTMLAttributes,
      }],
    ]
  },

  addCommands() {
    return {
      setVideo: (options) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: options,
      }),
    }
  },
})
