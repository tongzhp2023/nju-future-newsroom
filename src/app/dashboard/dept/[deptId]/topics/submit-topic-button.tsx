'use client'

import { useTransition } from 'react'
import { submitTopicDraft } from '@/lib/actions'

export function SubmitTopicButton({ topicId }: { topicId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确认要提交该选题申报吗？提交后将进入审核流程。')) {
      return
    }

    startTransition(async () => {
      await submitTopicDraft(topicId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] px-2.5 py-1 rounded font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition disabled:opacity-50"
    >
      {isPending ? '提交中…' : '提交选题申报'}
    </button>
  )
}
