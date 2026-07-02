import { getTopic, getUserRolesInDepartment, getProfile } from '@/lib/actions'
import { DEFAULT_TOPIC_FORM_FIELDS } from '@/lib/types'
import type { TopicFormField } from '@/lib/types'
import Link from 'next/link'
import BackButton from '@/components/back-button'
import TopicEditForm from './topic-edit-form'
import TopicReviewForm from './topic-review-form'

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ deptId: string; topicId: string }>
}) {
  const { deptId, topicId } = await params

  const [topic, roles, profile] = await Promise.all([
    getTopic(topicId),
    getUserRolesInDepartment(deptId),
    getProfile(),
  ])

  if (!topic) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-16">
          <p className="text-[var(--muted)] text-lg">选题不存在</p>
          <Link
            href={`/dashboard/dept/${deptId}/topics`}
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            返回选题列表
          </Link>
        </div>
      </div>
    )
  }

  const isSupervisor = roles.includes('supervisor')
  const isAuthor = profile?.id === topic.author_id

  // 获取表单模板
  const rawTemplate = topic.department?.topic_form_template
  const formTemplate: TopicFormField[] =
    rawTemplate && Array.isArray(rawTemplate) && rawTemplate.length > 2
      ? rawTemplate
      : DEFAULT_TOPIC_FORM_FIELDS

  // 按 section 分组（只读模式使用）
  const sections = formTemplate.reduce<Record<string, TopicFormField[]>>((acc, field) => {
    const section = field.section || '其他'
    if (!acc[section]) acc[section] = []
    acc[section].push(field)
    return acc
  }, {})

  // 获取最新审核意见
  const latestReview = topic.reviews && topic.reviews.length > 0
    ? topic.reviews[topic.reviews.length - 1]
    : null

  // ========= 草稿状态：可编辑表单 + 三个按钮 =========
  if (isAuthor && topic.status === 'draft') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
          />
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">编辑选题</h1>
            <p className="text-xs text-[var(--muted)]">{topic.department?.name}</p>
          </div>
        </div>

        {/* 编辑表单 */}
        <TopicEditForm topic={topic} formTemplate={formTemplate} mode="draft" deptId={deptId} />
      </div>
    )
  }

  // ========= 已驳回/需修改状态：顶部驳回原因 + 可编辑表单 + 三个按钮 =========
  if (isAuthor && (topic.status === 'rejected' || topic.status === 'needs_revision')) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
          />
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">修改选题</h1>
            <p className="text-xs text-[var(--muted)]">{topic.department?.name}</p>
          </div>
        </div>

        {/* 顶部状态 + 驳回原因 */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              该选题状态：已驳回
            </span>
          </div>
          {latestReview?.comment && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">驳回原因：</p>
              <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{latestReview.comment}</p>
              {latestReview.reviewer?.full_name && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  —— {latestReview.reviewer.full_name}，
                  {new Date(latestReview.created_at).toLocaleString('zh-CN', {
                    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 编辑表单 */}
        <TopicEditForm topic={topic} formTemplate={formTemplate} mode="rejected" deptId={deptId} />
      </div>
    )
  }

  // ========= 只读模式：已通过 / 审核中 / 其他 =========
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-6">
        <BackButton
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
        />
        <h1 className="text-lg font-bold text-[var(--foreground)] truncate flex-1">{topic.title}</h1>
      </div>

      <div className="space-y-6">
        {/* ====== 顶部状态信息 ====== */}
        {topic.status === 'approved' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                该选题状态：已通过
              </span>
            </div>
            {latestReview?.action === 'approve' && latestReview.comment && (
              <div className="mt-3 pl-7">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">审核意见：</p>
                <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{latestReview.comment}</p>
                {latestReview.reviewer?.full_name && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    —— {latestReview.reviewer.full_name}，
                    {new Date(latestReview.created_at).toLocaleString('zh-CN', {
                      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {topic.status === 'pending' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                该选题状态：审核中
              </span>
            </div>
          </div>
        )}

        {/* ====== 选题内容（只读） ====== */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6">
          <h2 className="text-sm font-medium text-[var(--muted)] mb-4">选题内容</h2>
          <div className="space-y-6">
            {/* 选题标题 */}
            <div>
              <h3 className="text-xs font-medium text-[var(--muted)] mb-1">选题标题</h3>
              <p className="text-[var(--foreground)] font-medium">{topic.title}</p>
            </div>

            {/* 按 section 分组显示表单字段 */}
            {Object.entries(sections).map(([sectionName, fields]) => {
              const hasAnyValue = fields.some(f => topic.form_data?.[f.key])
              if (!hasAnyValue) return null
              return (
                <div key={sectionName}>
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 border-b border-[var(--border)] pb-2">
                    {sectionName}
                  </h3>
                  <div className="space-y-4">
                    {fields.map((field) => {
                      const value = topic.form_data?.[field.key]
                      if (!value) return null
                      return (
                        <div key={field.key}>
                          <h4 className="text-xs font-medium text-[var(--muted)] mb-1">
                            {field.label}
                          </h4>
                          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                            {String(value)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* 如果没有任何表单字段有值 */}
            {!Object.values(sections).some(fields => fields.some(f => topic.form_data?.[f.key])) && (
              <p className="text-sm text-[var(--muted)]">该选题暂未填写详细内容</p>
            )}
          </div>
        </div>

        {/* ====== 已通过且有稿件链接 ====== */}
        {topic.status === 'approved' && topic.article_id && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">选题已通过，关联稿件已创建</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">点击右侧链接前往编辑稿件</p>
            </div>
            <Link
              href={`/dashboard/dept/${deptId}/articles/${topic.article_id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition shrink-0"
            >
              编辑稿件 →
            </Link>
          </div>
        )}

        {/* ====== 审批表单（指导老师 + 待审批状态） ====== */}
        {isSupervisor && topic.status === 'pending' && (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6">
            <h2 className="text-sm font-medium text-[var(--muted)] mb-4">审批操作</h2>
            <TopicReviewForm topicId={topicId} />
          </div>
        )}
      </div>
    </div>
  )
}
