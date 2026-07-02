'use client'

import { useRouter } from 'next/navigation'

/**
 * 通用返回按钮 — 使用 router.back() 回到上一页
 * 用于 Server Component 中需要浏览器历史导航的场景
 */
export default function BackButton({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className}
    >
      {children || (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      )}
    </button>
  )
}
