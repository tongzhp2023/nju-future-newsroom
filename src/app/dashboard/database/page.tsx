import { getPublishedArticles, getDepartments } from '@/lib/actions'
import Link from 'next/link'

export default async function DatabasePage() {
  const [articles, departments] = await Promise.all([
    getPublishedArticles(),
    getDepartments(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">报道数据库</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          所有编辑部已签发的新闻报道作品库
        </p>
      </div>

      {/* 统计 */}
      <div className="flex items-center gap-6 mb-8 text-sm">
        <div>
          <span className="text-2xl font-bold text-[var(--foreground)]">{articles.length}</span>
          <span className="text-[var(--muted)] ml-1.5">篇报道</span>
        </div>
        <div className="w-px h-8 bg-[var(--border)]" />
        <div>
          <span className="text-2xl font-bold text-[var(--foreground)]">{departments.length}</span>
          <span className="text-[var(--muted)] ml-1.5">个编辑部</span>
        </div>
      </div>

      {/* 编辑部筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs font-medium text-[var(--muted)] py-1.5">筛选：</span>
        {departments.map(dept => {
          const count = articles.filter(a => a.department_id === dept.id).length
          return (
            <span
              key={dept.id}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)]"
            >
              {dept.name} <span className="text-[var(--muted)]">({count})</span>
            </span>
          )
        })}
      </div>

      {articles.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无已签发的报道</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3">标题</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3 whitespace-nowrap">作者</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3 whitespace-nowrap">编辑部</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3 whitespace-nowrap">签发日期</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-5 py-3 whitespace-nowrap">字数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {articles.map(article => (
                <tr key={article.id} className="hover:bg-[var(--surface-hover)] transition">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/dept/${article.department_id}/articles/${article.id}/edit`}
                      className="text-sm font-medium text-[var(--foreground)] hover:opacity-70 transition"
                    >
                      {article.title}
                    </Link>
                    {article.report_type && (
                      <span className="ml-2 text-xs text-[var(--muted)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                        {article.report_type}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--foreground)] whitespace-nowrap">
                    {article.author?.full_name || '未知'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--muted)] whitespace-nowrap">
                    {article.department?.name}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[var(--muted)] whitespace-nowrap">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[var(--muted)] whitespace-nowrap">
                    {article.content_text ? `${article.content_text.length} 字` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
