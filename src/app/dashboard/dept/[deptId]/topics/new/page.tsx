import { getDepartment } from '@/lib/actions'
import { DEFAULT_TOPIC_FORM_FIELDS } from '@/lib/types'
import type { TopicFormField } from '@/lib/types'
import Link from 'next/link'
import TopicForm from './topic-form'

export default async function NewTopicPage({
  params,
}: {
  params: Promise<{ deptId: string }>
}) {
  const { deptId } = await params
  const department = await getDepartment(deptId)

  // 数据库模板如果为空、null、或只有极少字段（<=2），使用默认 13 字段专业报题单
  const dbTemplate = department?.topic_form_template
  const formTemplate: TopicFormField[] =
    dbTemplate && Array.isArray(dbTemplate) && dbTemplate.length > 2
      ? dbTemplate
      : DEFAULT_TOPIC_FORM_FIELDS

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页头 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/dept/${deptId}/topics`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">选题申报</h1>
          {department && (
            <p className="text-xs text-[var(--muted)]">{department.name}</p>
          )}
        </div>
      </div>

      {/* 表单 */}
      <TopicForm departmentId={deptId} formTemplate={formTemplate} />
    </div>
  )
}
