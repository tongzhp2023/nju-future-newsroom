import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTopics, getUserRolesInDepartment, createArticle } from '@/lib/actions'
import { TOPIC_STATUS_COLORS } from '@/lib/types'
import type { TopicStatus } from '@/lib/types'
import Link from 'next/link'
import { SubmitTopicButton } from './submit-topic-button'

export default async function TopicsPage({
  params,
  searchParams,
}: {
  params: Promise<{ deptId: string }>
  searchParams: Promise<{ status?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId } = await params
  const sp = await searchParams
  const rawStatus = sp.status
  const statusFilter = (rawStatus && rawStatus !== 'all' ? rawStatus : undefined) as TopicStatus | undefined
  const filterMode = sp.filter

  const [allTopics, roles] = await Promise.all([
    getTopics(deptId, statusFilter),
    getUserRolesInDepartment(deptId),
  ])

  // 判断是否是纯学生角色
  const isReporter = roles.includes('reporter') && !roles.some(r => ['editor', 'chief_editor', 'supervisor', 'admin'].includes(r))
  const isSupervisor = roles.includes('supervisor')

  // 学生只看自己的选题
  const topics = isReporter
    ? allTopics.filter(t => t.author_id === user.id)
    : allTopics

  const displayedTopics =
    filterMode === 'pending_review'
      ? topics.filter((t) => t.status === 'pending')
      : topics

  // 学生 Tab 结构：全部 | 已通过 | 草稿 | 审核中 | 已驳回
  const reporterTabs: { key: string; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'approved', label: '已通过' },
    { key: 'draft', label: '草稿' },
    { key: 'pending', label: '审核中' },
    { key: 'rejected', label: '已驳回' },
  ]

  // 责编/主编/老师的 Tab 结构
  const reviewerTabs: { key: string; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'pending', label: '待审批' },
    { key: 'approved', label: '已通过' },
    { key: 'needs_revision', label: '需修改' },
    { key: 'rejected', label: '已驳回' },
  ]

  const statusTabs = isReporter ? reporterTabs : reviewerTabs

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">选题管理</h2>
        <Link
          href={`/dashboard/dept/${deptId}/topics/new`}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
        >
          + 申报选题
        </Link>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusTabs.map((tab) => {
          const isActive =
            tab.key === 'all'
              ? !statusFilter && filterMode !== 'pending_review'
              : statusFilter === tab.key && filterMode !== 'pending_review'
          const href =
            tab.key === 'all'
              ? `/dashboard/dept/${deptId}/topics`
              : `/dashboard/dept/${deptId}/topics?status=${tab.key}`
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
        {isSupervisor && (
          <Link
            href={`/dashboard/dept/${deptId}/topics?filter=pending_review`}
            className={`px-3.5 py-1.5 rounded-full text-sm transition ${
              filterMode === 'pending_review'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
            }`}
          >
            待我审批
          </Link>
        )}
      </div>

      {/* 选题列表 */}
      {displayedTopics.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无选题</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/dashboard/dept/${deptId}/topics/${topic.id}`}
              className="card-hover block bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4 px-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[var(--foreground)] truncate">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {topic.author?.full_name || '未知作者'} ·{' '}
                    {new Date(topic.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {/* 学生角色的快捷操作 */}
                  {isReporter && topic.status === 'approved' && !topic.article_id && (
                    <form action={createArticle.bind(null, deptId)}>
                      <button
                        type="submit"
                        className="text-[11px] px-2.5 py-1 rounded font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition"
                      >
                        开始写稿
                      </button>
                    </form>
                  )}
                  {isReporter && topic.status === 'approved' && topic.article_id && (
                    <Link
                      href={`/dashboard/dept/${deptId}/articles/${topic.article_id}/edit`}
                      className="text-[11px] px-2.5 py-1 rounded font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                    >
                      已创建稿件 →
                    </Link>
                  )}
                  {isReporter && topic.status === 'draft' && (
                    <SubmitTopicButton topicId={topic.id} />
                  )}
                  {isReporter && (topic.status === 'rejected' || topic.status === 'needs_revision') && (
                    <span className="text-[11px] px-2.5 py-1 rounded font-medium bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                      查看意见并修改
                    </span>
                  )}
                  {/* 审核者的待审批标记 */}
                  {isSupervisor && topic.status === 'pending' && (
                    <span className="text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                      待审批
                    </span>
                  )}
                  {/* 状态标签 */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      getTopicStatusColor(topic.status)
                    }`}
                  >
                    {getTopicStatusLabel(topic.status)}
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

function getTopicStatusLabel(status: TopicStatus): string {
  const labels: Record<TopicStatus, string> = {
    draft: '草稿',
    pending: '审核中',
    approved: '已通过',
    needs_revision: '待修改',
    rejected: '已驳回',
  }
  return labels[status]
}

function getTopicStatusColor(status: TopicStatus): string {
  const colors: Record<TopicStatus, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    approved: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    needs_revision: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    rejected: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  }
  return colors[status]
}
