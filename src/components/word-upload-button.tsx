'use client'

import { useState, useRef, useTransition } from 'react'

interface WordUploadButtonProps {
  onParsed: (content: Record<string, unknown>, text: string, title?: string) => void
  disabled?: boolean
}

export default function WordUploadButton({ onParsed, disabled }: WordUploadButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)

    const isDocx = file.name.toLowerCase().endsWith('.docx')
    const isDoc = file.name.toLowerCase().endsWith('.doc')

    if (!isDocx && !isDoc) {
      setError('仅支持 .doc 和 .docx 格式的 Word 文档')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB')
      return
    }

    startTransition(async () => {
      try {
        // 统一走服务端 API 解析（.docx 保留颜色/字号等格式，.doc 提取纯文本）
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/parse-doc', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '解析失败')

        const { html, text, title: serverTitle } = data
        const title = serverTitle || file.name.replace(/\.(docx?|doc)$/i, '')

        // 如果是 .doc 格式，提示用户
        if (isDoc && data.notice) {
          console.info('[Word上传]', data.notice)
        }

        // Convert HTML to Tiptap-compatible JSON structure
        const json = htmlToTiptapJSON(html)
        onParsed(json, text, title)
      } catch (err) {
        console.error('Word 文档解析失败:', err)
        setError(err instanceof Error ? err.message : '文档解析失败，请检查文件格式是否正确')
      }
    })
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Reset input
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isPending}
        className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition disabled:opacity-50 text-[var(--foreground)] flex items-center gap-1.5"
        title="上传 Word 文档，自动解析到编辑器"
      >
        {isPending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            解析中…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Word 上传
          </>
        )}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

// ============================================
// HTML → Tiptap JSON converter
// ============================================

function htmlToTiptapJSON(html: string): Record<string, unknown> {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  const content: unknown[] = []

  // 解析内联节点
  const parseInline = (node: Node, marks: unknown[] = []): unknown[] => {
    const result: unknown[] = []
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ''
        if (text) {
          const textNode: Record<string, unknown> = { type: 'text', text }
          if (marks.length > 0) textNode.marks = [...marks]
          result.push(textNode)
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tagName = el.tagName.toLowerCase()
        const newMarks = [...marks]

        switch (tagName) {
          case 'strong': case 'b': newMarks.push({ type: 'bold' }); break
          case 'em': case 'i': newMarks.push({ type: 'italic' }); break
          case 'u': newMarks.push({ type: 'underline' }); break
          case 's': case 'del': newMarks.push({ type: 'strike' }); break
          case 'sub': newMarks.push({ type: 'subscript' }); break
          case 'sup': newMarks.push({ type: 'superscript' }); break
          case 'a': {
            const href = el.getAttribute('href')
            if (href) newMarks.push({ type: 'link', attrs: { href, target: '_blank' } })
            break
          }
          case 'span': {
            // 处理内联样式（颜色、字号、字体、背景色）
            const style = el.getAttribute('style') || ''
            const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i)
            const fontSizeMatch = style.match(/font-size:\s*([^;]+)/i)
            const fontFamilyMatch = style.match(/font-family:\s*([^;]+)/i)
            const bgColorMatch = style.match(/background-color:\s*([^;]+)/i)

            // textStyle mark 用于颜色、字号、字体
            const textStyleAttrs: Record<string, string> = {}
            if (colorMatch) textStyleAttrs.color = colorMatch[1].trim()
            if (fontSizeMatch) textStyleAttrs.fontSize = fontSizeMatch[1].trim()
            if (fontFamilyMatch) textStyleAttrs.fontFamily = fontFamilyMatch[1].trim()
            if (bgColorMatch) textStyleAttrs.backgroundColor = bgColorMatch[1].trim()

            if (Object.keys(textStyleAttrs).length > 0) {
              newMarks.push({ type: 'textStyle', attrs: textStyleAttrs })
            }
            break
          }
        }
        result.push(...parseInline(el, newMarks))
      }
    })
    return result
  }

  // 获取元素的对齐属性
  const getTextAlign = (el: HTMLElement): string | undefined => {
    const style = el.getAttribute('style') || ''
    const alignMatch = style.match(/text-align:\s*(left|center|right|justify)/i)
    if (alignMatch) return alignMatch[1].toLowerCase()
    const align = el.getAttribute('align')
    if (align) return align.toLowerCase()
    return undefined
  }

  // 构建段落节点（带属性）
  const makeParagraph = (el: HTMLElement, inlineContent: unknown[]): Record<string, unknown> => {
    const node: Record<string, unknown> = { type: 'paragraph' }
    const align = getTextAlign(el)
    if (align && align !== 'left') node.attrs = { textAlign: align }
    if (inlineContent.length > 0) node.content = inlineContent
    return node
  }

  // 解析块级元素
  const parseBlock = (el: HTMLElement) => {
    const tagName = el.tagName.toLowerCase()

    switch (tagName) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = parseInt(tagName[1])
        const inlineContent = parseInline(el)
        const node: Record<string, unknown> = { type: 'heading', attrs: { level } }
        const align = getTextAlign(el)
        if (align && align !== 'left') node.attrs = { level, textAlign: align }
        if (inlineContent.length > 0) node.content = inlineContent
        content.push(node)
        break
      }
      case 'p': {
        // 提取 <p> 上的颜色/字号/字体样式，作为基础 marks 传递给内联解析
        const pStyle = el.getAttribute('style') || ''
        const pMarks: unknown[] = []
        const pColorMatch = pStyle.match(/(?:^|;)\s*color:\s*([^;]+)/i)
        const pFontSizeMatch = pStyle.match(/font-size:\s*([^;]+)/i)
        const pFontFamilyMatch = pStyle.match(/font-family:\s*([^;]+)/i)
        const pTextStyleAttrs: Record<string, string> = {}
        if (pColorMatch) pTextStyleAttrs.color = pColorMatch[1].trim()
        if (pFontSizeMatch) pTextStyleAttrs.fontSize = pFontSizeMatch[1].trim()
        if (pFontFamilyMatch) pTextStyleAttrs.fontFamily = pFontFamilyMatch[1].trim()
        if (Object.keys(pTextStyleAttrs).length > 0) {
          pMarks.push({ type: 'textStyle', attrs: pTextStyleAttrs })
        }
        const inlineContent = pMarks.length > 0 ? parseInline(el, pMarks) : parseInline(el)
        content.push(makeParagraph(el, inlineContent))
        break
      }
      case 'ul': case 'ol': {
        const items: unknown[] = []
        el.querySelectorAll(':scope > li').forEach((li) => {
          const inlineContent = parseInline(li)
          items.push({
            type: 'listItem',
            content: [makeParagraph(li as HTMLElement, inlineContent)],
          })
        })
        if (items.length > 0) {
          content.push({ type: tagName === 'ul' ? 'bulletList' : 'orderedList', content: items })
        }
        break
      }
      case 'blockquote': {
        const children: unknown[] = []
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement
            if (/^(p|h[1-6])$/.test(childEl.tagName.toLowerCase())) {
              const inlineContent = parseInline(childEl)
              children.push(makeParagraph(childEl, inlineContent))
            } else {
              const inlineContent = parseInline(childEl)
              if (inlineContent.length > 0) children.push({ type: 'paragraph', content: inlineContent })
            }
          } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
            children.push({ type: 'paragraph', content: [{ type: 'text', text: child.textContent.trim() }] })
          }
        })
        if (children.length === 0) children.push({ type: 'paragraph' })
        content.push({ type: 'blockquote', content: children })
        break
      }
      case 'table': {
        const rows: unknown[] = []
        el.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr').forEach(tr => {
          const cells: unknown[] = []
          tr.querySelectorAll(':scope > td, :scope > th').forEach(cell => {
            const isHeader = cell.tagName.toLowerCase() === 'th'
            const inlineContent = parseInline(cell)
            cells.push({
              type: isHeader ? 'tableHeader' : 'tableCell',
              content: [{ type: 'paragraph', content: inlineContent.length > 0 ? inlineContent : undefined }],
            })
          })
          if (cells.length > 0) rows.push({ type: 'tableRow', content: cells })
        })
        if (rows.length > 0) content.push({ type: 'table', content: rows })
        break
      }
      case 'img': {
        const src = el.getAttribute('src')
        if (src && !src.startsWith('data:image')) {
          content.push({ type: 'image', attrs: { src } })
        }
        break
      }
      case 'hr': {
        content.push({ type: 'horizontalRule' })
        break
      }
      case 'br': {
        // standalone <br> → empty paragraph
        content.push({ type: 'paragraph' })
        break
      }
      case 'div': case 'section': case 'article': case 'main': {
        // Recurse into container elements
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) parseBlock(child as HTMLElement)
          else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
            content.push({ type: 'paragraph', content: [{ type: 'text', text: child.textContent.trim() }] })
          }
        })
        break
      }
      default: {
        // Treat unknown block elements as paragraphs
        const inlineContent = parseInline(el)
        if (inlineContent.length > 0) {
          content.push({ type: 'paragraph', content: inlineContent })
        }
      }
    }
  }

  // 遍历顶级节点
  tempDiv.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      parseBlock(node as HTMLElement)
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) content.push({ type: 'paragraph', content: [{ type: 'text', text }] })
    }
  })

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}
