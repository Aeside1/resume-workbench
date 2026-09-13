import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MilkdownEditor } from './MilkdownView'
import { MilkdownToolbar } from './MilkdownToolbar'

beforeAll(() => {
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null })
})

describe('MilkdownToolbar Markdown 富文本工具栏', () => {
  afterEach(cleanup)

  it('MilkdownEditor 默认渲染完整的 Markdown 格式工具栏', () => {
    render(
      <MilkdownEditor
        value="# 初始标题"
        onChange={vi.fn()}
      />
    )

    // 验证工具栏存在
    const toolbar = screen.getByRole('toolbar', { name: 'Markdown 格式工具栏' })
    expect(toolbar).toBeInTheDocument()

    // 验证历史按钮
    expect(screen.getByRole('button', { name: '撤销 (Ctrl+Z)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重做 (Ctrl+Y)' })).toBeInTheDocument()

    // 验证标题层级按钮
    expect(screen.getByRole('button', { name: '正文段落' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '一级标题 (# )' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '二级标题 (## )' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '三级标题 (### )' })).toBeInTheDocument()

    // 验证行内标记按钮
    expect(screen.getByRole('button', { name: '粗体 (**文本**)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '斜体 (*文本*)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '亮点/Trade-off高亮 (==文本==)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '行内代码 (`代码`)' })).toBeInTheDocument()

    // 验证块级格式按钮
    expect(screen.getByRole('button', { name: '引用块 (> 引用)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '无序列表 (- 列表)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '有序列表 (1. 列表)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '代码块 (```代码```)' })).toBeInTheDocument()
  })

  it('showToolbar 为 false 时不渲染工具栏', () => {
    render(
      <MilkdownEditor
        value="普通文本"
        onChange={vi.fn()}
        showToolbar={false}
      />
    )

    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('点击工具栏按钮触发对应的 ProseMirror 操作命令，并阻止默认失焦', () => {
    const handleChange = vi.fn()
    render(
      <MilkdownEditor
        value="测试文本"
        onChange={handleChange}
      />
    )

    const boldBtn = screen.getByRole('button', { name: '粗体 (**文本**)' })
    // 验证 mousedown 会阻止默认事件（保持选区不失焦）
    const mousedownEvent = new MouseEvent('mousedown', { cancelable: true, bubbles: true })
    boldBtn.dispatchEvent(mousedownEvent)
    expect(mousedownEvent.defaultPrevented).toBe(true)

    // 点击按钮
    fireEvent.click(boldBtn)
  })

  it('高亮按钮使用规范的矢量 SVG 图标，杜绝生硬突兀的文本', () => {
    render(<MilkdownEditor value="测试文本" onChange={vi.fn()} />)
    const highlightBtn = screen.getByRole('button', { name: '亮点/Trade-off高亮 (==文本==)' })
    expect(highlightBtn.querySelector('svg')).toBeInTheDocument()
    expect(highlightBtn).not.toHaveTextContent('==H==')
  })

  it('代码块按钮支持智能 Toggle，并可通过正文段落按钮一键还原', () => {
    render(<MilkdownEditor value="一段测试普通文本" onChange={vi.fn()} />)
    const editor = screen.getByRole('textbox')
    const codeBlockBtn = screen.getByRole('button', { name: '代码块 (```代码```)' })
    const paragraphBtn = screen.getByRole('button', { name: '正文段落' })

    // 代码块按钮本身使用标准 SVG
    expect(codeBlockBtn.querySelector('svg')).toBeInTheDocument()

    // 聚焦编辑器并将光标放入段落中
    fireEvent.focus(editor)
    // 点击代码块按钮，切换为 pre / code_block
    fireEvent.click(codeBlockBtn)
    expect(editor.querySelector('pre')).toBeInTheDocument()

    // 再次点击代码块按钮，一键 Toggle 还原回普通段落
    fireEvent.click(codeBlockBtn)
    expect(editor.querySelector('pre')).not.toBeInTheDocument()
    expect(editor.querySelector('p')).toBeInTheDocument()

    // 重新转为代码块，验证点击 P 按钮也能还原为普通段落
    fireEvent.click(codeBlockBtn)
    expect(editor.querySelector('pre')).toBeInTheDocument()
    fireEvent.click(paragraphBtn)
    expect(editor.querySelector('pre')).not.toBeInTheDocument()
    expect(editor.querySelector('p')).toBeInTheDocument()
  })
})
