import { getExcellentArticles } from '@/lib/actions'
import Link from 'next/link'

export default async function ExcellentArticlesPage() {
  const articles = await getExcellentArticles()

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">优秀稿件</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          经指导老师评选的优秀新闻报道作品，供同学们学习参考
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无优秀稿件标记</p>
          <p className="text-xs text-[var(--muted)] mt-1">指导老师可在稿件签发后标记优秀等级</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article) => {
            const stars = article.excellence_level || 1
            return (
              <Link
                key={article.id}
                href={`/dashboard/dept/${article.department_id}/articles/${article.id}/edit`}
                className="card-hover block bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--card-border)] group"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < stars ? 'text-amber-400' : 'text-[var(--border)]'}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-xs font-medium text-amber-500">
                    {stars >= 5 ? '特优' : stars >= 4 ? '优秀' : '良好'}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[var(--foreground)] group-hover:opacity-70 transition mb-2 line-clamp-2">
                  {article.title}
                </h3>

                {article.content_text && (
                  <p className="text-xs text-[var(--muted)] line-clamp-3 leading-relaxed mb-3">
                    {article.content_text.slice(0, 150)}
                  </p>
                )}

                {article.excellence_reason && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <span className="font-medium">评语：</span>{article.excellence_reason}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">
                    {article.author?.full_name || '未知'}
                  </span>
                  <span>·</span>
                  <span>{article.department?.name}</span>
                  {article.published_at && (
                    <>
                      <span>·</span>
                      <span>{new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
