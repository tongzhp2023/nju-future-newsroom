'use client'

import { useState, useTransition, useEffect } from 'react'
import type { ArticleComment } from '@/lib/types'
import {
  createArticleComment,
  resolveArticleComment,
  deleteArticleComment,
} from '@/lib/actions'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/types'

interface CommentsPanelProps {
  articleId: string
  comments: ArticleComment[]
  currentUserName: string
}

export default function CommentsPanel({
  articleId,
  comments: initialComments,
  currentUserName,
}: CommentsPanelProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()

  // Listen for comment-added events from the editor
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { selectedText: string; commentText: string }
      // Add the comment via server action
      startTransition(async () => {
        try {
          const newC = await createArticleComment(articleId, `[${detail.selectedText}] ${detail.commentText}`)
          setComments(prev => [...prev, newC])
        } catch (err) {
          console.error('Failed to create comment:', err)
          alert('批注创建失败，请重试')
        }
      })
    }
    window.addEventListener('tiptap:comment-added', handler)
    return () => window.removeEventListener('tiptap:comment-added', handler)
  }, [articleId])

  const handleAddComment = () => {
    if (!newComment.trim()) return
    startTransition(async () => {
      try {
        const newC = await createArticleComment(articleId, newComment.trim())
        setComments(prev => [...prev, newC])
        setNewComment('')
      } catch (err) {
        console.error('Failed to create comment:', err)
        alert('批注创建失败')
      }
    })
  }

  const handleReply = (parentId: string) => {
    if (!replyText.trim()) return
    startTransition(async () => {
      try {
        const newReply = await createArticleComment(articleId, replyText.trim(), parentId)
        setComments(prev =>
          prev.map(c =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), newReply] }
              : c
          )
        )
        setReplyTo(null)
        setReplyText('')
      } catch (err) {
        console.error('Failed to create reply:', err)
        alert('回复创建失败')
      }
    })
  }

  const handleResolve = (commentId: string) => {
    startTransition(async () => {
      try {
        await resolveArticleComment(commentId)
        setComments(prev =>
          prev.map(c => (c.id === commentId ? { ...c, resolved: !c.resolved } : c))
        )
      } catch (err) {
        console.error('Failed to resolve comment:', err)
      }
    })
  }

  const handleDelete = (commentId: string) => {
    if (!confirm('确定要删除这条批注吗？')) return
    startTransition(async () => {
      try {
        await deleteArticleComment(commentId)
        setComments(prev => prev.filter(c => c.id !== commentId))
      } catch (err) {
        console.error('Failed to delete comment:', err)
        alert('删除失败（只能删除自己的批注）')
      }
    })
  }

  const unresolvedCount = comments.filter(c => !c.resolved).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">批注</h3>
          {unresolvedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium">
              {unresolvedCount} 条待处理
            </span>
          )}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 mx-auto mb-2 text-[var(--muted)] opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <p className="text-xs text-[var(--muted)]">暂无批注</p>
            <p className="text-[11px] text-[var(--muted)] mt-1">选中文本后点击「批注」按钮添加</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onReply={handleReply}
              replyTo={replyTo}
              replyText={replyText}
              setReplyTo={setReplyTo}
              setReplyText={setReplyText}
              isPending={isPending}
            />
          ))
        )}
      </div>

      {/* New comment input */}
      <div className="border-t border-[var(--border)] p-3 shrink-0">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="添加批注（直接输入，或选中编辑器文本后批注）…"
          rows={2}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-xs form-input resize-none bg-[var(--surface)] text-[var(--foreground)]"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddComment()
            }
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-[var(--muted)]">⌘+Enter 快速发送</span>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isPending}
            className="btn-primary px-3 py-1 text-xs font-medium rounded-lg disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Single Comment Item
// ============================================

function CommentItem({
  comment,
  onResolve,
  onDelete,
  onReply,
  replyTo,
  replyText,
  setReplyTo,
  setReplyText,
  isPending,
}: {
  comment: ArticleComment
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onReply: (parentId: string) => void
  replyTo: string | null
  replyText: string
  setReplyTo: (id: string | null) => void
  setReplyText: (text: string) => void
  isPending: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 transition ${
      comment.resolved
        ? 'bg-[var(--surface-raised)] border-[var(--border-light)] opacity-60'
        : 'bg-[var(--card-bg)] border-[var(--card-border)]'
    }`}>
      {/* Author info */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-[10px] font-semibold text-[var(--foreground)] shrink-0">
          {comment.author?.full_name?.[0] || '?'}
        </div>
        <span className="text-xs font-medium text-[var(--foreground)]">
          {comment.author?.full_name || '未知'}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          {new Date(comment.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        {comment.resolved && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 font-medium">
            已解决
          </span>
        )}
      </div>

      {/* Comment content */}
      <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => onResolve(comment.id)}
          className="text-[10px] text-[var(--muted)] hover:text-green-600 transition flex items-center gap-0.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {comment.resolved ? '取消解决' : '标记解决'}
        </button>
        <button
          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
          className="text-[10px] text-[var(--muted)] hover:text-blue-600 transition flex items-center gap-0.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          回复
        </button>
        <button
          onClick={() => onDelete(comment.id)}
          className="text-[10px] text-[var(--muted)] hover:text-red-600 transition flex items-center gap-0.5 ml-auto"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          删除
        </button>
      </div>

      {/* Reply input */}
      {replyTo === comment.id && (
        <div className="mt-3">
          <textarea
            autoFocus
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="输入回复…"
            rows={2}
            className="w-full px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-xs form-input resize-none bg-[var(--surface)] text-[var(--foreground)]"
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => { setReplyTo(null); setReplyText('') }}
              className="px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition"
            >取消</button>
            <button
              onClick={() => onReply(comment.id)}
              disabled={!replyText.trim() || isPending}
              className="btn-primary px-3 py-1 text-[10px] font-medium rounded-md disabled:opacity-50"
            >回复</button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-[var(--border-light)] space-y-2">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-[9px] font-semibold text-[var(--foreground)] shrink-0 mt-0.5">
                {reply.author?.full_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[var(--foreground)]">{reply.author?.full_name}</span>
                  <span className="text-[9px] text-[var(--muted)]">
                    {new Date(reply.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--foreground)] leading-relaxed mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
