import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getDepartment,
  getUserRolesInDepartment,
  getDepartmentMembers,
  removeDepartmentMember,
} from '@/lib/actions'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'
import type { UserRole } from '@/lib/types'

export default async function MembersPage({
  params,
}: {
  params: Promise<{ deptId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId } = await params

  const [department, userRoles, members] = await Promise.all([
    getDepartment(deptId),
    getUserRolesInDepartment(deptId),
    getDepartmentMembers(deptId),
  ])

  if (!department) redirect('/dashboard')

  const canManage = userRoles.some(r => ['supervisor', 'admin'].includes(r))

  const roleOrder: UserRole[] = ['supervisor', 'chief_editor', 'editor', 'reporter']
  const groupedMembers = roleOrder
    .map(role => ({
      role,
      label: ROLE_LABELS[role],
      color: ROLE_COLORS[role],
      members: members.filter(m => m.role === role),
    }))
    .filter(g => g.members.length > 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">成员管理</h2>
        <p className="text-xs text-[var(--muted)] mt-1">共 {members.length} 名成员</p>
      </div>

      {groupedMembers.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <p className="text-sm text-[var(--muted)]">暂无成员</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedMembers.map(group => (
            <section
              key={group.role}
              className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-[var(--border-light)] flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${group.color}`}>
                  {group.label}
                </span>
                <span className="text-[11px] text-[var(--muted)]">{group.members.length} 人</span>
              </div>

              <div className="divide-y divide-[var(--border-light)]">
                {group.members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-xs font-semibold text-[var(--foreground)]">
                        {member.profile?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {member.profile?.full_name || '未知用户'}
                        </p>
                        {member.profile?.student_id && (
                          <p className="text-[11px] text-[var(--muted)]">
                            {member.profile.student_id}
                          </p>
                        )}
                      </div>
                    </div>

                    {canManage && member.user_id !== user.id && (
                      <form action={removeDepartmentMember.bind(null, deptId, member.user_id, group.role)}>
                        <button
                          type="submit"
                          className="text-xs text-[var(--muted)] hover:text-red-500 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          移除
                        </button>
                      </form>
                    )}
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
