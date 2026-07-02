import { getTeachingStats, getExcellentArticles } from '@/lib/actions'
import Link from 'next/link'

export default async function ShowcasePage() {
  const [stats, excellentArticles] = await Promise.all([
    getTeachingStats(),
    getExcellentArticles(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">教学展示区</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          南京大学未来编辑部智慧课程教学成果一览
        </p>
      </div>

      {/* 全局统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="已签发报道" value={stats.publishedArticles} icon="doc" />
        <StatCard label="选题申报" value={stats.totalTopics} icon="topic" />
        <StatCard label="参与学生" value={stats.totalMembers} icon="user" />
        <StatCard label="编辑部" value={stats.departmentCount} icon="dept" />
      </div>

      {/* 各编辑部统计 */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">各编辑部概况</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.deptStats.map(dept => (
            <Link
              key={dept.id}
              href={`/dashboard/dept/${dept.id}`}
              className="card-hover bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--card-border)] group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:opacity-70 transition">
                  {dept.name}
                </h3>
                <span className="text-xs text-[var(--muted)]">{dept.memberCount} 人</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-[var(--foreground)]">{dept.publishedArticles}</p>
                  <p className="text-[10px] text-[var(--muted)]">已签发</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--foreground)]">{dept.totalArticles}</p>
                  <p className="text-[10px] text-[var(--muted)]">总稿件</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--foreground)]">{dept.approvedTopics}</p>
                  <p className="text-[10px] text-[var(--muted)]">已通过选题</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 优秀作品精选 */}
      {excellentArticles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">优秀作品精选</h2>
            <Link href="/dashboard/excellent" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {excellentArticles.slice(0, 6).map(article => (
              <Link
                key={article.id}
                href={`/dashboard/dept/${article.department_id}/articles/${article.id}/edit`}
                className="card-hover bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--card-border)] group"
              >
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: Math.min(article.excellence_level || 1, 5) }).map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:opacity-70 transition line-clamp-2 mb-1">
                  {article.title}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {article.author?.full_name} · {article.department?.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    doc: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    topic: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    user: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    dept: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-[var(--surface-active)] flex items-center justify-center text-[var(--foreground)]">
          {icons[icon]}
        </div>
        <span className="text-xs text-[var(--muted)]">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-[var(--foreground)]">{value}</p>
    </div>
  )
}
