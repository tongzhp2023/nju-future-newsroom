'use client'

import { markNotificationRead } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { Notification } from '@/lib/types'

export default function NotificationItem({ notification }: { notification: Notification }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      if (!notification.is_read) {
        await markNotificationRead(notification.id)
      }
      if (notification.related_entity_type === 'article' && notification.related_entity_id) {
        router.push(`/dashboard/notifications`)
      } else if (notification.related_entity_type === 'topic' && notification.related_entity_id) {
        router.push(`/dashboard/notifications`)
      } else {
        router.refresh()
      }
    })
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    if (diffHour < 24) return `${diffHour} 小时前`
    if (diffDay < 30) return `${diffDay} 天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`w-full text-left px-5 py-3.5 hover:bg-[var(--surface-hover)] transition ${
        !notification.is_read ? 'bg-[var(--accent-soft)]' : ''
      } ${isPending ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1.5 shrink-0 w-2">
          {!notification.is_read && (
            <span className="block w-2 h-2 bg-[var(--accent)] rounded-full" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--muted)]'}`}>
            {notification.title}
          </p>
          {notification.content && (
            <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">
              {notification.content}
            </p>
          )}
          <p className="text-[11px] text-[var(--muted)] mt-1">
            {timeAgo(notification.created_at)}
          </p>
        </div>
      </div>
    </button>
  )
}
