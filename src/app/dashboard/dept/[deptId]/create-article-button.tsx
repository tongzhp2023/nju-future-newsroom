'use client'

import { createArticle } from '@/lib/actions'
import { useTransition } from 'react'

export default function CreateArticleButton({ deptId }: { deptId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => createArticle(deptId))}
      className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? '创建中...' : '+ 新建稿件'}
    </button>
  )
}
