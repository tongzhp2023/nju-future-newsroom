import { getProfile, getMyDepartmentRoles, getNotifications } from '@/lib/actions'
import { ROLE_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function DashboardHomePage() {
  const profile = await getProfile()
  const deptRoles = await getMyDepartmentRoles()
  const notifications = await getNotifications(true)
  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* 欢迎区域 */}
      <div className="rounded-2xl px-8 py-8 mb-8 bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8a] text-white">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-newsreader), serif' }}>
          欢迎回来，{profile?.full_name || '同学'}
        </h1>
        <p className="mt-1.5 text-sm opacity-60">
          {deptRoles.length > 0
            ? `你已加入 ${deptRoles.length} 个编辑部，选择一个开始今天的工作吧`
            : '在左侧「采编审稿系统」中加入一个编辑部开始使用'}
        </p>
      </div>

      {/* 我的编辑部 */}
      {deptRoles.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">我的编辑部</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptRoles.map((dr) => (
              <Link
                key={dr.id}
                href={`/dashboard/dept/${dr.department_id}`}
                className="card-hover block bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--card-border)] group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-active)] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:opacity-70 transition truncate">
                      {dr.department.name}
                    </h3>
                    <span className="text-xs font-medium text-[var(--muted)]">
                      {ROLE_LABELS[dr.role]}
                    </span>
                  </div>
                </div>
                {dr.department.description && (
                  <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {dr.department.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 未读通知 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">未读通知</h2>
          {recentNotifications.length > 0 && (
            <Link
              href="/dashboard/notifications"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
            >
              查看全部 →
            </Link>
          )}
        </div>

        {recentNotifications.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm text-[var(--muted)]">暂无未读通知</p>
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] divide-y divide-[var(--border-light)] overflow-hidden">
            {recentNotifications.map((n) => (
              <Link
                key={n.id}
                href="/dashboard/notifications"
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface-hover)] transition"
              >
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[var(--info)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{n.title}</p>
                  {n.content && (
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{n.content}</p>
                  )}
                </div>
                <span className="text-xs text-[var(--muted)] shrink-0 mt-0.5">
                  {new Date(n.created_at).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
