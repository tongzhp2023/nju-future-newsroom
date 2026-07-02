'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { leaveDepartment } from '@/lib/actions'

interface DeptTabsProps {
  deptId: string
  deptName: string
  canManage: boolean
}

export default function DeptTabs({ deptId, deptName, canManage }: DeptTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/dashboard/dept/${deptId}`
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const tabs = [
    { label: '概览', href: base, exact: true },
    { label: '选题', href: `${base}/topics` },
    { label: '稿件', href: `${base}/articles` },
  ]

  if (canManage) {
    tabs.push(
      { label: '成员', href: `${base}/members` },
      { label: '设置', href: `${base}/settings` },
    )
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLeave = () => {
    startTransition(async () => {
      await leaveDepartment(deptId)
      setShowLeaveModal(false)
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <>
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* 左侧：编辑部名称 + tab 导航在同一行 */}
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-[var(--foreground)] whitespace-nowrap">{deptName}</h1>
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => {
                const active = isActive(tab.href, tab.exact)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      active
                        ? 'font-semibold text-[var(--foreground)] bg-[var(--surface-active)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* 右侧：退出编辑部 */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="text-xs text-[var(--muted)] hover:text-red-500 dark:hover:text-red-400 border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-red-300 dark:hover:border-red-800 transition"
          >
            退出编辑部
          </button>
        </div>
      </div>

      {/* 退出编辑部确认弹窗 */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden border border-[var(--card-border)]">
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">确认退出编辑部</h3>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                退出「{deptName}」后，你将无法查看该编辑部的选题和稿件。若需再次加入，需要重新提交申请并经责编审核通过。
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 border-t border-[var(--border-light)]">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition"
              >
                取消
              </button>
              <button
                onClick={handleLeave}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {isPending ? '退出中...' : '确认退出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
