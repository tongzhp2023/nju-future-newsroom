import { getDepartment, getUserRolesInDepartment, getActiveWorkflow, getArticles, getProfile } from '@/lib/actions'
import { STATUS_LABELS, ROLE_LABELS } from '@/lib/types'
import type { ArticleStatus, ArticleWithDetails } from '@/lib/types'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CreateArticleButton from './create-article-button'

export default async function DeptOverviewPage({
  params,
}: {
  params: Promise<{ deptId: string }>
}) {
  const { deptId } = await params

  const department = await getDepartment(deptId)
  if (!department) redirect('/dashboard')

  const [userRoles, workflow, allArticles, profile] = await Promise.all([
    getUserRolesInDepartment(deptId),
    getActiveWorkflow(deptId),
    getArticles(deptId),
    getProfile(),
  ])

  // ---- 角色判断 ----
  const isReporter = userRoles.includes('reporter') && !userRoles.some(r => ['editor', 'chief_editor', 'supervisor', 'admin'].includes(r))
  const isEditor = userRoles.includes('editor') && !userRoles.some(r => ['chief_editor', 'supervisor', 'admin'].includes(r))
  const isChiefEditor = userRoles.includes('chief_editor') && !userRoles.some(r => ['supervisor', 'admin'].includes(r))
  const isSupervisor = userRoles.includes('supervisor')
  // 责编/主编/指导老师 —— 共享审核角色 UI（无申报选题/新建稿件）
  const isReviewerRole = isEditor || isChiefEditor || isSupervisor

  // 审核角色各自的审批节点 stage_order
  const myStageOrder = isEditor
    ? (workflow?.stages.find(s => s.role_required === 'editor')?.stage_order ?? 1)
    : isChiefEditor
      ? (workflow?.stages.find(s => s.role_required === 'chief_editor')?.stage_order ?? 2)
      : isSupervisor
        ? (workflow?.stages.find(s => s.role_required === 'supervisor')?.stage_order ?? 3)
        : 0
  const myRoleLabel = isEditor ? '责编' : isChiefEditor ? '主编' : isSupervisor ? '指导老师' : ''

  // ---- 各角色可见稿件范围 ----
  // 学生：自己创建的所有稿件（任意状态）
  // 责编：该编辑部所有学生提交过审核的稿件（非草稿）
  // 主编：责编提交过的稿件（in_review 且 current_stage >= 主编节点，或已签发，或退回中）
  // 指导老师：主编提交过的稿件（in_review 且 current_stage >= 老师节点，或已签发，或退回中）
  const articles = (() => {
    if (isReporter && profile) {
      return allArticles.filter(a => a.author_id === profile.id)
    }
    if (isEditor) {
      // 责编看所有非草稿稿件（学生提交过审核的）
      return allArticles.filter(a => a.status !== 'draft')
    }
    if (isChiefEditor) {
      // 主编看到的是责编提交过的稿件：
      // in_review 且 current_stage >= 主编节点（责编已通过）
      // + published（已走完全部流程）
      // + returned（退回中的稿件，可能是主编自己退回的）
      const chiefStage = workflow?.stages.find(s => s.role_required === 'chief_editor')?.stage_order ?? 2
      return allArticles.filter(a =>
        (a.status === 'in_review' && a.current_stage !== null && a.current_stage >= chiefStage) ||
        a.status === 'published' ||
        a.status === 'returned'
      )
    }
    if (isSupervisor) {
      // 指导老师看到的是主编提交过的稿件：
      // in_review 且 current_stage >= 老师节点（主编已通过）
      // + published（已走完全部流程）
      // + returned（老师退回学生的稿件）
      const supervisorStage = workflow?.stages.find(s => s.role_required === 'supervisor')?.stage_order ?? 3
      return allArticles.filter(a =>
        (a.status === 'in_review' && a.current_stage !== null && a.current_stage >= supervisorStage) ||
        a.status === 'published' ||
        a.status === 'returned'
      )
    }
    return allArticles
  })()

  // ---- 审核角色通用数据分类（责编/主编共享） ----
  // 待我审批：in_review 且当前审批节点 = 我的节点
  const reviewerPendingMe = articles.filter(
    a => a.status === 'in_review' && a.current_stage === myStageOrder
  )
  // 退回学生：returned 状态的稿件
  const reviewerReturnedToStudent = articles.filter(a => a.status === 'returned')
  // 高级审批：in_review 且已经过了我的节点（current_stage > myStageOrder）
  const reviewerHigherReview = articles.filter(
    a => a.status === 'in_review' && a.current_stage !== null && a.current_stage > myStageOrder
  )
  // 已签发
  const reviewerPublished = articles.filter(a => a.status === 'published')

  // ---- 学生/通用数据分类 ----
  const totalArticles = articles.length
  const pendingReviewArticles = articles.filter((a) => a.status === 'in_review')
  const returnedArticles = articles.filter((a) => a.status === 'returned')
  const publishedArticles = articles.filter((a) => a.status === 'published')

  // 最新稿件
  const latestArticle = articles[0]

  // 最近稿件：各角色都基于自己可见的 articles 取前 5 条
  const recentArticles = articles.slice(0, 5)

  // ---- 统计卡片 ----
  const stats = isSupervisor ? [
    // 指导老师视角：3 张卡片（稿件总数/待我审批/已签发）
    {
      label: '稿件总数',
      value: totalArticles,
      sub: latestArticle ? `最新稿件：${latestArticle.title || '无标题稿件'}` : '暂无稿件',
      color: 'text-[var(--foreground)]',
      bg: 'bg-[var(--surface-raised)]',
      borderColor: 'border-[var(--card-border)]',
      href: `/dashboard/dept/${deptId}/articles`,
    },
    {
      label: '待我审批',
      value: reviewerPendingMe.length,
      sub: reviewerPendingMe[0] ? reviewerPendingMe[0].title : '暂无待审批稿件',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      href: `/dashboard/dept/${deptId}/articles?tab=pending_me`,
    },
    {
      label: '已签发',
      value: reviewerPublished.length,
      sub: reviewerPublished[0] ? `最新签发：${reviewerPublished[0].title}` : '暂无签发稿件',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      href: `/dashboard/dept/${deptId}/articles?tab=published`,
    },
  ] : isReviewerRole ? [
    // 责编/主编视角：4 张卡片
    {
      label: '待我审批',
      value: reviewerPendingMe.length,
      sub: reviewerPendingMe[0] ? reviewerPendingMe[0].title : '暂无待审批稿件',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      href: `/dashboard/dept/${deptId}/articles?tab=pending_me`,
    },
    {
      label: '退回学生',
      value: reviewerReturnedToStudent.length,
      sub: reviewerReturnedToStudent[0] ? reviewerReturnedToStudent[0].title : '暂无退回中稿件',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      href: `/dashboard/dept/${deptId}/articles?tab=returned`,
    },
    {
      label: '高级审批',
      value: reviewerHigherReview.length,
      sub: reviewerHigherReview[0] ? reviewerHigherReview[0].title : '暂无高级审批中稿件',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      href: `/dashboard/dept/${deptId}/articles?tab=higher_review`,
    },
    {
      label: '已签发',
      value: reviewerPublished.length,
      sub: reviewerPublished[0] ? `最新签发：${reviewerPublished[0].title}` : '暂无签发稿件',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      href: `/dashboard/dept/${deptId}/articles?tab=published`,
    },
  ] : isReporter ? [
    // 学生视角：4 张卡片
    {
      label: '稿件总数',
      value: totalArticles,
      sub: latestArticle ? `最新稿件：${latestArticle.title || '无标题稿件'}` : '暂无稿件',
      color: 'text-[var(--foreground)]',
      bg: 'bg-[var(--surface-raised)]',
      borderColor: 'border-[var(--card-border)]',
      href: `/dashboard/dept/${deptId}/articles`,
    },
    {
      label: '待审核',
      value: pendingReviewArticles.length,
      sub: pendingReviewArticles[0] ? pendingReviewArticles[0].title : '暂无待审核稿件',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      href: `/dashboard/dept/${deptId}/articles?status=in_review`,
    },
    {
      label: '待修改',
      value: returnedArticles.length,
      sub: returnedArticles[0] ? returnedArticles[0].title : '暂无待修改稿件',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      href: `/dashboard/dept/${deptId}/articles?status=returned`,
    },
    {
      label: '已签发',
      value: publishedArticles.length,
      sub: publishedArticles[0] ? `最新签发：${publishedArticles[0].title}` : '暂无签发稿件',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      href: `/dashboard/dept/${deptId}/articles?status=published`,
    },
  ] : [
    // 管理员 fallback 视角：3 卡片
    {
      label: '稿件总数',
      value: totalArticles,
      sub: latestArticle ? `最新稿件：${latestArticle.title || '无标题稿件'}` : '暂无稿件',
      color: 'text-[var(--foreground)]',
      bg: 'bg-[var(--surface-raised)]',
      borderColor: 'border-[var(--card-border)]',
      href: `/dashboard/dept/${deptId}/articles`,
    },
    {
      label: '待审核',
      value: pendingReviewArticles.length,
      sub: pendingReviewArticles[0] ? pendingReviewArticles[0].title : '暂无待审核稿件',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      href: `/dashboard/dept/${deptId}/articles?status=in_review`,
    },
    {
      label: '已签发',
      value: publishedArticles.length,
      sub: publishedArticles[0] ? `最新签发：${publishedArticles[0].title}` : '暂无签发稿件',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      href: `/dashboard/dept/${deptId}/articles?status=published`,
    },
  ]

  // 审核角色最近稿件中附带状态信息的函数
  function getReviewerArticleStatusDisplay(article: ArticleWithDetails): { label: string; style: string } {
    if (article.status === 'in_review' && article.current_stage === myStageOrder) {
      return { label: '待我审批', style: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' }
    }
    if (article.status === 'returned') {
      return { label: '退回学生', style: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' }
    }
    if (article.status === 'in_review' && article.current_stage !== null && article.current_stage > myStageOrder) {
      return { label: article.current_stage_info?.name || '高级审批', style: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' }
    }
    if (article.status === 'published') {
      return { label: '已签发', style: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' }
    }
    return { label: getStatusLabel(article.status as ArticleStatus), style: getStatusStyle(article.status as ArticleStatus) }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 编辑部描述 + 角色 */}
      <div className="mb-6">
        {department.description && (
          <p className="text-sm text-[var(--muted)] mb-2">{department.description}</p>
        )}
        <div className="flex items-center gap-2">
          {userRoles.map((role) => (
            <span
              key={role}
              className="text-[11px] px-2 py-0.5 rounded font-medium bg-[var(--surface-active)] text-[var(--foreground)]"
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>

      {/* 统计卡片 — 可点击跳转 */}
      <div className={`grid grid-cols-1 ${(isReporter || isReviewerRole) && !isSupervisor ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-6`}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${s.bg} rounded-xl p-5 border ${s.borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-bold text-[var(--foreground)]">{s.label}</p>
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
            <p className="text-xs text-[var(--muted)] truncate">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* 审批流配置 */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">审批流配置</h2>
        {workflow ? (
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] text-[var(--muted)] mr-1">v{workflow.version}</span>
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md">
              学生申报选题
            </span>
            <ChevronRight />
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md">
              学生提交初稿
            </span>
            <ChevronRight />
            {workflow.stages.map((stage, i) => (
              <span key={stage.id} className="flex items-center">
                <span className="text-xs bg-[var(--surface-active)] text-[var(--foreground)] px-2.5 py-1 rounded-md">
                  {stage.name}
                </span>
                {i < workflow.stages.length - 1 && <ChevronRight />}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">尚未配置审批流</p>
        )}
      </div>

      {/* 快捷操作 — 责编和主编都不显示申报选题和新建稿件 */}
      {!isReviewerRole && (
        <div className="flex gap-3 mb-6">
          <Link
            href={`/dashboard/dept/${deptId}/topics/new`}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition min-w-[120px]"
          >
            + 申报选题
          </Link>
          <CreateArticleButton deptId={deptId} />
        </div>
      )}

      {/* 最近稿件 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">最近稿件</h2>
          <Link
            href={`/dashboard/dept/${deptId}/articles`}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
          >
            查看全部 →
          </Link>
        </div>

        {recentArticles.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              {isReviewerRole ? '暂无提交审核的稿件' : '暂无稿件，点击「新建稿件」开始创作'}
            </p>
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] divide-y divide-[var(--border-light)] overflow-hidden">
            {recentArticles.map((article) => {
              const statusDisplay = (isReviewerRole)
                ? getReviewerArticleStatusDisplay(article)
                : { label: getStatusLabel(article.status as ArticleStatus), style: getStatusStyle(article.status as ArticleStatus) }
              return (
                <Link
                  key={article.id}
                  href={`/dashboard/dept/${deptId}/articles/${article.id}/edit`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-hover)] transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {article.title || '无标题稿件'}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {article.author?.full_name || '未知作者'} ·{' '}
                      {new Date(article.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ml-3 ${statusDisplay.style}`}>
                    {statusDisplay.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ChevronRight() {
  return (
    <svg className="w-3.5 h-3.5 text-[var(--muted)] mx-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function getStatusStyle(status: ArticleStatus): string {
  const styles: Record<ArticleStatus, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    in_review: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    returned: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    published: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    archived: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  }
  return styles[status]
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
