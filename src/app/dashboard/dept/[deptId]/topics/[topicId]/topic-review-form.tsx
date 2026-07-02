'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reviewTopic } from '@/lib/actions'
import type { TopicReviewAction } from '@/lib/types'

export default function TopicReviewForm({ topicId }: { topicId: string }) {
  const router = useRouter()
  const [action, setAction] = useState<TopicReviewAction | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (selectedAction: TopicReviewAction) => {
    setError(null)

    // 退回修改和驳回必须填写意见
    if (
      (selectedAction === 'request_revision' || selectedAction === 'reject') &&
      !comment.trim()
    ) {
      setError('请填写审批意见')
      return
    }

    setSubmitting(true)
    setAction(selectedAction)
    try {
      await reviewTopic(topicId, selectedAction, comment.trim() || undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setSubmitting(false)
      setAction(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          审批意见
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="请输入审批意见（退回修改和驳回时必填）"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleSubmit('approve')}
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && action === 'approve' ? '处理中...' : '通过'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('request_revision')}
          disabled={submitting}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && action === 'request_revision' ? '处理中...' : '退回修改'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('reject')}
          disabled={submitting}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && action === 'reject' ? '处理中...' : '驳回'}
        </button>
      </div>
    </div>
  )
}
