'use client'

import { useTransition } from 'react'

export default function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="submit"
      disabled={isPending}
      onClick={() => startTransition(() => {})}
      className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition disabled:opacity-50"
    >
      {isPending ? '处理中...' : '全部标为已读'}
    </button>
  )
}
