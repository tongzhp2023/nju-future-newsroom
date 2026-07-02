import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (direction: 'ltr' | 'rtl' | 'auto') => ReturnType
      unsetTextDirection: () => ReturnType
    }
  }
}

export const TextDirection = Extension.create({
  name: 'textDirection',

  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        dir: {
          default: 'ltr',
          parseHTML: el => (el as HTMLElement).dir || 'ltr',
          renderHTML: attrs => attrs.dir !== 'ltr' ? { dir: attrs.dir as string } : {},
        },
      },
    }]
  },

  addCommands() {
    return {
      setTextDirection: (direction) => ({ commands }: { commands: { updateAttributes: (type: string, attrs: Record<string, unknown>) => void } }) => {
        commands.updateAttributes('paragraph', { dir: direction })
        commands.updateAttributes('heading', { dir: direction })
        return true
      },
      unsetTextDirection: () => ({ commands }: { commands: { updateAttributes: (type: string, attrs: Record<string, unknown>) => void } }) => {
        commands.updateAttributes('paragraph', { dir: 'ltr' })
        commands.updateAttributes('heading', { dir: 'ltr' })
        return true
      },
    }
  },
})
