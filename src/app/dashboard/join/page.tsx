import { getDepartments, getMyDepartmentRoles } from '@/lib/actions'
import { ROLE_LABELS } from '@/lib/types'
import JoinButton from './join-button'

export default async function JoinPage() {
  const [departments, myDeptRoles] = await Promise.all([
    getDepartments(),
    getMyDepartmentRoles(),
  ])

  const myDeptIds = new Set(myDeptRoles.map((dr) => dr.department_id))

  const myRoleMap = new Map<string, string[]>()
  for (const dr of myDeptRoles) {
    const existing = myRoleMap.get(dr.department_id) || []
    existing.push(ROLE_LABELS[dr.role])
    myRoleMap.set(dr.department_id, existing)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">加入编辑部</h1>
        <p className="text-xs text-gray-400 mt-1">
          选择你要加入的编辑部，加入后默认角色为学生记者。
        </p>
      </div>

      <div className="space-y-3">
        {departments.map((dept) => {
          const isMember = myDeptIds.has(dept.id)
          const roles = myRoleMap.get(dept.id) || []

          return (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{dept.name}</h3>
                {dept.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {dept.description}
                  </p>
                )}
                {isMember && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[11px] text-green-600 font-medium">已加入</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="text-[11px] text-gray-500">
                      {roles.join('、')}
                    </span>
                  </div>
                )}
              </div>

              {isMember ? (
                <span className="text-[11px] bg-green-50 text-green-600 px-3 py-1 rounded-full shrink-0 ml-4 font-medium">
                  已加入
                </span>
              ) : (
                <JoinButton deptId={dept.id} deptName={dept.name} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
