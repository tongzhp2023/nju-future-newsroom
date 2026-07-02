'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'
import TiptapEditor from '@/components/tiptap-editor'
import WordUploadButton from '@/components/word-upload-button'
import CommentsPanel from './comments-panel'
import {
  trackChangesState,
  acceptRevision,
  rejectRevision,
  acceptAllRevisions,
  rejectAllRevisions,
  navigateToRevision,
} from '@/lib/tiptap-extensions/track-changes'
import type { RevisionEntry } from '@/lib/tiptap-extensions/track-changes'
import {
  updateArticle,
  submitArticle,
  transitionArticle,
  deleteArticle,
} from '@/lib/actions'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  WORKFLOW_ROLE_LABELS,
} from '@/lib/types'
import type {
  ArticleWithDetails,
  UserRole,
  ArticleVersion,
  ArticleWorkflow,
  ArticleStatus,
  ArticleWorkflowAction,
  ArticleComment,
} from '@/lib/types'

interface ArticleEditorProps {
  article: ArticleWithDetails
  userRoles: UserRole[]
  departmentId: string
  versions: ArticleVersion[]
  workflows: ArticleWorkflow[]
  comments: ArticleComment[]
  isAuthor: boolean
  authorName: string
  deptName: string
}

type SidebarTab = 'workflow' | 'revisions' | 'logs' | 'comments'

// 审核角色（责编/主编）在稿件中的视图模式
type ReviewerViewMode = 'review' | 'returned' | 'higher_review' | 'published' | 'none'

export default function ArticleEditor({
  article,
  userRoles,
  departmentId,
  versions: initialVersions,
  workflows: initialWorkflows,
  comments: initialComments,
  isAuthor,
  authorName,
  deptName,
}: ArticleEditorProps) {
  const editorRouter = useRouter()
  const [title, setTitle] = useState(article.title)
  const [content, setContent] = useState<Record<string, unknown> | null>(article.content)
  const [contentText, setContentText] = useState(article.content_text || '')
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('workflow')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [versions] = useState(initialVersions)
  const [workflows] = useState(initialWorkflows)
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [revisions, setRevisions] = useState<RevisionEntry[]>([])

  const contentRef = useRef({ title, content, contentText })
  useEffect(() => { contentRef.current = { title, content, contentText } }, [title, content, contentText])

  // ---- 角色判断 ----
  const isReviewer = userRoles.some(r => ['editor', 'chief_editor', 'supervisor', 'admin'].includes(r))
  const isEditorRole = userRoles.includes('editor') && !userRoles.some(r => ['chief_editor', 'supervisor', 'admin'].includes(r))
  const isChiefEditorRole = userRoles.includes('chief_editor') && !userRoles.some(r => ['supervisor', 'admin'].includes(r))
  const isSupervisorRole = userRoles.includes('supervisor')
  // 责编/主编/指导老师 —— 共享弹窗审核 + 修订模式 + 只读视图逻辑
  const isReviewerRole = isEditorRole || isChiefEditorRole || isSupervisorRole

  // 获取当前审核角色的审批节点 stage_order
  const myStageOrder = isEditorRole
    ? (article.workflow_config?.stages.find(s => s.role_required === 'editor')?.stage_order ?? 1)
    : isChiefEditorRole
      ? (article.workflow_config?.stages.find(s => s.role_required === 'chief_editor')?.stage_order ?? 2)
      : isSupervisorRole
        ? (article.workflow_config?.stages.find(s => s.role_required === 'supervisor')?.stage_order ?? 3)
        : 0
  const myRoleLabel = isEditorRole ? '责编' : isChiefEditorRole ? '主编' : isSupervisorRole ? '指导老师' : ''
  // 指导老师是终审，通过即签发
  const isFinalReviewer = isSupervisorRole

  // 判断审核角色在此稿件中的视图模式
  const reviewerViewMode: ReviewerViewMode = (() => {
    if (!isReviewerRole) return 'none'
    if (article.status === 'in_review' && article.current_stage === myStageOrder) return 'review'
    if (article.status === 'returned') return 'returned'
    if (article.status === 'in_review' && article.current_stage !== null && article.current_stage > myStageOrder) return 'higher_review'
    if (article.status === 'published') return 'published'
    return 'none'
  })()

  // 审核模式下自动开启修订
  useEffect(() => {
    if (reviewerViewMode === 'review') {
      setTrackChangesEnabled(true)
    }
  }, [reviewerViewMode])

  // 订阅修订记录变化，实时刷新面板
  useEffect(() => {
    const listener = () => setRevisions([...trackChangesState.revisions])
    trackChangesState.listeners.add(listener)
    // 初始同步
    setRevisions([...trackChangesState.revisions])
    return () => { trackChangesState.listeners.delete(listener) }
  }, [])

  // 作者在 draft/returned 状态可以编辑
  const canEdit = (isAuthor && (article.status === 'draft' || article.status === 'returned'))
  // 审核角色在审核模式下也可以编辑（通过修订模式）
  const canUseTrackChanges = (isReviewer && article.status === 'in_review') || reviewerViewMode === 'review'
  const currentStage = article.current_stage_info
  // 非审核角色（老师/管理员）在侧边栏审核
  const canReviewCurrentStage = !isReviewerRole && article.status === 'in_review' && currentStage &&
    (userRoles.includes(currentStage.role_required as UserRole) || userRoles.includes('admin'))

  // 审核角色的只读视图：退回学生、高级审批、已签发
  const isReviewerReadonly = reviewerViewMode === 'returned' || reviewerViewMode === 'higher_review' || reviewerViewMode === 'published'

  // Auto-save
  useEffect(() => {
    if (!canEdit && !canUseTrackChanges) return
    const timer = setInterval(() => {
      const { title: t, content: c, contentText: ct } = contentRef.current
      if (!hasUnsavedChanges) return
      setSaving(true)
      updateArticle(article.id, { title: t || '无标题稿件', content: c || undefined, content_text: ct || undefined })
        .then(() => { setHasUnsavedChanges(false); setLastSavedAt(new Date()) })
        .catch(err => console.error('自动保存失败:', err))
        .finally(() => setSaving(false))
    }, 30000)
    return () => clearInterval(timer)
  }, [hasUnsavedChanges, canEdit, canUseTrackChanges, article.id])

  const handleContentChange = useCallback((json: Record<string, unknown>, text: string) => {
    setContent(json); setContentText(text); setHasUnsavedChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateArticle(article.id, { title: title || '无标题稿件', content: content || undefined, content_text: contentText || undefined })
      setHasUnsavedChanges(false); setLastSavedAt(new Date())
    } catch { alert('保存失败，请重试') }
    finally { setSaving(false) }
  }, [article.id, title, content, contentText])

  const handleSubmit = useCallback(async () => {
    await handleSave()
    if (!title || title === '无标题稿件') { alert('请先输入标题'); return }
    if (!confirm('确定要提交审核吗？提交后将进入审批流程。')) return
    startTransition(async () => { await submitArticle(article.id); window.location.reload() })
  }, [handleSave, title, article.id])

  const handleTransition = useCallback((action: ArticleWorkflowAction) => {
    if (action === 'approve' && !confirm('确定通过当前审批节点？')) return
    if ((action === 'return_prev' || action === 'return_reporter') && !reviewComment.trim()) { alert('请输入退回意见'); return }
    if (action !== 'approve' && !confirm(`确定${action === 'return_prev' ? '退回上一级' : '退回记者修改'}？`)) return
    startTransition(async () => { await transitionArticle(article.id, action, reviewComment || undefined); window.location.reload() })
  }, [article.id, reviewComment])

  // 审核角色弹窗操作（责编/主编共享，只有通过和退回学生）
  const handleReviewerAction = useCallback(async (action: 'approve' | 'return_reporter') => {
    if (action === 'return_reporter' && !reviewComment.trim()) {
      alert('退回学生时，审核意见为必填项')
      return
    }
    // 先保存修改
    if (hasUnsavedChanges) {
      await handleSave()
    }
    startTransition(async () => {
      await transitionArticle(article.id, action, reviewComment || undefined)
      window.location.reload()
    })
  }, [article.id, reviewComment, hasUnsavedChanges, handleSave])

  const handleDelete = useCallback(() => {
    if (!confirm('确定要删除这篇稿件吗？此操作不可撤销。')) return
    startTransition(async () => { await deleteArticle(article.id, departmentId) })
  }, [article.id, departmentId])

  // 获取 Tiptap editor 实例（通过 window 暴露）
  const getEditor = useCallback(() => {
    if (typeof window === 'undefined') return null
    return (window as unknown as Record<string, unknown>).__tiptapEditor as
      import('@tiptap/core').Editor | undefined
  }, [])

  // 接受单条修订
  const handleAcceptRevision = useCallback((revisionId: string) => {
    const editor = getEditor()
    if (!editor) return
    acceptRevision(editor, revisionId)
    setRevisions([...trackChangesState.revisions])
    setHasUnsavedChanges(true)
  }, [getEditor])

  // 拒绝单条修订
  const handleRejectRevision = useCallback((revisionId: string) => {
    const editor = getEditor()
    if (!editor) return
    rejectRevision(editor, revisionId)
    setRevisions([...trackChangesState.revisions])
    setHasUnsavedChanges(true)
  }, [getEditor])

  // 全部接受
  const handleAcceptAll = useCallback(() => {
    const editor = getEditor()
    if (!editor) return
    if (!confirm('确定接受所有修订？此操作将：\n• 保留所有插入的内容（移除修订标记）\n• 删除所有被标记删除的内容')) return
    acceptAllRevisions(editor)
    setRevisions([...trackChangesState.revisions])
    setHasUnsavedChanges(true)
  }, [getEditor])

  // 全部拒绝
  const handleRejectAll = useCallback(() => {
    const editor = getEditor()
    if (!editor) return
    if (!confirm('确定拒绝所有修订？此操作将：\n• 删除所有插入的内容\n• 保留所有被标记删除的内容（移除修订标记）')) return
    rejectAllRevisions(editor)
    setRevisions([...trackChangesState.revisions])
    setHasUnsavedChanges(true)
  }, [getEditor])

  // 导航到修订位置
  const handleNavigateRevision = useCallback((revisionId: string) => {
    const editor = getEditor()
    if (!editor) return
    navigateToRevision(editor, revisionId)
  }, [getEditor])

  // 导出终稿 Word（真正的 .docx 格式）
  const handleExportWord = useCallback(async () => {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = await import('docx')

    // ---- 解析 Tiptap marks → TextRun 选项 ----
    type MarkType = { type: string }
    type TiptapTextNode = { type: 'text'; text: string; marks?: MarkType[] }
    type TiptapNode = {
      type: string
      content?: TiptapNode[]
      text?: string
      marks?: MarkType[]
      attrs?: Record<string, unknown>
    }

    const marksToRunOptions = (marks?: MarkType[]) => {
      const opts: Record<string, boolean> = {}
      if (marks) {
        for (const m of marks) {
          if (m.type === 'bold') opts.bold = true
          if (m.type === 'italic') opts.italics = true
          if (m.type === 'underline') opts.underline = { type: 'single' } as unknown as boolean
          if (m.type === 'strike') opts.strike = true
        }
      }
      return opts
    }

    // ---- 从 inline content 生成 TextRun[] ----
    const inlineToRuns = (nodes?: TiptapNode[]): InstanceType<typeof TextRun>[] => {
      if (!nodes) return [new TextRun('')]
      return nodes.map(n => {
        if (n.type === 'text') {
          return new TextRun({ text: n.text || '', ...marksToRunOptions(n.marks), size: 24 })
        }
        if (n.type === 'hardBreak') {
          return new TextRun({ break: 1 })
        }
        return new TextRun({ text: n.text || '' })
      })
    }

    // ---- 递归解析 block 节点 → Paragraph[] ----
    const blockToParagraphs = (node: TiptapNode): InstanceType<typeof Paragraph>[] => {
      const results: InstanceType<typeof Paragraph>[] = []

      if (node.type === 'paragraph') {
        results.push(new Paragraph({
          children: inlineToRuns(node.content),
          spacing: { after: 120 },
        }))
      } else if (node.type === 'heading') {
        const level = (node.attrs?.level as number) || 1
        const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6,
        }
        results.push(new Paragraph({
          children: inlineToRuns(node.content),
          heading: headingMap[level] || HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }))
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        node.content?.forEach((li, idx) => {
          if (li.type === 'listItem' && li.content) {
            li.content.forEach(child => {
              if (child.type === 'paragraph') {
                const prefix = node.type === 'orderedList' ? `${idx + 1}. ` : '• '
                const runs = inlineToRuns(child.content)
                runs.unshift(new TextRun({ text: prefix, size: 24 }))
                results.push(new Paragraph({
                  children: runs,
                  spacing: { after: 60 },
                  indent: { left: 720 },
                }))
              }
            })
          }
        })
      } else if (node.type === 'blockquote') {
        node.content?.forEach(child => {
          const paras = blockToParagraphs(child)
          paras.forEach(p => {
            results.push(new Paragraph({
              children: inlineToRuns((child as TiptapNode).content),
              indent: { left: 720 },
              spacing: { after: 120 },
            }))
          })
        })
      } else if (node.type === 'doc') {
        node.content?.forEach(child => {
          results.push(...blockToParagraphs(child))
        })
      } else {
        // fallback: 尝试递归处理子节点
        if (node.content) {
          node.content.forEach(child => results.push(...blockToParagraphs(child)))
        }
      }

      return results
    }

    // ---- 生成文档 ----
    const docContent = content as TiptapNode | null
    const bodyParagraphs = docContent ? blockToParagraphs(docContent) : [
      new Paragraph({ children: [new TextRun({ text: contentText || '', size: 24 })] })
    ]

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题
          new Paragraph({
            children: [new TextRun({ text: title || '无标题稿件', bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          // 作者信息
          new Paragraph({
            children: [new TextRun({ text: `作者：${authorName}`, size: 22, color: '666666' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          // 正文
          ...bodyParagraphs,
        ],
      }],
    })

    const docBlob = await Packer.toBlob(doc)
    const defaultFileName = `已签发终稿-${authorName}-${title || '稿件'}.docx`

    // 尝试使用 File System Access API 弹窗让用户选择保存位置
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Word 文档',
            accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(docBlob)
        await writable.close()
        return
      } catch (err: unknown) {
        // 用户取消了保存对话框
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    // 降级：直接下载
    const { saveAs } = await import('file-saver')
    saveAs(docBlob, defaultFileName)
  }, [title, content, contentText, authorName])

  const editable = canEdit || (canUseTrackChanges && !isReviewerReadonly)
  const workflowStages = article.workflow_config?.stages || []

  return (
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="h-11 flex items-center justify-between px-4 bg-[var(--surface)] border-b border-[var(--border)] shrink-0 gap-3">
        {/* 左侧：返回 + 标题 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => editorRouter.back()}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div className="w-px h-4 bg-[var(--border)]" />
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setHasUnsavedChanges(true) }}
            placeholder="输入标题…"
            readOnly={!canEdit}
            className="flex-1 text-sm font-semibold text-[var(--foreground)] placeholder:text-[var(--muted)] border-none outline-none bg-transparent min-w-0 text-center"
          />
        </div>

        {/* 右侧：根据角色和状态显示不同内容 */}
        <div className="flex items-center gap-2 shrink-0">

          {/* ========== 审核角色视角（责编/主编共享） ========== */}
          {reviewerViewMode === 'review' && (
            <>
              {/* 状态提示 — 动态显示角色名 */}
<span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1.5">
<span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
{myRoleLabel}审核中 · 已开启修订模式
              </span>
              {/* 保存修改 */}
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition disabled:opacity-40 text-[var(--foreground)]"
              >
                {saving ? '保存中…' : '保存修改'}
              </button>
              {/* 确认审批 — 打开弹窗 */}
              <button
                onClick={() => setShowReviewModal(true)}
                className="btn-primary px-3 py-1 text-xs rounded-md"
              >
                确认审批
              </button>
            </>
          )}

          {reviewerViewMode === 'returned' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              退回学生修改中
            </span>
          )}

          {reviewerViewMode === 'higher_review' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
              {article.current_stage_info?.name || '高级审批中'}
            </span>
          )}

          {reviewerViewMode === 'published' && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              已签发
            </span>
          )}

          {/* ========== 非审核角色视角（学生/老师等，保持原有逻辑） ========== */}
          {reviewerViewMode === 'none' && (
            <>
              {/* 状态提示 */}
              {article.status === 'published' && isAuthor && !isReviewer ? (
                <>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium">
                    🎉 恭喜您的稿件已经签发，期待您的下一篇稿件！
                  </span>
                </>
              ) : article.status === 'archived' ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-medium">
                  已归档
                </span>
              ) : (
                <span className={`text-[11px] px-2 py-0.5 rounded ${STATUS_COLORS[article.status as ArticleStatus]}`}>
                  {article.status === 'draft' ? '草稿' : article.status === 'in_review' ? '审批中' : article.status === 'returned' ? '待修改' : article.status === 'published' ? '已签发' : STATUS_LABELS[article.status as ArticleStatus]}
                  {article.status === 'in_review' && currentStage ? ` · ${currentStage.name}` : ''}
                </span>
              )}

              {canUseTrackChanges && !isReviewerRole && (
                <button
                  onClick={() => setTrackChangesEnabled(!trackChangesEnabled)}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition flex items-center gap-1 ${
                    trackChangesEnabled ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
                  }`}
                >
                  {trackChangesEnabled ? '✎ 修订中' : '修订模式'}
                </button>
              )}

              {/* Word 上传 — 仅草稿和待修改状态可编辑时显示 */}
              {canEdit && (
                <WordUploadButton
                  onParsed={(parsedContent, parsedText, parsedTitle) => {
                    setContent(parsedContent)
                    setContentText(parsedText)
                    if (parsedTitle && (title === '无标题稿件' || !title)) setTitle(parsedTitle)
                    setHasUnsavedChanges(true)
                  }}
                />
              )}

              {/* 草稿状态：保存 + 提交审核 + 删除 */}
              {canEdit && article.status === 'draft' && (
                <>
                  <button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition disabled:opacity-40 text-[var(--foreground)]">
                    {saving ? '保存中…' : '保存'}
                  </button>
                  <button onClick={handleSubmit} disabled={isPending} className="btn-primary px-3 py-1 text-xs rounded-md disabled:opacity-50">提交审核</button>
                </>
              )}
              {/* 待修改状态（学生）：保存修改 + 再次提交审核 */}
              {canEdit && article.status === 'returned' && isAuthor && (
                <>
                  <button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition disabled:opacity-40 text-[var(--foreground)]">
                    {saving ? '保存中…' : '保存修改'}
                  </button>
                  <button onClick={handleSubmit} disabled={isPending} className="btn-primary px-3 py-1 text-xs rounded-md disabled:opacity-50">再次提交审核</button>
                </>
              )}
              {/* 修订模式保存 — 非审核角色的审核者（老师） */}
              {canUseTrackChanges && hasUnsavedChanges && !isReviewerRole && (
                <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1 text-xs rounded-md disabled:opacity-50">保存修订</button>
              )}
              {/* 删除按钮：仅作者在草稿状态 */}
              {isAuthor && article.status === 'draft' && (
                <button onClick={handleDelete} disabled={isPending} className="px-3 py-1 text-xs text-red-500 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">删除</button>
              )}
            </>
          )}

          {/* ========== 导出终稿：所有角色在已签发状态均可见 ========== */}
          {article.status === 'published' && (
            <button
              onClick={handleExportWord}
              className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition text-[var(--foreground)] flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出终稿
            </button>
          )}

          {/* 侧边栏 toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded transition"
            title={sidebarOpen ? '收起面板' : '展开面板'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {sidebarOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />}
            </svg>
          </button>
        </div>
      </div>

      {/* 主体区域：编辑器 + 右侧面板 */}
      <div className="flex flex-1 min-h-0">
        {/* 编辑器区域 — 铺满剩余空间 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 退回意见（学生视角） */}
          {article.review_comment && article.status === 'returned' && !isReviewerRole && (
            <div className="shrink-0 mx-4 mt-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-800 dark:text-orange-400">退回意见</p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{article.review_comment}</p>
            </div>
          )}
          {/* 修订模式提示（审核角色审核模式下不再显示，因为状态已在顶栏） */}
          {trackChangesEnabled && !isReviewerRole && (
<div className="shrink-0 mx-4 mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-2 flex items-center gap-2">
<span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
<p className="text-xs text-red-700 dark:text-red-400">修订模式已开启，你的修改将以红色标记显示。</p>
            </div>
          )}

          {/* Tiptap 编辑器 — flex-1 铺满 */}
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            editable={editable}
            trackChangesEnabled={trackChangesEnabled && !isReviewerReadonly}
            authorName={authorName}
          />
        </div>

        {/* 右侧面板 */}
        {sidebarOpen && (
          <div className="w-72 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0">
            <div className="flex border-b border-[var(--border)]">
              {([
                { key: 'workflow', label: '审批' },
                { key: 'comments', label: '批注' },
                { key: 'revisions', label: '修订' },
                { key: 'logs', label: '日志' },
              ] as { key: SidebarTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 px-2 py-2 text-[11px] font-medium transition ${
                    sidebarTab === tab.key
                      ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'comments' && initialComments.filter(c => !c.resolved).length > 0 && (
                    <span className="ml-1 text-[10px] px-1 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      {initialComments.filter(c => !c.resolved).length}
                    </span>
                  )}
                  {tab.key === 'revisions' && revisions.length > 0 && (
                    <span className="ml-1 text-[10px] px-1 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {revisions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'comments' && (
                <CommentsPanel articleId={article.id} comments={initialComments} currentUserName={authorName} />
              )}
              {sidebarTab === 'workflow' && (
                <div className="overflow-y-auto p-4 h-full">
                  {workflowStages.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">暂无审批流配置</p>
                  ) : (
                    <div className="relative">
                      {workflowStages.map((stage, index) => {
                        const isCompleted = article.status === 'in_review' ? stage.stage_order < (article.current_stage || 0) : article.status === 'published' || article.status === 'archived'
                        const isCurrent = article.status === 'in_review' && stage.stage_order === article.current_stage
                        const isLast = index === workflowStages.length - 1
                        const stageWorkflows = workflows.filter(w => w.stage_order === stage.stage_order)
                        return (
                          <div key={stage.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${isCurrent ? 'border-blue-500 bg-blue-500' : isCompleted ? 'border-green-500 bg-green-500' : 'border-[var(--border)] bg-[var(--surface)]'}`} />
                              {!isLast && <div className={`w-0.5 flex-1 min-h-5 ${isCompleted ? 'bg-green-300' : 'bg-[var(--border)]'}`} />}
                            </div>
                            <div className="pb-5 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-medium ${isCurrent ? 'text-blue-700 dark:text-blue-400' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-[var(--muted)]'}`}>{stage.name}</span>
                                {isCurrent && <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-0.5 rounded">当前</span>}
                                {isCompleted && <span className="text-[10px] text-green-600">✓</span>}
                              </div>
                              <p className="text-[10px] text-[var(--muted)] mt-0.5">{WORKFLOW_ROLE_LABELS[stage.role_required]}{stage.is_final ? ' · 终审签发' : ''}</p>
                              {stageWorkflows.map(w => (
                                <div key={w.id} className="text-[10px] bg-[var(--surface-raised)] rounded px-2 py-1 mt-1.5">
                                  <span className="text-[var(--foreground)]">{w.user?.full_name || '未知'}</span>
                                  <span className="text-[var(--muted)] ml-1">{w.action === 'approve' ? '通过' : w.action === 'return_prev' ? '退回上级' : '退回记者'}</span>
                                  {w.comment && <p className="text-[var(--muted)] mt-0.5">{w.comment}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {sidebarTab === 'revisions' && (
                <div className="overflow-y-auto p-4 h-full space-y-2">
                  {/* 顶部操作栏：全部接受 / 全部拒绝 */}
                  {revisions.length > 0 && (
                    <div className="flex gap-1.5 pb-2 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
                      <button
                        onClick={handleAcceptAll}
                        className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded-md text-[11px] font-medium hover:bg-green-700 transition"
                      >
                        全部接受
                      </button>
                      <button
                        onClick={handleRejectAll}
                        className="flex-1 px-2 py-1.5 border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 rounded-md text-[11px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        全部拒绝
                      </button>
                    </div>
                  )}

                  {/* 空状态提示 */}
                  {revisions.length === 0 && (
                    <p className="text-xs text-[var(--muted)]">
                      {trackChangesEnabled
                        ? '暂无修订记录，编辑内容后修订将在此显示'
                        : '修订模式未开启'}
                    </p>
                  )}

                  {/* 修订记录列表 */}
                  {revisions.map((rev, idx) => (
                    <div
                      key={rev.id}
                      className="bg-[var(--surface-raised)] rounded-lg p-2.5 border-l-2 border-red-400 cursor-pointer hover:bg-[var(--surface-hover)] transition"
                      onClick={() => handleNavigateRevision(rev.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[var(--foreground)]">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold mr-1">{'①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'[idx] || `(${idx + 1})`}</span>
                          {rev.author}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {new Date(rev.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                        {rev.type === 'insert' && '此处增加了内容'}
                        {rev.type === 'delete' && '此处删除了内容'}
                        {rev.type === 'replace' && '此处替换了内容'}
                      </p>
                      {/* 接受 / 拒绝 按钮 */}
                      <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptRevision(rev.id)}
                          className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition"
                        >
                          接受
                        </button>
                        <button
                          onClick={() => handleRejectRevision(rev.id)}
                          className="flex-1 px-2 py-1 border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 rounded text-[10px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sidebarTab === 'logs' && (
                <div className="overflow-y-auto p-4 h-full space-y-2">
                  {workflows.length === 0 ? <p className="text-xs text-[var(--muted)]">暂无操作日志</p> : workflows.map(w => (
                    <div key={w.id} className="bg-[var(--surface-raised)] rounded-lg p-2.5">
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-[var(--foreground)]">{w.user?.full_name || '未知'}</span><span className="text-[10px] text-[var(--muted)]">{new Date(w.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">节点 {w.stage_order} · {w.action === 'approve' ? '通过' : w.action === 'return_prev' ? '退回上级' : '退回记者'}</p>
                      {w.comment && <p className="text-[10px] text-[var(--foreground)] mt-1 bg-[var(--surface)] rounded px-2 py-1 border border-[var(--border-light)]">{w.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 非审核角色（老师/管理员）的侧边栏审核操作 */}
            {canReviewCurrentStage && (
              <div className="border-t border-[var(--border)] p-3 shrink-0">
                <p className="text-[11px] font-medium text-[var(--foreground)] mb-1.5">审核操作</p>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="审核意见（通过选填，退回必填）" className="w-full border border-[var(--border)] rounded-lg p-2 text-xs resize-none h-16 form-input bg-[var(--surface)] text-[var(--foreground)]" />
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={() => handleTransition('approve')} disabled={isPending} className="flex-1 px-2 py-1 bg-green-600 text-white rounded-md text-[11px] hover:bg-green-700 transition disabled:opacity-50">通过</button>
                  <button onClick={() => handleTransition('return_prev')} disabled={isPending} className="flex-1 px-2 py-1 border border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400 rounded-md text-[11px] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-50">退回上级</button>
                </div>
                <button onClick={() => handleTransition('return_reporter')} disabled={isPending} className="w-full mt-1.5 px-2 py-1 border border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 rounded-md text-[11px] hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">退回记者</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="h-7 flex items-center justify-between px-4 bg-[var(--surface)] border-t border-[var(--border)] shrink-0 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span>{contentText.length} 字</span>
          {hasUnsavedChanges && <span className="text-orange-500">● 未保存</span>}
          {!hasUnsavedChanges && lastSavedAt && <span className="text-green-600">✓ {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
          {saving && <span className="text-blue-500">保存中…</span>}
        </div>
        <span>{deptName}</span>
      </div>

      {/* ========== 审核角色审核弹窗（责编/主编共享，只有通过和退回学生） ========== */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-[var(--card-border)]">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-bold text-[var(--foreground)]">审核操作</h3>
            </div>

            <div className="px-6 pb-4">
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="审核意见（通过选填，退回必填）"
                rows={4}
                className="w-full border border-[var(--border)] rounded-xl p-3 text-sm resize-none form-input bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
              />
            </div>

            <div className="px-6 pb-4 space-y-2.5">
              {/* 通过按钮 */}
              <button
                onClick={() => handleReviewerAction('approve')}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {isPending ? '处理中…' : isFinalReviewer ? '通过并签发' : '通过'}
              </button>
              {/* 退回学生按钮 */}
              <button
                onClick={() => handleReviewerAction('return_reporter')}
                disabled={isPending}
                className="w-full px-4 py-2.5 border border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
              >
                {isPending ? '处理中…' : '退回学生'}
              </button>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-full px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-hover)] transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
