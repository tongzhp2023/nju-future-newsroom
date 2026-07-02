'use client'

import { useState, useTransition } from 'react'
import { createWorkflowConfig } from '@/lib/actions'
import { WORKFLOW_ROLE_LABELS } from '@/lib/types'
import type { WorkflowConfigWithStages, WorkflowConfig, WorkflowRoleRequired } from '@/lib/types'

interface WorkflowEditorProps {
  departmentId: string
  currentWorkflow: WorkflowConfigWithStages | null
  history: WorkflowConfig[]
}

interface StageDraft {
  name: string
  role_required: WorkflowRoleRequired
  is_final: boolean
}

const ROLE_OPTIONS: { value: WorkflowRoleRequired; label: string }[] = [
  { value: 'editor', label: WORKFLOW_ROLE_LABELS.editor },
  { value: 'chief_editor', label: WORKFLOW_ROLE_LABELS.chief_editor },
  { value: 'supervisor', label: WORKFLOW_ROLE_LABELS.supervisor },
]

export default function WorkflowEditor({
  departmentId,
  currentWorkflow,
  history,
}: WorkflowEditorProps) {
  const initialStages: StageDraft[] = currentWorkflow
    ? currentWorkflow.stages.map(s => ({
        name: s.name,
        role_required: s.role_required,
        is_final: s.is_final,
      }))
    : [{ name: '责任编辑审核', role_required: 'editor', is_final: false }]

  const [stages, setStages] = useState<StageDraft[]>(initialStages)
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const updateStage = (index: number, field: keyof StageDraft, value: string | boolean) => {
    setStages(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Auto-check is_final for the last stage
      if (field === 'is_final' && value === true) {
        next.forEach((s, i) => {
          if (i !== index) s.is_final = false
        })
      }
      return next
    })
    setError('')
  }

  const addStage = () => {
    setStages(prev => {
      const next = [...prev]
      // Uncheck is_final on all and add new one as final
      next.forEach(s => (s.is_final = false))
      next.push({ name: '', role_required: 'editor', is_final: true })
      return next
    })
    setError('')
  }

  const removeStage = (index: number) => {
    if (!confirm('确定删除此审批节点？')) return
    setStages(prev => {
      const next = prev.filter((_, i) => i !== index)
      // Ensure last stage is final
      if (next.length > 0) {
        next.forEach(s => (s.is_final = false))
        next[next.length - 1].is_final = true
      }
      return next
    })
    setError('')
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= stages.length) return
    setStages(prev => {
      const next = [...prev]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      // Ensure last is final
      next.forEach(s => (s.is_final = false))
      next[next.length - 1].is_final = true
      return next
    })
  }

  const handleSave = () => {
    // Validation
    if (stages.length < 1) {
      setError('审批流至少需要一个节点')
      return
    }
    if (stages.some(s => !s.name.trim())) {
      setError('所有节点必须填写名称')
      return
    }
    const finalCount = stages.filter(s => s.is_final).length
    if (finalCount !== 1) {
      setError('审批流必须有且仅有一个终审签发节点')
      return
    }
    if (!stages[stages.length - 1].is_final) {
      setError('终审签发节点必须是最后一个节点')
      return
    }

    startTransition(async () => {
      try {
        await createWorkflowConfig(
          departmentId,
          stages.map((s, i) => ({
            name: s.name,
            role_required: s.role_required,
            is_final: i === stages.length - 1,
          })),
          description || undefined
        )
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存失败')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Current stages editor */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">审批节点编辑</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            拖拽或使用按钮调整节点顺序，最后一个节点将自动设为终审签发
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {stages.map((stage, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              {/* Order & move buttons */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="text-xs font-medium text-gray-400">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => moveStage(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
                  title="上移"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStage(index, 'down')}
                  disabled={index === stages.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
                  title="下移"
                >
                  ▼
                </button>
              </div>

              {/* Stage fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    节点名称
                  </label>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={e => updateStage(index, 'name', e.target.value)}
                    placeholder="如：责任编辑审核"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    审批角色
                  </label>
                  <select
                    value={stage.role_required}
                    onChange={e =>
                      updateStage(index, 'role_required', e.target.value)
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                    <input
                      type="checkbox"
                      checked={stage.is_final}
                      onChange={e =>
                        updateStage(index, 'is_final', e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">终审签发</span>
                  </label>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeStage(index)}
                className="text-gray-400 hover:text-red-500 transition p-1"
                title="删除节点"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add stage button */}
          <button
            type="button"
            onClick={addStage}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition"
          >
            + 添加节点
          </button>
        </div>

        {/* Description & save */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              版本说明（选填）
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="如：增加指导老师终审环节"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isPending ? '保存中…' : '保存并生效'}
          </button>
        </div>
      </section>

      {/* History versions */}
      {history.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">历史版本</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              之前的审批流配置版本
            </p>
          </div>

          <div className="px-6 py-4">
            <div className="space-y-2">
              {history.map(config => (
                <div
                  key={config.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      v{config.version}
                    </span>
                    {config.is_active && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        当前生效
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {config.description && <span>{config.description}</span>}
                    <span>
                      {new Date(config.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
