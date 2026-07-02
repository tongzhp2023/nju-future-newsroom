import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchReplaceOptions {
  searchTerm: string
  replaceTerm: string
}

export const SearchReplacePluginKey = new PluginKey('searchReplace')

export const SearchReplace = Extension.create({
  name: 'searchReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SearchReplacePluginKey,
        state: {
          init() { return { searchTerm: '', replaceTerm: '', results: [] as { from: number; to: number }[] } },
          apply(tr, state) {
            const meta = tr.getMeta(SearchReplacePluginKey)
            if (meta) return { ...state, ...meta }
            return state
          },
        },
        props: {
          decorations(state) {
            const pluginState = SearchReplacePluginKey.getState(state)
            if (!pluginState?.searchTerm) return DecorationSet.empty
            const decorations: Decoration[] = []
            const { doc } = state
            const searchLower = pluginState.searchTerm.toLowerCase()
            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text || ''
                const lower = text.toLowerCase()
                let index = 0
                while ((index = lower.indexOf(searchLower, index)) !== -1) {
                  decorations.push(Decoration.inline(pos + index, pos + index + searchLower.length, {
                    class: 'bg-yellow-200 dark:bg-yellow-800 rounded-sm',
                  }))
                  index += searchLower.length
                }
              }
            })
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})
