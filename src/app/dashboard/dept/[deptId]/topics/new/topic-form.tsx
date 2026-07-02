'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createTopic, saveTopicDraft } from '@/lib/actions'
import type { TopicFormField } from '@/lib/types'

export default function TopicForm({
  departmentId,
  formTemplate,
}: {
  departmentId: string
  formTemplate: TopicFormField[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    formTemplate.forEach((field) => { initial[field.key] = '' })
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 按 section 分组
  const sections = useMemo(() => {
    const sectionMap = new Map<string, TopicFormField[]>()
    for (const field of formTemplate) {
      const sectionName = field.section || '其他'
      const existing = sectionMap.get(sectionName) || []
      existing.push(field)
      sectionMap.set(sectionName, existing)
    }
    return Array.from(sectionMap.entries())
  }, [formTemplate])

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('请填写选题标题')
      return
    }

    for (const field of formTemplate) {
      if (field.required && !formData[field.key]?.trim()) {
        setError(`请填写「${field.label}」`)
        return
      }
    }

    setSubmitting(true)
    try {
      await createTopic(departmentId, title.trim(), formData)
      router.push(`/dashboard/dept/${departmentId}/topics`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setError(null)
    setSavingDraft(true)
    try {
      await saveTopicDraft(departmentId, title.trim(), formData)
      router.push(`/dashboard/dept/${departmentId}/topics?status=draft`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存草稿失败，请重试')
    } finally {
      setSavingDraft(false)
    }
  }

  // 计算填写进度
  const requiredFields = formTemplate.filter(f => f.required)
  const filledRequired = requiredFields.filter(f => formData[f.key]?.trim()).length + (title.trim() ? 1 : 0)
  const totalRequired = requiredFields.length + 1
  const progress = Math.round((filledRequired / totalRequired) * 100)

  return (
    <form onSubmit={handleSubmit}>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* 进度条 */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--muted)]">填写进度</span>
          <span className="text-xs font-medium text-[var(--foreground)]">{filledRequired}/{totalRequired} 必填项</span>
        </div>
        <div className="h-1.5 bg-[var(--surface-active)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 选题标题（独立卡片） */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6 mb-4">
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          选题标题 <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-[var(--muted)] mb-3">拟定报道的工作标题，应简洁准确地概括报道内容</p>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="例：南京老城南社区养老新模式调查"
          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm form-input bg-[var(--surface)]"
          required
        />
      </div>

      {/* 分区表单 */}
      {sections.map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6 mb-4">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--border-light)]">
            <div className="w-1 h-4 rounded-full bg-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{sectionName}</h3>
          </div>

          <div className="space-y-5">
            {fields.map(field => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={formData[field.key] || ''}
                onChange={v => handleFieldChange(field.key, v)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 底部操作 */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:border-[var(--border-hover)] transition"
        >
          取消
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingDraft ? '保存中...' : '保存草稿'}
          </button>
          <button
            type="submit"
            disabled={submitting || savingDraft}
            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交选题申报'}
          </button>
        </div>
      </div>
    </form>
  )
}

/** 表单字段渲染组件 */
function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: TopicFormField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-0.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.description && (
        <p className="text-[12px] text-[var(--muted)] mb-2">{field.description}</p>
      )}

      {field.type === 'select' && field.options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm form-input bg-[var(--surface)]"
          required={field.required}
        >
          <option value="">请选择</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm form-input resize-y bg-[var(--surface)]"
          required={field.required}
        />
      ) : field.type === 'date' ? (
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm form-input bg-[var(--surface)]"
          required={field.required}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm form-input bg-[var(--surface)]"
          required={field.required}
        />
      )}
    </div>
  )
}
