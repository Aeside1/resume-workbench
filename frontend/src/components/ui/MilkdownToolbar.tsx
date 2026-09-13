import { type ReactNode } from 'react'
import type { EditorView } from '@milkdown/prose/view'
import { EditorState, type Command } from '@milkdown/prose/state'
import type { MarkType, NodeType } from '@milkdown/prose/model'
import { setBlockType, toggleMark, wrapIn, lift } from '@milkdown/prose/commands'
import { redo, undo } from '@milkdown/prose/history'
import { wrapInList, liftListItem } from '@milkdown/prose/schema-list'

export interface MilkdownToolbarProps {
  view: EditorView | null
  state: EditorState | null
  className?: string
}

function isMarkActive(state: EditorState, type: MarkType | undefined): boolean {
  if (!type) return false
  const { from, $from, to, empty } = state.selection
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, type)
}

function isBlockActive(state: EditorState, type: NodeType | undefined, attrs: Record<string, unknown> = {}): boolean {
  if (!type) return false
  const { $from } = state.selection
  const parent = $from.parent
  if (parent.type !== type) return false
  for (const [key, value] of Object.entries(attrs)) {
    if (parent.attrs[key] !== value) return false
  }
  return true
}

function isNodeInParents(state: EditorState, type: NodeType | undefined): boolean {
  if (!type) return false
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === type) return true
  }
  return false
}

interface ToolbarButtonProps {
  title: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarButton({ title, isActive, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`milkdown-toolbar-btn ${isActive ? 'is-active' : ''}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => {
        // 关键：阻止失焦，保持 ProseMirror 选区
        e.preventDefault()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

export function MilkdownToolbar({ view, state, className = '' }: MilkdownToolbarProps) {
  if (!view || !state) {
    return <div className={`milkdown-toolbar-skeleton ${className}`} />
  }

  const { nodes, marks } = state.schema

  const execute = (command: Command) => {
    command(view.state, view.dispatch)
    view.focus()
  }

  const toggleBlockquote = () => {
    if (isNodeInParents(state, nodes.blockquote)) {
      execute(lift)
    } else {
      execute(wrapIn(nodes.blockquote))
    }
  }

  const toggleBulletList = () => {
    if (isNodeInParents(state, nodes.bullet_list)) {
      execute(liftListItem(nodes.list_item))
    } else {
      execute(wrapInList(nodes.bullet_list))
    }
  }

  const toggleOrderedList = () => {
    if (isNodeInParents(state, nodes.ordered_list)) {
      execute(liftListItem(nodes.list_item))
    } else {
      execute(wrapInList(nodes.ordered_list))
    }
  }

  const toggleCodeBlock = () => {
    if (isBlockActive(state, nodes.code_block) || isNodeInParents(state, nodes.code_block)) {
      execute(setBlockType(nodes.paragraph))
    } else {
      execute(setBlockType(nodes.code_block))
    }
  }

  return (
    <div
      className={`milkdown-toolbar ${className}`}
      role="toolbar"
      aria-label="Markdown 格式工具栏"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 撤销 / 重做 */}
      <div className="milkdown-toolbar-group">
        <ToolbarButton
          title="撤销 (Ctrl+Z)"
          onClick={() => execute(undo)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="重做 (Ctrl+Y)"
          onClick={() => execute(redo)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </ToolbarButton>
      </div>

      <div className="milkdown-toolbar-divider" />

      {/* 标题层级 */}
      <div className="milkdown-toolbar-group">
        <ToolbarButton
          title="正文段落"
          isActive={isBlockActive(state, nodes.paragraph)}
          onClick={() => execute(setBlockType(nodes.paragraph))}
        >
          <span className="toolbar-text-icon">P</span>
        </ToolbarButton>
        <ToolbarButton
          title="一级标题 (# )"
          isActive={isBlockActive(state, nodes.heading, { level: 1 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 1 }))}
        >
          <span className="toolbar-text-icon">H1</span>
        </ToolbarButton>
        <ToolbarButton
          title="二级标题 (## )"
          isActive={isBlockActive(state, nodes.heading, { level: 2 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 2 }))}
        >
          <span className="toolbar-text-icon">H2</span>
        </ToolbarButton>
        <ToolbarButton
          title="三级标题 (### )"
          isActive={isBlockActive(state, nodes.heading, { level: 3 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 3 }))}
        >
          <span className="toolbar-text-icon">H3</span>
        </ToolbarButton>
      </div>

      <div className="milkdown-toolbar-divider" />

      {/* 行内标记 */}
      <div className="milkdown-toolbar-group">
        <ToolbarButton
          title="粗体 (**文本**)"
          isActive={isMarkActive(state, marks.strong)}
          onClick={() => execute(toggleMark(marks.strong))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="斜体 (*文本*)"
          isActive={isMarkActive(state, marks.em)}
          onClick={() => execute(toggleMark(marks.em))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="亮点/Trade-off高亮 (==文本==)"
          isActive={isMarkActive(state, marks.highlight)}
          onClick={() => execute(toggleMark(marks.highlight))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 11-6 6v3h3l6-6" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="行内代码 (`代码`)"
          isActive={isMarkActive(state, marks.code)}
          onClick={() => execute(toggleMark(marks.code))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>
      </div>

      <div className="milkdown-toolbar-divider" />

      {/* 块级结构 */}
      <div className="milkdown-toolbar-group">
        <ToolbarButton
          title="引用块 (> 引用)"
          isActive={isNodeInParents(state, nodes.blockquote)}
          onClick={toggleBlockquote}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="无序列表 (- 列表)"
          isActive={isNodeInParents(state, nodes.bullet_list)}
          onClick={toggleBulletList}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="有序列表 (1. 列表)"
          isActive={isNodeInParents(state, nodes.ordered_list)}
          onClick={toggleOrderedList}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <line x1="4" y1="6" x2="5" y2="6" />
            <line x1="5" y1="6" x2="5" y2="10" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="代码块 (```代码```)"
          isActive={isBlockActive(state, nodes.code_block) || isNodeInParents(state, nodes.code_block)}
          onClick={toggleCodeBlock}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m9 10-2 2 2 2" />
            <path d="m15 10 2 2-2 2" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  )
}
