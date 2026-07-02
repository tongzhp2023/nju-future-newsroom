import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getArticles, getUserRolesInDepartment, createArticle, getTopics, getActiveWorkflow } from '@/lib/actions'
import { STATUS_COLORS } from '@/lib/types'
import type { ArticleStatus, ArticleWithDetails } from '@/lib/types'
import Link from 'next/link'
import { SubmitArticleButton } from './submit-button'

export default async function DeptArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ deptId: string }>
  searchParams: Promise<{ status?: string; pending_me?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId } = await params
  const sp = await searchParams
  const rawStatus = sp.status
  const statusFilter = (rawStatus && rawStatus !== 'all' ? rawStatus : undefined) as ArticleStatus | undefined
  const pendingMe = sp.pending_me === '1'
  const reviewerTab = sp.tab || 'all' // 审核角色 Tab key

  const [allArticles, userRoles, approvedTopics, workflow] = await Promise.all([
    getArticles(deptId, statusFilter),
    getUserRolesInDepartment(deptId),
    getTopics(deptId, 'approved'),
    getActiveWorkflow(deptId),
  ])

  // ---- 角色判断 ----
  const isReporter = userRoles.includes('reporter') && !userRoles.some(r => ['editor', 'chief_editor', 'supervisor', 'admin'].includes(r))
  const isEditor = userRoles.includes('editor') && !userRoles.some(r => ['chief_editor', 'supervisor', 'admin'].includes(r))
  const isChiefEditor = userRoles.includes('chief_editor') && !userRoles.some(r => ['supervisor', 'admin'].includes(r))
  const isSupervisor = userRoles.includes('supervisor')
  // 责编/主编/指导老师 —— 共享审核角色 UI（无新建稿件/申报选题）
  const isReviewerRole = isEditor || isChiefEditor || isSupervisor
  const canReview = userRoles.some(r => ['editor', 'chief_editor', 'supervisor'].includes(r))

  // 审核角色各自的审批节点 stage_order
  const myStageOrder = isEditor
    ? (workflow?.stages.find(s => s.role_required === 'editor')?.stage_order ?? 1)
    : isChiefEditor
      ? (workflow?.stages.find(s => s.role_required === 'chief_editor')?.stage_order ?? 2)
      : isSupervisor
        ? (workflow?.stages.find(s => s.role_required === 'supervisor')?.stage_order ?? 3)
        : 0

  // ---- 审核角色视角（责编/主编/指导老师）：按 Tab 分类稿件 ----
  if (isReviewerRole) {
    // 审核角色的可见稿件范围
    const reviewerAllArticles = (() => {
      if (isEditor) {
        // 责编：所有非草稿稿件
        return allArticles.filter(a => a.status !== 'draft')
      }
      if (isChiefEditor) {
        // 主编：in_review 且 current_stage >= 主编节点 + published + returned
        const chiefStage = workflow?.stages.find(s => s.role_required === 'chief_editor')?.stage_order ?? 2
        return allArticles.filter(a =>
          (a.status === 'in_review' && a.current_stage !== null && a.current_stage >= chiefStage) ||
          a.status === 'published' ||
          a.status === 'returned'
        )
      }
      // 指导老师：in_review 且 current_stage >= 老师节点 + published + returned
      const supervisorStage = workflow?.stages.find(s => s.role_required === 'supervisor')?.stage_order ?? 3
      return allArticles.filter(a =>
        (a.status === 'in_review' && a.current_stage !== null && a.current_stage >= supervisorStage) ||
        a.status === 'published' ||
        a.status === 'returned'
      )
    })()

    // 按 Tab 分类
    const pendingMeArticles = reviewerAllArticles.filter(
      a => a.status === 'in_review' && a.current_stage === myStageOrder
    )
    const returnedToStudentArticles = reviewerAllArticles.filter(a => a.status === 'returned')
    const higherReviewArticles = reviewerAllArticles.filter(
      a => a.status === 'in_review' && a.current_stage !== null && a.current_stage > myStageOrder
    )
    const publishedArticles = reviewerAllArticles.filter(a => a.status === 'published')

    // 根据当前 Tab 确定显示的稿件
    const filteredArticles = (() => {
      switch (reviewerTab) {
        case 'pending_me': return pendingMeArticles
        case 'returned': return returnedToStudentArticles
        case 'higher_review': return higherReviewArticles
        case 'published': return publishedArticles
        default: return reviewerAllArticles // all
      }
    })()

    // 指导老师的 Tab 结构：没有“高级审批”（老师是终审，没有更高级节点）
    const reviewerTabs = isSupervisor ? [
      { key: 'all', label: '全部', count: reviewerAllArticles.length },
      { key: 'pending_me', label: '待我审批', count: pendingMeArticles.length },
      { key: 'returned', label: '退回修改', count: returnedToStudentArticles.length },
      { key: 'published', label: '已签发', count: publishedArticles.length },
    ] : [
      // 责编/主编的 Tab 结构
      { key: 'all', label: '全部', count: reviewerAllArticles.length },
      { key: 'pending_me', label: '待我审批', count: pendingMeArticles.length },
      { key: 'returned', label: '退回学生', count: returnedToStudentArticles.length },
      { key: 'higher_review', label: '高级审批', count: higherReviewArticles.length },
      { key: 'published', label: '已签发', count: publishedArticles.length },
    ]

    return (
      <div className="p-6 max-w-6xl mx-auto">
        {/* 顶部操作栏 — 审核角色无新建稿件按钮 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">稿件管理</h2>
        </div>

        {/* Tab 筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {reviewerTabs.map(tab => {
            const isActive = reviewerTab === tab.key
            const href = tab.key === 'all'
              ? `/dashboard/dept/${deptId}/articles`
              : `/dashboard/dept/${deptId}/articles?tab=${tab.key}`

            // 待我审批 Tab 使用特殊颜色
            const activeClass = tab.key === 'pending_me' && isActive
              ? 'bg-blue-600 text-white'
              : isActive
                ? 'btn-primary'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]'

            return (
              <Link
                key={tab.key}
                href={href}
                className={`px-3.5 py-1.5 rounded-full text-sm transition ${activeClass}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[11px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* 稿件列表 */}
        {filteredArticles.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--muted)]">暂无稿件</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map(article => {
              // 根据稿件实际状态确定右侧显示内容
              const rightSide = getReviewerCardRightSide(article, myStageOrder, reviewerTab, workflow)
              return (
                <Link
                  key={article.id}
                  href={`/dashboard/dept/${deptId}/articles/${article.id}/edit`}
                  className="card-hover block bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4 px-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[var(--foreground)] truncate">
                        {article.title || '无标题稿件'}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {article.author?.full_name || '未知作者'} ·{' '}
                        {new Date(article.updated_at).toLocaleDateString('zh-CN', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {rightSide}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ---- 学生视角（原有逻辑） ----

  // 学生只看自己的稿件（已归档 Tab 除外，展示全编辑部已签发稿件）
  const articles = (() => {
    if (!isReporter) return allArticles
    if (statusFilter === 'archived') {
      return allArticles.filter(a => a.status === 'published' || a.status === 'archived')
    }
    return allArticles.filter(a => a.author_id === user.id)
  })()

  // 已通过但未创建稿件的选题
  const pendingArticleTopics = approvedTopics.filter(
    t => t.author_id === user.id && !t.article_id
  )

  const filteredArticles = pendingMe
    ? articles.filter(a => a.status === 'in_review' && a.author_id !== user.id)
    : articles

  // 学生的 Tab 结构
  const reporterTabs: { key: string; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'in_review', label: '审批中' },
    { key: 'returned', label: '待修改' },
    { key: 'published', label: '已签发' },
    { key: 'archived', label: '已归档' },
  ]

  // 老师/管理员的 Tab 结构
  const supervisorTabs: { key: string; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'in_review', label: '审批中' },
    { key: 'returned', label: '待修改' },
    { key: 'published', label: '已签发' },
    { key: 'archived', label: '已归档' },
  ]

  const statusTabs = isReporter ? reporterTabs : supervisorTabs

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">稿件管理</h2>
        <form action={createArticle.bind(null, deptId)}>
          <button
            type="submit"
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            + 新建稿件
          </button>
        </form>
      </div>

      {/* 选题已通过，等待创建稿件 */}
      {pendingArticleTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">选题已通过，等待创建稿件</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingArticleTopics.map(topic => (
              <div
                key={topic.id}
                className="bg-[var(--card-bg)] rounded-xl border-2 border-[var(--border)] p-4"
              >
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-1 truncate">{topic.title}</h4>
                <p className="text-xs text-[var(--muted)] mb-3">
                  {new Date(topic.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 通过审批
                </p>
                <form action={createArticle.bind(null, deptId)}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-[var(--foreground)] bg-[var(--surface-active)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition"
                  >
                    开始写稿
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 状态筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusTabs.map(tab => {
          const isActive =
            (tab.key === 'all' && !statusFilter && !pendingMe) || statusFilter === tab.key
          const href =
            tab.key === 'all'
              ? `/dashboard/dept/${deptId}/articles`
              : `/dashboard/dept/${deptId}/articles?status=${tab.key}`
          return (
            <Link
              key={tab.key}
              href={href}
              className={`px-3.5 py-1.5 rounded-full text-sm transition ${
                isActive
                  ? 'btn-primary'
                  : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}

        {canReview && (
          <Link
            href={`/dashboard/dept/${deptId}/articles?status=in_review&pending_me=1`}
            className={`px-3.5 py-1.5 rounded-full text-sm transition ${
              pendingMe
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            }`}
          >
            待我审核
          </Link>
        )}
      </div>

      {/* 稿件列表 */}
      {filteredArticles.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无稿件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map(article => (
            <Link
              key={article.id}
              href={`/dashboard/dept/${deptId}/articles/${article.id}/edit`}
              className="card-hover block bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4 px-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[var(--foreground)] truncate">
                    {article.title || '无标题稿件'}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {article.author?.full_name || '未知作者'} ·{' '}
                    {new Date(article.updated_at).toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {/* 学生角色的快捷操作 */}
                  {isReporter && article.status === 'draft' && (
                    <SubmitArticleButton articleId={article.id} />
                  )}
                  {isReporter && article.status === 'returned' && (
                    <span className="text-[11px] px-2.5 py-1 rounded font-medium bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                      去修改
                    </span>
                  )}
                  {/* 审核者的待审核标记 */}
                  {canReview &&
                    article.status === 'in_review' &&
                    article.author_id !== user.id && (
                      <span className="text-[11px] bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                        待我审核
                      </span>
                    )}
                  {/* 状态标签 */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      getStatusColor(article.status as ArticleStatus)
                    }`}
                  >
                    {article.status === 'in_review' && article.current_stage_info
                      ? article.current_stage_info.name
                      : getStatusLabel(article.status as ArticleStatus)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- 审核角色卡片右侧内容（责编/主编共享） ----
function getReviewerCardRightSide(
  article: ArticleWithDetails,
  myStageOrder: number,
  currentTab: string,
  workflow: { stages: { stage_order: number; name: string; role_required: string }[] } | null,
) {
  // 待我审批 Tab：右侧显示"去审批"快捷键
  if (article.status === 'in_review' && article.current_stage === myStageOrder) {
    return (
      <span className="text-[11px] px-3 py-1.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
        去审批
      </span>
    )
  }

  // 退回学生 Tab：右侧仅显示"退回学生"状态
  if (article.status === 'returned') {
    return (
      <span className="text-[11px] px-2.5 py-1 rounded font-medium bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
        退回学生
      </span>
    )
  }

  // 高级审批 Tab：右侧显示当前所处的审批节点名称
  if (article.status === 'in_review' && article.current_stage !== null && article.current_stage > myStageOrder) {
    const currentStageName = workflow?.stages.find(s => s.stage_order === article.current_stage)?.name || '高级审批中'
    return (
      <span className="text-[11px] px-2.5 py-1 rounded font-medium bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
        {currentStageName}
      </span>
    )
  }

  // 已签发 Tab：右侧仅显示"已签发"
  if (article.status === 'published') {
    return (
      <span className="text-[11px] px-2.5 py-1 rounded font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
        已签发
      </span>
    )
  }

  // fallback
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${getStatusColor(article.status as ArticleStatus)}`}>
      {getStatusLabel(article.status as ArticleStatus)}
    </span>
  )
}

function getStatusLabel(status: ArticleStatus): string {
  const labels: Record<ArticleStatus, string> = {
    draft: '草稿',
    in_review: '审批中',
    returned: '待修改',
    published: '已签发',
    archived: '已归档',
  }
  return labels[status]
}

function getStatusColor(status: ArticleStatus): string {
  const colors: Record<ArticleStatus, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    in_review: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    returned: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    published: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    archived: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  }
  return colors[status]
}
