import { Mark, Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/core'

// ============================================
// 修订记录数据结构
// ============================================

export interface RevisionEntry {
  id: string
  index: number
  type: 'insert' | 'delete' | 'replace'
  author: string
  timestamp: number
  insertedText?: string
  deletedText?: string
}

// ============================================
// Track Changes Marks
// ============================================

export const TrackInsert = Mark.create({
  name: 'trackInsert',
  inclusive: true,
  addAttributes() {
    return {
      author: { default: null },
      timestamp: { default: null },
      revisionId: { default: null },
    }
  },
  parseHTML() { return [{ tag: 'ins' }] },
  renderHTML({ HTMLAttributes }) {
    return ['ins', {
      ...HTMLAttributes,
      'data-revision-id': HTMLAttributes.revisionId,
      class: 'track-insert',
    }]
  },
})

export const TrackDelete = Mark.create({
  name: 'trackDelete',
  inclusive: false,
  addAttributes() {
    return {
      author: { default: null },
      timestamp: { default: null },
      revisionId: { default: null },
    }
  },
  parseHTML() { return [{ tag: 'del' }] },
  renderHTML({ HTMLAttributes }) {
    return ['del', {
      ...HTMLAttributes,
      'data-revision-id': HTMLAttributes.revisionId,
      class: 'track-delete',
    }]
  },
})

// ============================================
// 共享状态
// ============================================

const trackChangesPluginKey = new PluginKey('trackChanges')
const trackChangesDecoKey = new PluginKey('trackChangesDeco')

export interface TrackChangesOptions { enabled: boolean; author: string }

function getTrackChangesState(): {
  enabled: boolean
  author: string
  revisions: RevisionEntry[]
  nextIndex: number
  listeners: Set<() => void>
} {
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>
    if (!w.__trackChangesState) {
      w.__trackChangesState = {
        enabled: false,
        author: 'unknown',
        revisions: [] as RevisionEntry[],
        nextIndex: 1,
        listeners: new Set<() => void>(),
      }
    }
    return w.__trackChangesState as ReturnType<typeof getTrackChangesState>
  }
  return { enabled: false, author: 'unknown', revisions: [], nextIndex: 1, listeners: new Set() }
}

export const trackChangesState = getTrackChangesState()

function notifyListeners() { trackChangesState.listeners.forEach(fn => fn()) }

function addRevision(entry: Omit<RevisionEntry, 'id' | 'index'> & { id?: string }): RevisionEntry {
  const rev: RevisionEntry = {
    ...entry,
    id: entry.id || `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    index: trackChangesState.nextIndex++,
  }
  trackChangesState.revisions.push(rev)
  notifyListeners()
  return rev
}

function removeRevision(id: string) {
  trackChangesState.revisions = trackChangesState.revisions.filter(r => r.id !== id)
  notifyListeners()
}

export function clearRevisions() {
  trackChangesState.revisions = []
  trackChangesState.nextIndex = 1
  notifyListeners()
}

// ============================================
// 收集文档中的修订 mark 区间（带合并）
// ============================================

function collectRevisionRanges(
  doc: import('@tiptap/pm/model').Node,
  revisionId?: string,
) {
  const raw: Array<{
    revisionId: string
    markType: 'trackInsert' | 'trackDelete'
    from: number
    to: number
  }> = []

  doc.descendants((node, pos) => {
    if (!node.isText) return true
    for (const mark of node.marks) {
      if (mark.type.name !== 'trackInsert' && mark.type.name !== 'trackDelete') continue
      const rid = mark.attrs.revisionId as string | null
      if (!rid || (revisionId && rid !== revisionId)) continue
      raw.push({
        revisionId: rid,
        markType: mark.type.name as 'trackInsert' | 'trackDelete',
        from: pos,
        to: pos + node.nodeSize,
      })
    }
    return true
  })

  if (raw.length === 0) return raw
  raw.sort((a, b) => a.from - b.from)
  const merged: typeof raw = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const prev = merged[merged.length - 1]
    const cur = raw[i]
    if (cur.revisionId === prev.revisionId && cur.markType === prev.markType && cur.from <= prev.to) {
      prev.to = Math.max(prev.to, cur.to)
    } else {
      merged.push(cur)
    }
  }
  return merged
}

// ============================================
// 收集文档中所有 revisionId（用于撤销同步）
// ============================================

function collectRevisionIds(doc: import('@tiptap/pm/model').Node): Set<string> {
  const ids = new Set<string>()
  doc.descendants((node) => {
    if (!node.isText) return true
    for (const mark of node.marks) {
      if (mark.type.name !== 'trackInsert' && mark.type.name !== 'trackDelete') continue
      const rid = mark.attrs.revisionId as string | null
      if (rid) ids.add(rid)
    }
    return true
  })
  return ids
}

// ============================================
// 接受 / 拒绝修订
// ============================================

export function acceptRevision(editor: Editor, revisionId: string) {
  const ranges = collectRevisionRanges(editor.state.doc, revisionId)
  if (ranges.length === 0) { removeRevision(revisionId); return }
  const tr = editor.state.tr
  const sorted = [...ranges].sort((a, b) => b.from - a.from)
  for (const r of sorted) {
    if (r.markType === 'trackDelete') tr.delete(r.from, r.to)
    else tr.removeMark(r.from, r.to, editor.state.schema.marks.trackInsert)
  }
  tr.setMeta(trackChangesPluginKey, true)
  editor.view.dispatch(tr)
  removeRevision(revisionId)
}

export function rejectRevision(editor: Editor, revisionId: string) {
  const ranges = collectRevisionRanges(editor.state.doc, revisionId)
  if (ranges.length === 0) { removeRevision(revisionId); return }
  const tr = editor.state.tr
  const sorted = [...ranges].sort((a, b) => b.from - a.from)
  for (const r of sorted) {
    if (r.markType === 'trackInsert') tr.delete(r.from, r.to)
    else tr.removeMark(r.from, r.to, editor.state.schema.marks.trackDelete)
  }
  tr.setMeta(trackChangesPluginKey, true)
  editor.view.dispatch(tr)
  removeRevision(revisionId)
}

export function acceptAllRevisions(editor: Editor) {
  const ranges = collectRevisionRanges(editor.state.doc)
  if (ranges.length === 0) { clearRevisions(); return }
  const tr = editor.state.tr
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    if (r.markType === 'trackDelete') tr.delete(r.from, r.to)
    else tr.removeMark(r.from, r.to, editor.state.schema.marks.trackInsert)
  }
  tr.setMeta(trackChangesPluginKey, true)
  editor.view.dispatch(tr)
  clearRevisions()
}

export function rejectAllRevisions(editor: Editor) {
  const ranges = collectRevisionRanges(editor.state.doc)
  if (ranges.length === 0) { clearRevisions(); return }
  const tr = editor.state.tr
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    if (r.markType === 'trackInsert') tr.delete(r.from, r.to)
    else tr.removeMark(r.from, r.to, editor.state.schema.marks.trackDelete)
  }
  tr.setMeta(trackChangesPluginKey, true)
  editor.view.dispatch(tr)
  clearRevisions()
}

// ============================================
// 修订导航
// ============================================

export function navigateToRevision(editor: Editor, revisionId: string) {
  const ranges = collectRevisionRanges(editor.state.doc, revisionId)
  if (ranges.length === 0) return
  const first = ranges[0]
  editor.chain().focus().setTextSelection({ from: first.from, to: first.to }).run()
  try {
    const coords = editor.view.coordsAtPos(first.from)
    const scrollArea = editor.view.dom.closest('.editor-scroll-area') as HTMLElement | null
    if (scrollArea) {
      const rect = scrollArea.getBoundingClientRect()
      scrollArea.scrollTo({ top: coords.top - rect.top + scrollArea.scrollTop - 100, behavior: 'smooth' })
    }
  } catch { /* */ }
}

// ============================================
// 从文档恢复修订记录
// ============================================

export function restoreRevisionsFromDoc(editor: Editor) {
  const ranges = collectRevisionRanges(editor.state.doc)

  const groups = new Map<string, {
    types: Set<string>; author: string; timestamp: number
    insertTexts: string[]; deleteTexts: string[]
  }>()

  for (const r of ranges) {
    // 取 mark attrs
    let author = 'unknown'
    let timestamp = Date.now()
    editor.state.doc.nodesBetween(r.from, Math.min(r.from + 1, r.to), (node) => {
      for (const m of node.marks) {
        if (m.attrs.revisionId === r.revisionId) {
          author = (m.attrs.author as string) || 'unknown'
          timestamp = (m.attrs.timestamp as number) || Date.now()
        }
      }
      return true
    })

    let g = groups.get(r.revisionId)
    if (!g) {
      g = { types: new Set(), author, timestamp, insertTexts: [], deleteTexts: [] }
      groups.set(r.revisionId, g)
    }
    g.types.add(r.markType)
    const text = editor.state.doc.textBetween(r.from, r.to, '')
    if (r.markType === 'trackInsert') g.insertTexts.push(text)
    else g.deleteTexts.push(text)
  }

  trackChangesState.revisions = []
  trackChangesState.nextIndex = 1

  for (const [id, g] of Array.from(groups.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)) {
    const hasIns = g.types.has('trackInsert')
    const hasDel = g.types.has('trackDelete')
    addRevision({
      id,
      type: hasIns && hasDel ? 'replace' : hasIns ? 'insert' : 'delete',
      author: g.author,
      timestamp: g.timestamp,
      insertedText: g.insertTexts.join('') || undefined,
      deletedText: g.deleteTexts.join('') || undefined,
    })
  }
}

// ============================================
// Track Changes Extension
// ============================================
//
// 核心思路：
//   filterTransaction 拦截含删除的 ReplaceStep：
//   - 阻止原 transaction（return false）
//   - 同步调度替代 transaction（通过 setTimeout(fn, 0)）
//     替代操作：给被删除区间添加 trackDelete mark（文本不删除）
//     替换时：额外在旧文本后插入新文本 + trackInsert mark
//
//   appendTransaction 处理纯插入和 IME 输入：
//   - 给新插入的文本添加 trackInsert mark
//   - 连续插入合并到同一个修订记录（合并窗口机制）
//   - 检测撤销操作，同步清理修订记录

export const TrackChanges = Extension.create<TrackChangesOptions>({
  name: 'trackChanges',
  addOptions() { return { enabled: false, author: 'unknown' } },

  addProseMirrorPlugins() {
    // IME 组合输入状态追踪
    let isComposing = false
    let compositionJustEnded = false

    // 连续插入合并窗口：同一作者在短时间内的连续插入复用同一个 revisionId
    let lastInsertRevId: string | null = null
    let lastInsertTime = 0
    const INSERT_MERGE_WINDOW = 3000 // 3 秒内的连续插入合并为一条修订

    // 连续删除合并窗口
    let lastDeleteRevId: string | null = null
    let lastDeleteTime = 0
    const DELETE_MERGE_WINDOW = 3000

    // 连续删除累积：filterTransaction 返回 false 后 state 不更新，
    // 连续 Backspace 产生相同位置的 deleteStep。
    // 用队列累积所有被拦截的删除操作，在一个 setTimeout 中批量处理。
    let pendingDeletes: Array<{
      from: number; to: number
      sliceSize: number
      slice: import('@tiptap/pm/model').Slice | null
    }> = []
    let pendingDeleteTimeout: ReturnType<typeof setTimeout> | null = null

    return [
      // ---- 主 Plugin：filterTransaction + appendTransaction ----
      new Plugin({
        key: trackChangesPluginKey,

        // 监听 IME composition 事件
        view(view) {
          const dom = view.dom
          // IME composition 期间记录光标位置，用于 compositionEnd 后精准标记新文本
          let compositionStartPos = -1

          const onCompositionStart = () => {
            isComposing = true
            // 记录 composition 开始时的光标位置
            try {
              compositionStartPos = view.state.selection.from
            } catch { compositionStartPos = -1 }
          }
          const onCompositionEnd = () => {
            isComposing = false
            compositionJustEnded = true
            // 需要等到 ProseMirror 处理完 compositionend 后的 DOM reconciliation
            setTimeout(() => { compositionJustEnded = false }, 100)

            const savedStartPos = compositionStartPos
            compositionStartPos = -1

            // 延迟扫描：确保 ProseMirror 完成 DOM reconciliation 后
            // 检查 composition 范围内是否有未标记 trackInsert 的文本
            setTimeout(() => {
              if (!trackChangesState.enabled) return
              if (!view?.state) return
              const state = view.state
              const insertMarkType = state.schema.marks.trackInsert
              if (!insertMarkType) return

              const { from: cursorPos } = state.selection
              if (savedStartPos < 0 || cursorPos < savedStartPos) return
              if (savedStartPos > state.doc.content.size || cursorPos > state.doc.content.size) return

              // composition 输入的范围：从 compositionStart 时的位置到当前光标
              const rangeFrom = savedStartPos
              const rangeTo = cursorPos
              if (rangeTo <= rangeFrom) return

              // 检查此范围内是否有未标记的文本节点
              let hasUnmarked = false
              state.doc.nodesBetween(rangeFrom, rangeTo, (node) => {
                if (node.isText && !node.marks.some(m => m.type.name === 'trackInsert')) {
                  hasUnmarked = true
                }
                return true
              })

              if (!hasUnmarked) return

              // 标记此范围内未标记的文本
              const now = Date.now()
              let revId: string
              if (lastInsertRevId && (now - lastInsertTime) < INSERT_MERGE_WINDOW) {
                revId = lastInsertRevId
              } else {
                revId = `rev-${now}-${Math.random().toString(36).slice(2, 7)}`
                lastInsertRevId = revId
              }
              lastInsertTime = now

              const tr = state.tr
              tr.setMeta(trackChangesPluginKey, true)
              tr.addMark(rangeFrom, rangeTo, insertMarkType.create({
                author: trackChangesState.author, timestamp: now, revisionId: revId,
              }))
              const insertedText = state.doc.textBetween(rangeFrom, rangeTo, '')
              const existing = trackChangesState.revisions.find(r => r.id === revId)
              if (existing) {
                existing.insertedText = (existing.insertedText || '') + insertedText
                notifyListeners()
              } else {
                addRevision({ id: revId, type: 'insert', author: trackChangesState.author, timestamp: now, insertedText })
              }
              view.dispatch(tr)
            }, 150)
          }
          dom.addEventListener('compositionstart', onCompositionStart)
          dom.addEventListener('compositionend', onCompositionEnd)
          return {
            destroy() {
              dom.removeEventListener('compositionstart', onCompositionStart)
              dom.removeEventListener('compositionend', onCompositionEnd)
              isComposing = false
              compositionJustEnded = false
            }
          }
        },

        filterTransaction: (tr, state) => {
          if (!trackChangesState.enabled) return true
          if (!tr.docChanged) return true
          if (tr.getMeta(trackChangesPluginKey)) return true
          if (tr.getMeta('addToHistory') === false) return true
          // undo/redo 事务带有 history$ meta，直接放行，由 appendTransaction 处理修订同步
          if (tr.getMeta('history$')) return true
          // IME 组合输入期间及刚结束时（reconciliation 交易）不拦截
          if (isComposing || compositionJustEnded) return true

          // 分析 steps：是否有删除操作
          const deleteSteps: Array<{
            from: number; to: number
            sliceSize: number
            slice: import('@tiptap/pm/model').Slice | null
          }> = []

          for (const step of tr.steps) {
            if (step.constructor.name !== 'ReplaceStep') continue
            const rs = step as unknown as {
              from: number; to: number
              slice: import('@tiptap/pm/model').Slice
            }
            if (rs.from >= rs.to) continue // 纯插入，不在这里处理
            // 安全检查：忽略整文档替换（setContent）
            if (rs.from === 0 && rs.to >= state.doc.content.size) continue
            deleteSteps.push({
              from: rs.from,
              to: rs.to,
              sliceSize: rs.slice?.content?.size ?? 0,
              slice: rs.slice || null,
            })
          }

          if (deleteSteps.length === 0) return true // 纯插入，放行

          // ---- 拦截！累积删除操作 ----
          pendingDeletes.push(...deleteSteps)

          if (!pendingDeleteTimeout) {
            pendingDeleteTimeout = setTimeout(() => {
              pendingDeleteTimeout = null
              const ops = pendingDeletes
              pendingDeletes = []

              if (typeof window === 'undefined' || ops.length === 0) return
              const editor = (window as unknown as Record<string, unknown>).__tiptapEditor as Editor | undefined
              if (!editor?.view) return

              const currentState = editor.view.state
              const newTr = currentState.tr
              newTr.setMeta(trackChangesPluginKey, true)

              const insertMarkType = currentState.schema.marks.trackInsert
              const deleteMarkType = currentState.schema.marks.trackDelete

              const now = Date.now()
              const author = trackChangesState.author

              // 合并窗口：连续删除复用同一个 revisionId
              let revId: string
              if (lastDeleteRevId && (now - lastDeleteTime) < DELETE_MERGE_WINDOW) {
                revId = lastDeleteRevId
              } else {
                revId = `rev-${now}-${Math.random().toString(36).slice(2, 7)}`
                lastDeleteRevId = revId
              }
              lastDeleteTime = now

              // 连续 Backspace 产生相同的 deleteStep（因为 state 没变）
              // 按 from-to 分组计数
              const groupedByPos = new Map<string, { from: number; to: number; count: number; sliceSize: number; slice: import('@tiptap/pm/model').Slice | null }>()
              for (const op of ops) {
                const key = `${op.from}-${op.to}`
                const existing = groupedByPos.get(key)
                if (existing) {
                  existing.count++
                } else {
                  groupedByPos.set(key, { ...op, count: 1 })
                }
              }

              // 倒序处理各组
              const groups = [...groupedByPos.values()].sort((a, b) => b.from - a.from)

              for (const group of groups) {
                const { to, count, sliceSize, slice } = group
                let { from } = group
                const isReplace = sliceSize > 0

                // 展开连续删除：n 次 Backspace 在同一位置 = 向前删除 n 个字符
                if (count > 1 && !isReplace) {
                  const expandedFrom = Math.max(1, from - (count - 1))
                  from = expandedFrom
                }

                // 验证位置有效
                if (from < 0 || to > currentState.doc.content.size || from >= to) continue

                // 检查被删区间是否已全部 trackDelete
                let allAlreadyDeleted = true
                currentState.doc.nodesBetween(from, to, (node) => {
                  if (node.isText && !node.marks.some(m => m.type.name === 'trackDelete')) {
                    allAlreadyDeleted = false
                  }
                  return true
                })

                // 检查被删区间是否全部 trackInsert（用户删除自己之前的插入）
                let allIsInsert = true
                currentState.doc.nodesBetween(from, to, (node) => {
                  if (node.isText && !node.marks.some(m => m.type.name === 'trackInsert')) {
                    allIsInsert = false
                  }
                  return true
                })

                if (allAlreadyDeleted && !isReplace) {
                  try { newTr.setSelection(TextSelection.create(newTr.doc, to)) } catch { /* */ }
                  continue
                }

                if (allIsInsert && !isReplace) {
                  newTr.delete(from, to)
                  try { newTr.setSelection(TextSelection.create(newTr.doc, from)) } catch { /* */ }
                  continue
                }

                // 给被删区间加 trackDelete mark
                const deletedText = currentState.doc.textBetween(from, to, '')
                newTr.addMark(from, to, deleteMarkType.create({
                  author, timestamp: now, revisionId: revId,
                }))

                if (isReplace && slice) {
                  newTr.insert(to, slice.content)
                  const insertEnd = to + sliceSize
                  newTr.addMark(to, insertEnd, insertMarkType.create({
                    author, timestamp: now, revisionId: revId,
                  }))
                  let insertedText = ''
                  try { insertedText = newTr.doc.textBetween(to, insertEnd, '') } catch { /* */ }
                  const existingRev = trackChangesState.revisions.find(r => r.id === revId)
                  if (existingRev) {
                    existingRev.deletedText = (existingRev.deletedText || '') + deletedText
                    existingRev.insertedText = (existingRev.insertedText || '') + insertedText
                    existingRev.type = 'replace'
                    notifyListeners()
                  } else {
                    addRevision({ id: revId, type: 'replace', author, timestamp: now, deletedText, insertedText: insertedText || undefined })
                  }
                  try { newTr.setSelection(TextSelection.create(newTr.doc, insertEnd)) } catch { /* */ }
                } else {
                  const existingRev = trackChangesState.revisions.find(r => r.id === revId)
                  if (existingRev) {
                    existingRev.deletedText = (existingRev.deletedText || '') + deletedText
                    notifyListeners()
                  } else {
                    addRevision({ id: revId, type: 'delete', author, timestamp: now, deletedText })
                  }
                  try { newTr.setSelection(TextSelection.create(newTr.doc, from)) } catch { /* */ }
                }
              }

              editor.view.dispatch(newTr)
            }, 0)
          }

          return false // 阻止原 transaction
        },

        appendTransaction: (transactions, oldState, newState) => {
          if (!trackChangesState.enabled) return null

          // ---- 修订同步：每次文档变化后，清理已不在文档中的修订记录 ----
          // 无论是 undo、redo、accept、reject 还是其他任何操作导致的 mark 消失，
          // 都自动从修订列表中移除对应的记录
          let revSyncHappened = false
          const anyDocChanged = transactions.some(tr => tr.docChanged)
          if (anyDocChanged && trackChangesState.revisions.length > 0) {
            const idsInDoc = collectRevisionIds(newState.doc)
            const toRemove = trackChangesState.revisions.filter(r => !idsInDoc.has(r.id))
            if (toRemove.length > 0) {
              for (const r of toRemove) {
                trackChangesState.revisions = trackChangesState.revisions.filter(rev => rev.id !== r.id)
              }
              notifyListeners()
              revSyncHappened = true
            }
          }

          // IME 组合输入进行中：不做任何处理（但仍需处理撤销同步的 decoration 刷新）
          if (isComposing) {
            if (revSyncHappened) {
              // 返回一个仅带 meta 的 tr 来触发 decoration plugin 更新
              const refreshTr = newState.tr
              refreshTr.setMeta(trackChangesPluginKey, true)
              return refreshTr
            }
            return null
          }

          const userTrs = transactions.filter(tr => {
            if (!tr.docChanged) return false
            if (tr.getMeta(trackChangesPluginKey)) return false
            // 对于 undo/redo (addToHistory=false) 产生的变更，不再添加新的 trackInsert
            if (tr.getMeta('addToHistory') === false) return false
            return true
          })
          if (userTrs.length === 0) {
            // 没有用户输入的 tr，但如果 undo 同步发生了，需要刷新 decorations
            if (revSyncHappened) {
              const refreshTr = newState.tr
              refreshTr.setMeta(trackChangesPluginKey, true)
              return refreshTr
            }
            return null
          }

          const insertMarkType = newState.schema.marks.trackInsert
          if (!insertMarkType) return null

          let modified = false
          const newTr = newState.tr
          newTr.setMeta(trackChangesPluginKey, true)

          for (const tr of userTrs) {
            for (const step of tr.steps) {
              if (step.constructor.name !== 'ReplaceStep') continue
              const rs = step as unknown as {
                from: number; to: number
                slice?: { content?: { size: number } }
              }
              const sliceSize = rs.slice?.content?.size ?? 0
              if (sliceSize <= 0) continue

              // 处理所有有插入内容的 step：
              // - 纯插入 (from === to)：直接输入的字符
              // - 替换 (from < to)：IME reconciliation 或选中替换
              //   对于 IME：compositionend 后 ProseMirror 会产生 from < to 的替换 step
              //   filterTransaction 已放行（compositionJustEnded=true），所以这里要处理
              // 注意：非 IME 的 from < to 删除+插入已在 filterTransaction 中被拦截
              // 所以到达这里的 from < to 只可能是 IME reconciliation

              const mFrom = tr.mapping.map(rs.from, -1)
              const mTo = mFrom + sliceSize

              // 检查是否已有 trackInsert（inclusive: true 会自动继承）
              let alreadyMarked = true
              try {
                newState.doc.nodesBetween(mFrom, mTo, (node) => {
                  if (node.isText && !node.marks.some(m => m.type.name === 'trackInsert')) {
                    alreadyMarked = false
                  }
                  return true
                })
              } catch { alreadyMarked = false }
              if (alreadyMarked) continue

              // 合并窗口：连续插入复用同一个 revisionId
              const now = Date.now()
              let revId: string
              if (lastInsertRevId && (now - lastInsertTime) < INSERT_MERGE_WINDOW) {
                revId = lastInsertRevId
              } else {
                revId = `rev-${now}-${Math.random().toString(36).slice(2, 7)}`
                lastInsertRevId = revId
              }
              lastInsertTime = now

              try {
                if (mFrom >= 0 && mTo <= newState.doc.content.size && mTo > mFrom) {
                  newTr.addMark(mFrom, mTo, insertMarkType.create({
                    author: trackChangesState.author, timestamp: now, revisionId: revId,
                  }))
                  const insertedText = newState.doc.textBetween(mFrom, mTo, '')
                  // 合并到已有修订或新增
                  const existing = trackChangesState.revisions.find(r => r.id === revId)
                  if (existing) {
                    existing.insertedText = (existing.insertedText || '') + insertedText
                    notifyListeners()
                  } else {
                    addRevision({ id: revId, type: 'insert', author: trackChangesState.author, timestamp: now, insertedText })
                  }
                  modified = true
                }
              } catch { /* */ }
            }
          }

          return modified ? newTr : null
        },
      }),

      // ---- Decoration Plugin：在文档中显示修订编号标记 ----
      new Plugin({
        key: trackChangesDecoKey,

        state: {
          init(_, state) {
            return buildDecorations(state.doc)
          },
          apply(tr, oldDecoSet, _oldState, newState) {
            // 文档或修订列表变化时重建 decorations
            if (tr.docChanged || tr.getMeta(trackChangesPluginKey)) {
              return buildDecorations(newState.doc)
            }
            return oldDecoSet
          },
        },

        props: {
          decorations(state) {
            return trackChangesDecoKey.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})

// ============================================
// 构建修订编号 Decoration
// ============================================

function buildDecorations(doc: import('@tiptap/pm/model').Node): DecorationSet {
  if (!trackChangesState.enabled || trackChangesState.revisions.length === 0) {
    return DecorationSet.empty
  }

  const decorations: Decoration[] = []
  const revisions = trackChangesState.revisions

  // 为每个修订找到其在文档中的第一个位置
  for (let i = 0; i < revisions.length; i++) {
    const rev = revisions[i]
    const ranges = collectRevisionRanges(doc, rev.id)
    if (ranges.length === 0) continue

    // 取第一个 range 的起始位置
    const firstRange = ranges[0]
    const pos = firstRange.from

    // 创建 widget decoration —— 显示修订编号（使用上标圆圈符号 ①②③…）
    const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
    const circledNum = (n: number) => {
      if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1]
      return `(${n})`
    }
    const widget = Decoration.widget(pos, () => {
      const span = document.createElement('span')
      span.className = 'track-revision-badge'
      span.textContent = circledNum(i + 1)
      span.setAttribute('data-revision-id', rev.id)
      span.setAttribute('title', `修订 ${circledNum(i + 1)}：${rev.type === 'insert' ? '增加内容' : rev.type === 'delete' ? '删除内容' : '替换内容'}`)
      return span
    }, {
      side: -1, // 显示在文本之前
      key: `rev-badge-${rev.id}`,
    })

    decorations.push(widget)
  }

  return DecorationSet.create(doc, decorations)
}

// ============================================
// Comment Mark
// ============================================

export const CommentMark = Mark.create({
  name: 'commentMark',
  addAttributes() {
    return { commentId: { default: null }, author: { default: null } }
  },
  parseHTML() { return [{ tag: 'span[data-comment]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-comment': HTMLAttributes.commentId, class: 'comment-highlight' }]
  },
})
