import { getDepartment, getUserRolesInDepartment } from '@/lib/actions'
import { redirect } from 'next/navigation'
import DeptTabs from './dept-tabs'
import { DeptLayoutInner } from './dept-layout-inner'

export default async function DeptLayout({
  params,
  children,
}: {
  params: Promise<{ deptId: string }>
  children: React.ReactNode
}) {
  const { deptId } = await params

  const department = await getDepartment(deptId)
  if (!department) redirect('/dashboard')

  const userRoles = await getUserRolesInDepartment(deptId)
  const canManage = userRoles.includes('supervisor') || userRoles.includes('admin')

  return (
    <DeptLayoutInner
      deptId={deptId}
      deptName={department.name}
      canManage={canManage}
    >
      {children}
    </DeptLayoutInner>
  )
}
