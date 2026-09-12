import React, { useEffect, useRef, useState } from 'react'

export interface MilkdownViewProps {
  content?: string | null
  className?: string
  placeholder?: string
}

/**
 * 辅助函数：将 Obsidian 语法（如 ==高亮==）、Markdown 粗体、行内代码与列表安全解析为 React 节点
 */
function renderMarkdownTokens(text: string): React.ReactNode[] {
  // 正则拆分：==高亮== | **粗体** | `代码` | 普通文本
  const tokenRegex = /(==[\s\S]+?==|\*\*[\s\S]+?\*\*|`[^`]+?`)/g
  const parts = text.split(tokenRegex)

  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      return (
        <mark key={i} className="md-highlight">
          {part.slice(2, -2)}
        </mark>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

/**
 * 基于 Milkdown 规范设计的 Markdown 渲染组件
 * 支持 Obsidian 风格的 ==高亮== 语法、GFM 列表、粗体与多行渲染，自适应各环境
 */
export function MilkdownView({
  content,
  className = '',
  placeholder = '暂无记录内容'
}: MilkdownViewProps) {
  if (!content || !content.trim()) {
    return <p className="typography-text text-muted">{placeholder}</p>
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentListItems: string[] = []

  const flushList = (keyPrefix: number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="markdown-ul">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="markdown-li">
              {renderMarkdownTokens(item)}
            </li>
          ))}
        </ul>
      )
      currentListItems = []
    }
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    if (!line) {
      flushList(idx)
      return
    }

    // 检查是否为列表项 (- 或 * 开头)
    const listMatch = line.match(/^[-*•]\s+(.*)$/)
    if (listMatch) {
      currentListItems.push(listMatch[1])
    } else {
      flushList(idx)
      elements.push(
        <p key={`p-${idx}`} className="markdown-paragraph">
          {renderMarkdownTokens(line)}
        </p>
      )
    }
  })

  flushList(lines.length)

  return (
    <div className={`milkdown-view-container markdown-body-render ${className}`}>
      {elements}
    </div>
  )
}

export interface MilkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  className?: string
  id?: string
}

/**
 * 将 Markdown 字符串解析为可就地编辑的富文本 HTML
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  const lines = markdown.split('\n')
  const result: string[] = []
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push('<p class="live-p"><br></p>')
      continue
    }

    const listMatch = line.match(/^[-*•]\s+(.*)$/)
    if (listMatch) {
      if (!inList) {
        result.push('<ul class="live-ul">')
        inList = true
      }
      result.push(`<li class="live-li">${renderInlineHtml(listMatch[1])}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(`<p class="live-p">${renderInlineHtml(line)}</p>`)
    }
  }

  if (inList) {
    result.push('</ul>')
  }

  return result.join('')
}

function renderInlineHtml(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // ==高亮== -> <mark class="md-highlight">
  html = html.replace(/==([\s\S]+?)==/g, '<mark class="md-highlight">$1</mark>')
  // **加粗** -> <strong>
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
  // `代码` -> <code>
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>')

  return html
}

/**
 * 将富文本 DOM 树反向序列化为干净的 Markdown 文本
 */
export function domToMarkdown(element: HTMLElement): string {
  const lines: string[] = []

  const walkInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ''
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()
      const childrenText = Array.from(el.childNodes).map(walkInline).join('')

      if (tagName === 'mark' || el.classList.contains('md-highlight')) {
        return `==${childrenText}==`
      }
      if (tagName === 'strong' || tagName === 'b') {
        return `**${childrenText}**`
      }
      if (tagName === 'code') {
        return `\`${childrenText}\``
      }
      if (tagName === 'br') {
        return ''
      }
      return childrenText
    }
    return ''
  }

  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tagName = el.tagName.toLowerCase()

      if (tagName === 'ul') {
        Array.from(el.querySelectorAll('li')).forEach((li) => {
          lines.push(`- ${walkInline(li).trim()}`)
        })
      } else if (tagName === 'li') {
        lines.push(`- ${walkInline(el).trim()}`)
      } else if (tagName === 'p' || tagName === 'div') {
        const text = walkInline(el)
        lines.push(text)
      } else {
        lines.push(walkInline(el))
      }
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) lines.push(text)
    }
  })

  return lines.join('\n')
}

/**
 * 真正的在渲染状态下编辑的写时渲染编辑器（Live WYSIWYG Editor）
 * 彻底消除双 Tab 分割与 Demo 提示语，支持直接在渲染后的加粗、列表与高亮样式中打字编辑
 */
export function MilkdownEditor({
  value,
  onChange,
  placeholder = '在此输入工作内容...',
  rows = 3,
  className = '',
  id
}: MilkdownEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const isTypingRef = useRef(false)

  // 当外部 value 变化且用户当前未在连续打字时，同步更新富文本渲染 DOM
  useEffect(() => {
    if (!isTypingRef.current && contentRef.current) {
      const targetHtml = markdownToHtml(value || '')
      if (contentRef.current.innerHTML !== targetHtml) {
        contentRef.current.innerHTML = targetHtml
      }
    }
  }, [value])

  const handleInput = () => {
    if (!contentRef.current) return
    isTypingRef.current = true
    const md = domToMarkdown(contentRef.current)
    onChange(md)
    setTimeout(() => {
      isTypingRef.current = false
    }, 100)
  }

  const handleBlur = () => {
    isTypingRef.current = false
    if (contentRef.current) {
      const md = domToMarkdown(contentRef.current)
      contentRef.current.innerHTML = markdownToHtml(md)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value
    onChange(newVal)
    if (contentRef.current) {
      contentRef.current.innerHTML = markdownToHtml(newVal)
    }
  }

  return (
    <div className={`milkdown-live-editor ${className}`}>
      <div
        ref={contentRef}
        className="milkdown-live-content markdown-body-render"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 28}px` }}
        onInput={handleInput}
        onBlur={handleBlur}
      />
      {/* 隐藏表单桥接控件：保障 label 点击聚焦、表单提交与自动化测试完全兼容 */}
      <textarea
        id={id}
        tabIndex={-1}
        className="sr-only live-editor-hidden-input"
        placeholder={placeholder}
        value={value}
        onChange={handleTextareaChange}
        onFocus={() => contentRef.current?.focus()}
        aria-hidden="true"
      />
    </div>
  )
}
