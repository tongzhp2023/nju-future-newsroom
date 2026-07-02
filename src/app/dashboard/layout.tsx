import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUnreadNotificationCount, getMyDepartmentRoles, getDepartments } from '@/lib/actions'
import Link from 'next/link'
import DashboardSidebar from './dashboard-sidebar'
import ThemeToggle from '@/components/theme-toggle'
import UserDropdown from '@/components/user-dropdown'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, unreadCount, deptRoles, allDepartments] = await Promise.all([
    getProfile(),
    getUnreadNotificationCount(),
    getMyDepartmentRoles(),
    getDepartments(),
  ])

  return (
    <div className="h-screen flex flex-col bg-[var(--content-bg)] overflow-hidden">
      {/* 全局顶部标题栏 — 横跨整个页面宽度 */}
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0 z-10">
        {/* 左侧：品牌标题 */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/nju-logo.png" alt="南京大学" className="w-7 h-7 object-contain" />
          <span className="text-xl font-black text-[var(--foreground)] tracking-tight whitespace-nowrap">
            南京大学未来编辑部 · 智慧课程
          </span>
        </Link>

        {/* 右侧：工具栏 */}
        <div className="flex items-center gap-3">
          {/* Light/Dark 切换滑块 */}
          <ThemeToggle />

          {/* 通知铃铛 */}
          <Link
            href="/dashboard/notifications"
            className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* 用户头像下拉框 */}
          <UserDropdown
            displayName={profile?.full_name || user.email || '?'}
            avatarChar={profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
          />
        </div>
      </header>

      {/* 下方：侧边栏 + 内容区并排 */}
      <div className="flex-1 flex min-h-0">
        {/* 侧边栏 */}
        <DashboardSidebar
          profile={profile}
          userEmail={user.email || ''}
          unreadCount={unreadCount}
          deptRoles={deptRoles}
          allDepartments={allDepartments}
        />

        {/* 页面主内容 */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
