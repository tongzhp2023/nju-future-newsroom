'use client'

import { useTransition } from 'react'
import { submitArticle } from '@/lib/actions'

export function SubmitArticleButton({ articleId }: { articleId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确认要提交该稿件进入审核流程吗？提交后将无法编辑，直到审核完成。')) {
      return
    }

    startTransition(async () => {
      await submitArticle(articleId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] px-2.5 py-1 rounded font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition disabled:opacity-50"
    >
      {isPending ? '提交中…' : '提交审核'}
    </button>
  )
}
