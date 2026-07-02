import { getCommonIssues, getDepartments } from '@/lib/actions'
import { COMMON_ISSUE_CATEGORIES } from '@/lib/types'
import Link from 'next/link'

export default async function CommonIssuesPage() {
  const [issues, departments] = await Promise.all([
    getCommonIssues(),
    getDepartments(),
  ])

  // 按分类分组
  const issuesByCategory = COMMON_ISSUE_CATEGORIES.map(cat => ({
    category: cat,
    items: issues.filter(i => i.category === cat),
  }))

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">共性问题</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          指导老师从各稿件中提炼的典型写作问题，帮助同学们避免类似错误
        </p>
      </div>

      {/* 统计概览 */}
      {issues.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {issuesByCategory.filter(g => g.items.length > 0).map(group => (
            <div key={group.category} className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
              <p className="text-2xl font-bold text-[var(--foreground)]">{group.items.length}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{group.category}</p>
            </div>
          ))}
        </div>
      )}

      {issues.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无共性问题记录</p>
          <p className="text-xs text-[var(--muted)] mt-1">指导老师可在审稿时标记共性问题</p>
        </div>
      ) : (
        <div className="space-y-8">
          {issuesByCategory.filter(g => g.items.length > 0).map(group => (
            <section key={group.category}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-[var(--foreground)]">{group.category}</h2>
                <span className="text-xs text-[var(--muted)] bg-[var(--surface-active)] px-2 py-0.5 rounded-full">
                  {group.items.length} 条
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map(issue => (
                  <div
                    key={issue.id}
                    className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5"
                  >
                    {/* 原文 */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-[var(--muted)] mb-1">问题原文</p>
                      <p className="text-sm text-[var(--foreground)] bg-[var(--surface-active)] rounded-lg px-3 py-2 leading-relaxed">
                        {issue.original_text}
                      </p>
                    </div>
                    {/* 修改意见 */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-[var(--muted)] mb-1">修改意见</p>
                      <p className="text-sm text-[var(--foreground)] leading-relaxed">
                        {issue.revision_comment}
                      </p>
                    </div>
                    {/* 来源 */}
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      {issue.article && (
                        <Link
                          href={`/dashboard/dept/${issue.department_id}/articles/${issue.article.id}/edit`}
                          className="hover:text-[var(--foreground)] transition flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {issue.article.title}
                        </Link>
                      )}
                      {issue.department && (
                        <>
                          <span>·</span>
                          <span>{issue.department.name}</span>
                        </>
                      )}
                      {issue.marker && (
                        <>
                          <span>·</span>
                          <span>标记人：{issue.marker.full_name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{new Date(issue.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
