import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getUserRolesInDepartment,
  getActiveWorkflow,
  getWorkflowHistory,
} from '@/lib/actions'
import WorkflowEditor from './workflow-editor'

export default async function WorkflowConfigPage({
  params,
}: {
  params: Promise<{ deptId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId } = await params

  const [userRoles, currentWorkflow, history] = await Promise.all([
    getUserRolesInDepartment(deptId),
    getActiveWorkflow(deptId),
    getWorkflowHistory(deptId),
  ])

  const canManage = userRoles.some(r => ['supervisor', 'admin'].includes(r))
  if (!canManage) {
    redirect(`/dashboard/dept/${deptId}/articles`)
  }

  return (
    <div className="px-6 py-8">
      <WorkflowEditor
        departmentId={deptId}
        currentWorkflow={currentWorkflow}
        history={history}
      />
    </div>
  )
}
