'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Profile, UserDepartmentRoleWithDetails, Department } from '@/lib/types'
import { joinDepartment } from '@/lib/actions'

interface DashboardSidebarProps {
  profile: Profile | null
  userEmail: string
  unreadCount: number
  deptRoles: UserDepartmentRoleWithDetails[]
  allDepartments: Department[]
}

export default function DashboardSidebar({
  profile,
  userEmail,
  unreadCount,
  deptRoles,
  allDepartments,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [editorialExpanded, setEditorialExpanded] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState<string | null>(null)
  const [joinReason, setJoinReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const joinedDeptIds = new Set(deptRoles.map(dr => dr.department_id))

  const sortedDepts = [...allDepartments].sort((a, b) => {
    const aJoined = joinedDeptIds.has(a.id) ? 0 : 1
    const bJoined = joinedDeptIds.has(b.id) ? 0 : 1
    return aJoined - bJoined
  })

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleJoin = (deptId: string) => {
    startTransition(async () => {
      await joinDepartment(deptId)
      setShowJoinModal(null)
      setJoinReason('')
      router.refresh()
    })
  }

  return (
    <>
      <aside
        className={`${collapsed ? 'w-16' : 'w-56'} bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col shrink-0 sidebar-transition relative`}
      >
        {/* 悬浮收起/展开按钮 — 在侧边栏右边缘中间 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-30 w-6 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-sm flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 主导航 */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
          {/* 采编审稿系统 */}
          <div className="mb-1">
            <div className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-2.5'} gap-2 py-2 rounded-lg text-sm transition ${
                isActive('/dashboard', true) || isActive('/dashboard/dept')
                  ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)] font-medium'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]'
              }`}
            >
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'flex-1 min-w-0'}`}
                title={collapsed ? '采编审稿系统' : undefined}
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                  <EditorialIcon />
                </span>
                {!collapsed && (
                  <span className="flex-1 text-left truncate">采编审稿系统</span>
                )}
              </Link>
              {!collapsed && (
                <button
                  onClick={() => setEditorialExpanded(!editorialExpanded)}
                  className="p-0.5 rounded hover:bg-[var(--sidebar-hover)] transition shrink-0"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${editorialExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* 二级：编辑部列表 */}
            {editorialExpanded && !collapsed && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-[var(--border-light)] space-y-0.5">
                {sortedDepts.map(dept => {
                  const isJoined = joinedDeptIds.has(dept.id)
                  const isDeptActive = pathname.startsWith(`/dashboard/dept/${dept.id}`)
                  return (
                    <div key={dept.id} className="flex items-center gap-1">
                      <Link
                        href={isJoined ? `/dashboard/dept/${dept.id}` : '#'}
                        onClick={e => { if (!isJoined) e.preventDefault() }}
                        className={`flex-1 min-w-0 px-2 py-1.5 rounded-md text-[13px] truncate transition ${
                          isDeptActive
                            ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)] font-medium'
                            : isJoined
                            ? 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]'
                            : 'text-[var(--sidebar-section)] cursor-default'
                        }`}
                      >
                        {dept.name}
                      </Link>
                      {isJoined ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium shrink-0">
                          已加入
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowJoinModal(dept.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition font-medium shrink-0"
                        >
                          申请加入
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 分类标签 */}
          {!collapsed && (
            <div className="px-2.5 pt-4 pb-1.5">
              <span className="text-[11px] font-medium text-[var(--sidebar-section)] uppercase tracking-wider">功能</span>
            </div>
          )}
          {collapsed && <div className="my-2 mx-2 border-t border-[var(--sidebar-border)]" />}

          {/* 模块入口 */}
          <div className="space-y-0.5">
            <NavItem href="/dashboard/database" label="报道数据库" icon={<DatabaseIcon />} active={isActive('/dashboard/database')} collapsed={collapsed} />
            <NavItem href="/dashboard/ai-tutor" label="AI助教" icon={<AIIcon />} active={isActive('/dashboard/ai-tutor')} collapsed={collapsed} />
            <NavItem href="/dashboard/excellent" label="优秀稿件" icon={<StarIcon />} active={isActive('/dashboard/excellent')} collapsed={collapsed} />
            <NavItem href="/dashboard/showcase" label="教学展示区" icon={<ShowcaseIcon />} active={isActive('/dashboard/showcase')} collapsed={collapsed} />
            <NavItem href="/dashboard/common-issues" label="共性问题" icon={<AlertIcon />} active={isActive('/dashboard/common-issues')} collapsed={collapsed} />
            <NavItem
              href="/dashboard/notifications"
              label="通知中心"
              icon={<BellIcon />}
              active={isActive('/dashboard/notifications')}
              collapsed={collapsed}
              badge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined}
            />
          </div>
        </nav>

        {/* 底部：用户信息 */}
        <div className="px-2 py-2 border-t border-[var(--sidebar-border)]">
          {/* 用户信息 */}
          <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'px-2.5'} gap-2 py-2 rounded-lg`}>
            <div className="w-7 h-7 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-xs font-semibold text-[var(--foreground)] shrink-0">
              {profile?.full_name?.[0] || userEmail[0]?.toUpperCase() || '?'}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--foreground)] truncate leading-tight">
                    {profile?.full_name || userEmail}
                  </p>
                  {profile?.student_id && (
                    <p className="text-[10px] text-[var(--muted)] truncate leading-tight">
                      {profile.student_id}
                    </p>
                  )}
                </div>
                <Link
                  href="/dashboard/settings"
                  className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-hover)] transition"
                  title="设置"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 申请加入弹窗 */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-[var(--card-border)]">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                申请加入编辑部
              </h3>
              <p className="text-sm text-[var(--muted)] mt-1">
                {allDepartments.find(d => d.id === showJoinModal)?.name}
              </p>
            </div>
            <div className="px-6 pb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                申请理由
              </label>
              <textarea
                value={joinReason}
                onChange={e => setJoinReason(e.target.value)}
                placeholder="请简要说明你加入该编辑部的理由（选填）"
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm form-input resize-none bg-[var(--surface)]"
              />
            </div>
            <div className="px-6 py-4 bg-[var(--surface-raised)] flex justify-end gap-2 border-t border-[var(--border-light)]">
              <button
                onClick={() => { setShowJoinModal(null); setJoinReason('') }}
                className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition"
              >
                取消
              </button>
              <button
                onClick={() => handleJoin(showJoinModal)}
                disabled={isPending}
                className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {isPending ? '提交中...' : '确认加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** 侧边栏导航项 */
function NavItem({
  href,
  label,
  icon,
  active,
  collapsed,
  badge,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  collapsed: boolean
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={`nav-item flex items-center ${collapsed ? 'justify-center px-0' : 'px-2.5'} gap-2 py-2 rounded-lg text-sm transition ${
        active
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)] font-medium'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]'
      }`}
      title={collapsed ? label : undefined}
    >
      <span className="w-5 h-5 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {badge && !collapsed && (
        <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
          {badge}
        </span>
      )}
      {badge && collapsed && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </Link>
  )
}

// ========== 图标组件 ==========

function EditorialIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function ShowcaseIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

