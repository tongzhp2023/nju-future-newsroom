'use client'

import { joinDepartment } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function JoinButton({ deptId, deptName }: { deptId: string; deptName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleJoin = () => {
    startTransition(async () => {
      await joinDepartment(deptId)
      router.push(`/dashboard/dept/${deptId}`)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isPending}
      className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50 shrink-0 ml-4"
    >
      {isPending ? '加入中...' : '加入'}
    </button>
  )
}
