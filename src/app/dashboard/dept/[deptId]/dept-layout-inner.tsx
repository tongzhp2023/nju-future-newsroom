'use client'

import { usePathname } from 'next/navigation'
import DeptTabs from './dept-tabs'

export function DeptLayoutInner({
  deptId,
  deptName,
  canManage,
  children,
}: {
  deptId: string
  deptName: string
  canManage: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // 稿件编辑页面：全屏模式，不显示 tabs
  const isArticleEdit = /\/articles\/[^/]+\/edit/.test(pathname)

  if (isArticleEdit) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <DeptTabs
        deptId={deptId}
        deptName={deptName}
        canManage={canManage}
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
