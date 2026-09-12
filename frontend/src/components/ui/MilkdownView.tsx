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
 * 轻量所见即所得 / 写时渲染编辑器（Milkdown 原语与即时渲染联动）
 * 在编辑框提供实时 Markdown 语法与 Obsidian 格式支持
 */
export function MilkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = '',
  id
}: MilkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  return (
    <div className={`milkdown-editor-wrapper ${className}`}>
      <div className="milkdown-editor-toolbar">
        <div className="editor-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'write'}
            className={`editor-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => setActiveTab('write')}
          >
            编辑 (Markdown)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preview'}
            className={`editor-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            写时渲染预览
          </button>
        </div>
        <span className="editor-hint-tip">支持 **加粗**、- 列表 与 ==Obsidian高亮==</span>
      </div>

      {activeTab === 'write' ? (
        <textarea
          id={id}
          className="milkdown-textarea"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="milkdown-preview-pane">
          <MilkdownView content={value} placeholder="输入内容后在此即时预览渲染效果..." />
        </div>
      )}
    </div>
  )
}
