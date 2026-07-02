import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    if (fileName.endsWith('.docx')) {
      return await parseDocx(buffer, file.name)
    } else if (fileName.endsWith('.doc')) {
      return await parseLegacyDoc(buffer, file.name)
    } else {
      return NextResponse.json({ error: '仅支持 .doc 和 .docx 格式' }, { status: 400 })
    }
  } catch (err) {
    console.error('文档解析失败:', err)
    return NextResponse.json({ error: '文档解析失败，请检查文件格式' }, { status: 500 })
  }
}

// ============================================================
// .docx 解析（直接解析 XML，保留颜色、字号、粗体等格式）
// ============================================================

async function parseDocx(buffer: Buffer, fileName: string) {
  const zip = await JSZip.loadAsync(buffer)
  const docXml = await zip.file('word/document.xml')?.async('text')
  if (!docXml) throw new Error('Invalid docx: no document.xml')

  // 解析关系文件以获取超链接
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('text')
  const hyperlinks: Record<string, string> = {}
  if (relsXml) {
    const relMatches = relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*TargetMode="External"/g)
    for (const m of relMatches) {
      hyperlinks[m[1]] = m[2]
    }
  }

  // 简单 XML 解析（不依赖第三方库）
  const html = docxXmlToHtml(docXml, hyperlinks)
  const text = htmlToPlainText(html)
  const title = extractTitle(docXml) || fileName.replace(/\.docx$/i, '')

  return NextResponse.json({ html, text, title })
}

function docxXmlToHtml(xml: string, hyperlinks: Record<string, string>): string {
  const parts: string[] = []

  // 提取所有 <w:p> 段落
  const paragraphs = matchAll(xml, /<w:p[ >][\s\S]*?<\/w:p>/g)

  for (const pXml of paragraphs) {
    const pProps = matchFirst(pXml, /<w:pPr>([\s\S]*?)<\/w:pPr>/)

    // 段落样式
    const pStyle = matchFirst(pProps || '', /w:val="([^"]+)"/)
    const alignment = matchFirst(pProps || '', /<w:jc w:val="([^"]+)"/)
    const outlineLevel = matchFirst(pProps || '', /<w:outlineLvl w:val="(\d+)"/)

    // 判断是否为标题
    let headingLevel = 0
    if (outlineLevel) {
      headingLevel = parseInt(outlineLevel) + 1
      if (headingLevel > 6) headingLevel = 6
    } else if (pStyle) {
      const hMatch = pStyle.match(/^[Hh]eading(\d)$|^标题\s*(\d)$/u)
      if (hMatch) headingLevel = parseInt(hMatch[1] || hMatch[2])
    }

    // 判断是否为列表
    const numPr = matchFirst(pProps || '', /<w:numPr>([\s\S]*?)<\/w:numPr>/)

    // 收集 runs
    const runsHtml = parseRuns(pXml, hyperlinks)

    if (!runsHtml && !numPr) {
      // 空段落
      parts.push('<p><br/></p>')
      continue
    }

    // 构建样式属性
    const styleAttrs: string[] = []
    if (alignment) {
      styleAttrs.push(`text-align:${alignment}`)
    }

    const styleStr = styleAttrs.length > 0 ? ` style="${styleAttrs.join(';')}"` : ''

    if (headingLevel >= 1 && headingLevel <= 6) {
      parts.push(`<h${headingLevel}${styleStr}>${runsHtml}</h${headingLevel}>`)
    } else {
      parts.push(`<p${styleStr}>${runsHtml || '<br/>'}</p>`)
    }
  }

  return parts.join('\n')
}

function parseRuns(pXml: string, hyperlinks: Record<string, string>): string {
  const result: string[] = []

  // 匹配 runs 和 hyperlinks
  // 先处理 hyperlink 包裹的 run，再处理普通 run
  const segments = matchAll(pXml, /<w:hyperlink[^>]*>[\s\S]*?<\/w:hyperlink>|<w:r[ >][\s\S]*?<\/w:r>/g)

  for (const seg of segments) {
    if (seg.startsWith('<w:hyperlink')) {
      // 超链接
      const rId = matchFirst(seg, /r:id="([^"]+)"/)
      const href = rId ? hyperlinks[rId] : undefined
      const innerRuns = matchAll(seg, /<w:r[ >][\s\S]*?<\/w:r>/g)
      const innerHtml = innerRuns.map(r => parseSingleRun(r)).join('')
      if (href) {
        result.push(`<a href="${escapeHtml(href)}">${innerHtml}</a>`)
      } else {
        result.push(innerHtml)
      }
    } else {
      result.push(parseSingleRun(seg))
    }
  }

  return result.join('')
}

function parseSingleRun(rXml: string): string {
  const rProps = matchFirst(rXml, /<w:rPr>([\s\S]*?)<\/w:rPr>/)

  // 文本内容
  const texts = matchAll(rXml, /<w:t[^>]*>([\s\S]*?)<\/w:t>/g)
  let textContent = ''
  for (const t of texts) {
    const inner = matchFirst(t, /<w:t[^>]*>([\s\S]*?)<\/w:t>/)
    textContent += inner || ''
  }

  // 处理 <w:br/> 换行
  if (rXml.includes('<w:br')) {
    textContent += '<br/>'
  }

  // 处理 tab
  if (rXml.includes('<w:tab')) {
    textContent = '\u00A0\u00A0\u00A0\u00A0' + textContent
  }

  if (!textContent) return ''

  const escaped = escapeHtml(textContent).replace(/<br\/>/g, '<br/>')

  if (!rProps) return escaped

  // 提取格式属性
  const isBold = rProps.includes('<w:b/>') || rProps.includes('<w:b ') || rProps.includes('<w:b>') 
  const isItalic = rProps.includes('<w:i/>') || rProps.includes('<w:i ') || rProps.includes('<w:i>')
  const isUnderline = rProps.includes('<w:u ')
  const isStrike = rProps.includes('<w:strike')

  // 颜色
  const color = matchFirst(rProps, /<w:color w:val="([^"]+)"/)
  // 字号 (半磅单位，需要除以2得到磅)
  const szVal = matchFirst(rProps, /<w:sz w:val="(\d+)"/)
  const fontSize = szVal ? Math.round(parseInt(szVal) / 2) : undefined
  // 字体
  const font = matchFirst(rProps, /<w:rFonts[^>]*w:eastAsia="([^"]+)"/) ||
               matchFirst(rProps, /<w:rFonts[^>]*w:ascii="([^"]+)"/)
  // 背景高亮
  const highlight = matchFirst(rProps, /<w:highlight w:val="([^"]+)"/)
  // 上标/下标
  const vertAlign = matchFirst(rProps, /<w:vertAlign w:val="([^"]+)"/)

  // 构建 style
  const styles: string[] = []
  if (color && color !== '000000' && color !== 'auto') {
    styles.push(`color:#${color}`)
  }
  if (fontSize && fontSize !== 11 && fontSize !== 12) {
    styles.push(`font-size:${fontSize}px`)
  }
  if (font) {
    styles.push(`font-family:${font}`)
  }
  if (highlight) {
    const bgColor = highlightColorMap[highlight]
    if (bgColor) styles.push(`background-color:${bgColor}`)
  }

  let html = escaped

  // 应用标记
  if (isBold) html = `<strong>${html}</strong>`
  if (isItalic) html = `<em>${html}</em>`
  if (isUnderline) html = `<u>${html}</u>`
  if (isStrike) html = `<s>${html}</s>`
  if (vertAlign === 'superscript') html = `<sup>${html}</sup>`
  if (vertAlign === 'subscript') html = `<sub>${html}</sub>`

  // 应用内联样式
  if (styles.length > 0) {
    html = `<span style="${styles.join(';')}">${html}</span>`
  }

  return html
}

// Word highlight 颜色映射
const highlightColorMap: Record<string, string> = {
  yellow: '#FFFF00',
  green: '#00FF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  blue: '#0000FF',
  red: '#FF0000',
  darkBlue: '#00008B',
  darkCyan: '#008B8B',
  darkGreen: '#006400',
  darkMagenta: '#8B008B',
  darkRed: '#8B0000',
  darkYellow: '#808000',
  darkGray: '#A9A9A9',
  lightGray: '#D3D3D3',
  black: '#000000',
}

function extractTitle(xml: string): string | undefined {
  // 从第一个标题段落或第一个段落提取标题
  const firstP = matchFirst(xml, /<w:p[ >]([\s\S]*?)<\/w:p>/)
  if (!firstP) return undefined
  const texts = matchAll(firstP, /<w:t[^>]*>([\s\S]*?)<\/w:t>/g)
  const title = texts.map(t => {
    const inner = matchFirst(t, /<w:t[^>]*>([\s\S]*?)<\/w:t>/)
    return inner || ''
  }).join('').trim()
  return title || undefined
}

// ============================================================
// .doc 解析（使用 macOS textutil 保留颜色、字体、对齐等格式）
// ============================================================

async function parseLegacyDoc(buffer: Buffer, fileName: string) {
  let html: string
  let usedTextutil = false

  // 优先使用 macOS textutil（保留颜色、字号、字体等格式）
  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'doc-parse-'))
    const tmpFile = join(tmpDir, 'input.doc')
    writeFileSync(tmpFile, buffer)

    const rawHtml = execFileSync('textutil', ['-convert', 'html', '-stdout', tmpFile], {
      encoding: 'utf-8',
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024,
    })

    // 清理临时文件
    try { unlinkSync(tmpFile) } catch {}
    try { unlinkSync(tmpDir) } catch {}

    html = processTextutilHtml(rawHtml)
    usedTextutil = true
  } catch {
    // textutil 不可用（非 macOS），回退到 word-extractor 纯文本
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WordExtractor = require('word-extractor')
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buffer)
    const body: string = doc.getBody() || ''

    const paragraphs = body
      .split(/\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)

    html = paragraphs.map((p: string) => `<p>${escapeHtml(p)}</p>`).join('\n')
  }

  const text = htmlToPlainText(html)
  const title = extractTitleFromHtml(html) || fileName.replace(/\.doc$/i, '')

  return NextResponse.json({
    html,
    text,
    title,
    ...(usedTextutil ? {} : { notice: '.doc 格式仅能提取纯文本，建议转为 .docx 以保留完整格式（颜色、字号等）' })
  })
}

// 处理 textutil 输出的 HTML：将 CSS class 样式转为内联 style
function processTextutilHtml(rawHtml: string): string {
  // 提取 <style> 块中的 CSS 规则
  const styleBlock = matchFirst(rawHtml, /<style[^>]*>([\s\S]*?)<\/style>/i) || ''
  const cssRules = parseCssRules(styleBlock)

  // 提取 <body> 内容
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let bodyHtml = bodyMatch ? bodyMatch[1] : rawHtml

  // 移除 HTML 实体和不需要的标签
  bodyHtml = bodyHtml.replace(/<meta[^>]*>/gi, '')

  // 将 class 样式转为内联 style
  // 处理 <p class="pN">...
  bodyHtml = bodyHtml.replace(/<p\s+class="([^"]+)"(.*?)>/gi, (_match, cls, rest) => {
    return applyClassStyles('p', cls, rest, cssRules)
  })
  // 处理 <span class="sN">...
  bodyHtml = bodyHtml.replace(/<span\s+class="([^"]+)"(.*?)>/gi, (_match, cls, rest) => {
    return applyClassStyles('span', cls, rest, cssRules)
  })

  // 清理 Apple 特有标签
  bodyHtml = bodyHtml.replace(/<span class="Apple-converted-space">\s*<\/span>/gi, ' ')

  return bodyHtml.trim()
}

// 解析 CSS 规则到 map: { 'p.p1': { color: '#ff0000', fontSize: '14px', ... } }
function parseCssRules(css: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {}
  const ruleRe = /([^{]+)\{([^}]*)\}/g
  let m
  while ((m = ruleRe.exec(css)) !== null) {
    const selector = m[1].trim()
    const props = m[2].trim()
    const propsMap = parseCssProps(props)
    if (Object.keys(propsMap).length > 0) {
      rules[selector] = propsMap
    }
  }
  return rules
}

// 解析 CSS 属性字符串到 map
function parseCssProps(props: string): Record<string, string> {
  const result: Record<string, string> = {}
  const declarations = props.split(';').map(s => s.trim()).filter(Boolean)
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx < 0) continue
    const key = decl.substring(0, colonIdx).trim().toLowerCase()
    const value = decl.substring(colonIdx + 1).trim()

    if (key === 'font') {
      // 解析 font 简写：如 "14.0px Times" 或 "bold 14.0px Times"
      const fontMatch = value.match(/(?:bold\s+)?(?:([\d.]+)px)\s+(.+)/i)
      if (fontMatch) {
        result.fontSize = `${Math.round(parseFloat(fontMatch[1]))}px`
        result.fontFamily = fontMatch[2].trim()
      }
      if (/bold/i.test(value)) result.fontWeight = 'bold'
    } else if (key === 'color') {
      result.color = value
    } else if (key === 'text-align') {
      result.textAlign = value
    } else if (key === 'font-size') {
      result.fontSize = value
    } else if (key === 'font-family') {
      result.fontFamily = value
    } else if (key === 'background-color') {
      result.backgroundColor = value
    }
  }
  return result
}

// 将 class 样式应用到元素上，生成带内联 style 的标签
function applyClassStyles(
  tag: string,
  cls: string,
  rest: string,
  cssRules: Record<string, Record<string, string>>
): string {
  // 查找匹配的 CSS 规则（如 p.p1, span.s1）
  const selector = `${tag}.${cls}`
  const props = cssRules[selector]

  if (!props) {
    return `<${tag}${rest}>`
  }

  const styleParts: string[] = []
  if (props.textAlign) styleParts.push(`text-align:${props.textAlign}`)
  if (props.color && props.color !== '#000000') styleParts.push(`color:${props.color}`)
  if (props.fontSize) styleParts.push(`font-size:${props.fontSize}`)
  if (props.fontFamily) styleParts.push(`font-family:${props.fontFamily}`)
  if (props.backgroundColor) styleParts.push(`background-color:${props.backgroundColor}`)

  const styleStr = styleParts.length > 0 ? ` style="${styleParts.join(';')}"` : ''
  return `<${tag}${styleStr}${rest}>`
}

// 从 HTML 中提取标题（第一个非空段落的文本）
function extractTitleFromHtml(html: string): string | undefined {
  const pMatch = matchFirst(html, /<p[^>]*>([\s\S]*?)<\/p>/)
  if (!pMatch) return undefined
  const text = pMatch.replace(/<[^>]+>/g, '').trim()
  return text || undefined
}

// ============================================================
// 工具函数
// ============================================================

function matchAll(str: string, re: RegExp): string[] {
  const results: string[] = []
  let m
  while ((m = re.exec(str)) !== null) {
    results.push(m[0])
  }
  return results
}

function matchFirst(str: string, re: RegExp): string | undefined {
  const m = str.match(re)
  return m ? m[1] : undefined
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
