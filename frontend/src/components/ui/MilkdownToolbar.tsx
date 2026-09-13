import { type ReactNode } from 'react'
import { Button, Tooltip } from '@heroui/react'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  SquareCode,
  Strikethrough,
  TextQuote,
  Undo2
} from 'lucide-react'
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
    <Tooltip>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className={`milkdown-toolbar-btn${isActive ? ' is-active' : ''}`}
        aria-label={title}
        isDisabled={disabled}
        // 关键：按压工具栏按钮时不把焦点从 ProseMirror 编辑器移走，保持选区
        preventFocusOnPress
        onPress={onClick}
      >
        {children}
      </Button>
      <Tooltip.Content>{title}</Tooltip.Content>
    </Tooltip>
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
          <Undo2 size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="重做 (Ctrl+Y)"
          onClick={() => execute(redo)}
        >
          <Redo2 size={14} aria-hidden="true" />
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
          <Pilcrow size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="一级标题 (# )"
          isActive={isBlockActive(state, nodes.heading, { level: 1 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 1 }))}
        >
          <Heading1 size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="二级标题 (## )"
          isActive={isBlockActive(state, nodes.heading, { level: 2 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 2 }))}
        >
          <Heading2 size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="三级标题 (### )"
          isActive={isBlockActive(state, nodes.heading, { level: 3 })}
          onClick={() => execute(setBlockType(nodes.heading, { level: 3 }))}
        >
          <Heading3 size={14} aria-hidden="true" />
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
          <Bold size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="斜体 (*文本*)"
          isActive={isMarkActive(state, marks.em)}
          onClick={() => execute(toggleMark(marks.em))}
        >
          <Italic size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="删除线 (~~文本~~)"
          isActive={isMarkActive(state, marks.strikethrough)}
          onClick={() => execute(toggleMark(marks.strikethrough))}
        >
          <Strikethrough size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="亮点/Trade-off高亮 (==文本==)"
          isActive={isMarkActive(state, marks.highlight)}
          onClick={() => execute(toggleMark(marks.highlight))}
        >
          <Highlighter size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="行内代码 (`代码`)"
          isActive={isMarkActive(state, marks.code)}
          onClick={() => execute(toggleMark(marks.code))}
        >
          <Code size={14} aria-hidden="true" />
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
          <TextQuote size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="无序列表 (- 列表)"
          isActive={isNodeInParents(state, nodes.bullet_list)}
          onClick={toggleBulletList}
        >
          <List size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="有序列表 (1. 列表)"
          isActive={isNodeInParents(state, nodes.ordered_list)}
          onClick={toggleOrderedList}
        >
          <ListOrdered size={14} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title="代码块 (```代码```)"
          isActive={isBlockActive(state, nodes.code_block) || isNodeInParents(state, nodes.code_block)}
          onClick={toggleCodeBlock}
        >
          <SquareCode size={14} aria-hidden="true" />
        </ToolbarButton>
      </div>
    </div>
  )
}
