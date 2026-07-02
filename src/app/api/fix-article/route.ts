import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 临时 API：清理文章中的 trackInsert / trackDelete marks
 * 用法：GET /api/fix-article?id=<article-id>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const articleId = searchParams.get('id')

  if (!articleId) {
    return NextResponse.json({ error: 'Missing article id' }, { status: 400 })
  }

  const supabase = await createClient()

  // 读取文章内容
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, content, content_text')
    .eq('id', articleId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Article not found' }, { status: 404 })
  }

  // 递归清理 Tiptap JSON 中的 trackInsert / trackDelete marks
  function cleanMarks(node: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...node }

    // 清理 marks 数组
    if (Array.isArray(cleaned.marks)) {
      cleaned.marks = (cleaned.marks as Array<{ type: string }>).filter(
        m => m.type !== 'trackInsert' && m.type !== 'trackDelete'
      )
      if ((cleaned.marks as unknown[]).length === 0) {
        delete cleaned.marks
      }
    }

    // 递归清理 content 数组
    if (Array.isArray(cleaned.content)) {
      cleaned.content = (cleaned.content as Array<Record<string, unknown>>).map(child => cleanMarks(child))
    }

    return cleaned
  }

  const originalContent = data.content as Record<string, unknown> | null
  if (!originalContent) {
    return NextResponse.json({ message: 'No content to clean', title: data.title })
  }

  const cleanedContent = cleanMarks(originalContent)

  // 从清理后的内容提取纯文本
  function extractText(node: Record<string, unknown>): string {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text
    }
    if (Array.isArray(node.content)) {
      return (node.content as Array<Record<string, unknown>>)
        .map(child => extractText(child))
        .join('')
    }
    return ''
  }
  const cleanedText = extractText(cleanedContent)

  // 更新文章
  const { error: updateError } = await supabase
    .from('articles')
    .update({
      content: cleanedContent,
      content_text: cleanedText,
    })
    .eq('id', articleId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Article cleaned successfully',
    title: data.title,
    originalTextLength: (data.content_text || '').length,
    cleanedTextLength: cleanedText.length,
  })
}
