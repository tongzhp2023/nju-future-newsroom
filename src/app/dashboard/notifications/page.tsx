import { getNotifications, markAllNotificationsRead } from '@/lib/actions'
import MarkAllReadButton from './mark-all-read-button'
import NotificationItem from './notification-item'

export default async function NotificationsPage() {
  const notifications = await getNotifications()

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">通知中心</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            共 {notifications.length} 条通知，{notifications.filter(n => !n.is_read).length} 条未读
          </p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <form action={markAllNotificationsRead}>
            <MarkAllReadButton />
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-active)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">暂无通知</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] divide-y divide-[var(--border-light)] overflow-hidden">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  )
}
