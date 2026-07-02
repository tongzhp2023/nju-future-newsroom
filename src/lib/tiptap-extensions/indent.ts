import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

/**
 * 段落缩进扩展
 * 为 paragraph / heading 节点增加 indent 属性，以 40px 为步进控制 margin-left
 */
export const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = element.style.marginLeft
              if (marginLeft) {
                return Math.round(parseInt(marginLeft, 10) / 40)
              }
              return 0
            },
            renderHTML: (attributes) => {
              const indent = attributes.indent as number
              if (!indent || indent <= 0) return {}
              return { style: `margin-left: ${indent * 40}px` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection
          let changed = false
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const currentIndent = (node.attrs.indent as number) || 0
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                })
              }
              changed = true
            }
          })
          return changed
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection
          let changed = false
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const currentIndent = (node.attrs.indent as number) || 0
              if (currentIndent > 0) {
                if (dispatch) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: currentIndent - 1,
                  })
                }
                changed = true
              }
            }
          })
          return changed
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    }
  },
})
