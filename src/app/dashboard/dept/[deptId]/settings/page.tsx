import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getDepartment,
  getUserRolesInDepartment,
  getActiveWorkflow,
} from '@/lib/actions'
import { WORKFLOW_ROLE_LABELS } from '@/lib/types'
import Link from 'next/link'

export default async function DeptSettingsPage({
  params,
}: {
  params: Promise<{ deptId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId } = await params

  const [department, userRoles, activeWorkflow] = await Promise.all([
    getDepartment(deptId),
    getUserRolesInDepartment(deptId),
    getActiveWorkflow(deptId),
  ])

  if (!department) redirect('/dashboard')

  const canManage = userRoles.some(r => ['supervisor', 'admin'].includes(r))
  if (!canManage) {
    redirect(`/dashboard/dept/${deptId}/articles`)
  }

  const stages = activeWorkflow?.stages || []
  const topicFields = department.topic_form_template || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 审批流配置 */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">审批流配置</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">配置稿件的审批流程节点</p>
          </div>
          <Link
            href={`/dashboard/dept/${deptId}/settings/workflow`}
            className="px-4 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition font-medium"
          >
            修改审批流
          </Link>
        </div>

        <div className="px-5 py-4">
          {activeWorkflow ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[var(--muted)]">
                  当前版本：v{activeWorkflow.version}
                </span>
                {activeWorkflow.description && (
                  <span className="text-xs text-[var(--muted)]">· {activeWorkflow.description}</span>
                )}
              </div>
              <ol className="space-y-2.5">
                {stages.map((stage, index) => (
                  <li key={stage.id} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-active)] text-[11px] font-semibold text-[var(--foreground)]">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[var(--foreground)]">{stage.name}</span>
                      <span className="text-xs text-[var(--muted)] ml-2">
                        {WORKFLOW_ROLE_LABELS[stage.role_required]}
                      </span>
                    </div>
                    {stage.is_final && (
                      <span className="text-[11px] bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded font-medium">
                        终审签发
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--muted)]">尚未配置审批流</p>
              <Link
                href={`/dashboard/dept/${deptId}/settings/workflow`}
                className="inline-block mt-3 text-sm text-[var(--foreground)] hover:opacity-70 font-medium"
              >
                立即配置 →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 选题模板配置 */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">选题模板配置</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">配置选题申请的表单字段</p>
          </div>
          <Link
            href={`/dashboard/dept/${deptId}/settings/topic-template`}
            className="px-4 py-1.5 text-sm border border-[var(--border)] text-[var(--muted)] rounded-lg hover:bg-[var(--surface-hover)] transition font-medium"
          >
            编辑模板
          </Link>
        </div>

        <div className="px-5 py-4">
          {topicFields.length > 0 ? (
            <div className="space-y-2">
              {topicFields.map((field, index) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 py-2 border-b border-[var(--border-light)] last:border-0"
                >
                  <span className="w-5 text-[11px] text-[var(--muted)] text-right">{index + 1}.</span>
                  <span className="text-sm text-[var(--foreground)]">{field.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">
                    ({field.type === 'text' ? '单行文本' : field.type === 'textarea' ? '多行文本' : field.type === 'date' ? '日期' : field.type === 'select' ? '下拉选择' : '文件'})
                  </span>
                  {field.required && (
                    <span className="text-[11px] text-red-400 font-medium">必填</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] text-center py-4">使用默认选题模板</p>
          )}
        </div>
      </section>
    </div>
  )
}
