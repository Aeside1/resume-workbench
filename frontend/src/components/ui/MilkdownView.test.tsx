import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MilkdownView, MilkdownEditor } from './MilkdownView'
import { pasteMarkdown } from '../../test/pasteMarkdown'

afterEach(cleanup)

beforeAll(() => {
  // JSDOM 没有布局引擎；仅补几何 API，编辑与输入法逻辑仍使用真实组件。
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null })
})

describe('MilkdownView Markdown 渲染组件', () => {
  it('正确渲染 Obsidian 高亮语法 ==text== 为 mark.md-highlight', () => {
    render(<MilkdownView content="这是 ==关键权衡 trade off== 测试" />)

    const mark = screen.getByText('关键权衡 trade off')
    expect(mark.tagName.toLowerCase()).toBe('mark')
    expect(mark).toHaveClass('md-highlight')
  })

  it('正确渲染 **加粗** 为 strong 标签', () => {
    render(<MilkdownView content="**设计搭建面向 Agent 的闭环测试框架**" />)

    const strong = screen.getByText('设计搭建面向 Agent 的闭环测试框架')
    expect(strong.tagName.toLowerCase()).toBe('strong')
  })

  it('正确渲染列表项', () => {
    render(<MilkdownView content={`- 第一项工作贡献\n- 第二项架构设计`} />)

    expect(screen.getByText('第一项工作贡献')).toBeInTheDocument()
    expect(screen.getByText('第二项架构设计')).toBeInTheDocument()
  })

  it('内容为空时渲染 placeholder', () => {
    render(<MilkdownView content="" placeholder="暂无背景与难点" />)

    expect(screen.getByText('暂无背景与难点')).toBeInTheDocument()
  })
})

describe('MilkdownEditor 写时渲染编辑器（渲染状态下直接编辑）', () => {
  it('中文组词期间不发布中间值、不替换节点，提交后发布最终内容', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<MilkdownEditor value="初始内容" onChange={onChange} />)
    const editor = screen.getByRole('textbox')
    editor.focus()
    fireEvent.compositionStart(editor)
    const text = editor.querySelector('p')!.firstChild!
    text.textContent = '初始内容zhong'
    fireEvent.input(editor, { inputType: 'insertCompositionText', isComposing: true })
    rerender(<MilkdownEditor value="外部刷新" onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
    expect(editor.querySelector('p')!.firstChild).toBe(text)
    expect(editor).toHaveTextContent('初始内容zhong')
    text.textContent = '初始内容中文'
    fireEvent.input(editor, { inputType: 'insertCompositionText', isComposing: true })
    fireEvent.compositionEnd(editor, { data: '中文' })
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('初始内容中文'))
    expect(onChange.mock.calls.flat()).not.toContain('初始内容zhong')
  })

  it('父表单回传输入后保留节点，失焦再聚焦仍可撤销', () => {
    function Form() {
      const [value, setValue] = useState('')
      return <StrictMode><MilkdownEditor value={value} onChange={setValue} /></StrictMode>
    }
    render(<Form />)
    const editor = screen.getByRole('textbox')
    pasteMarkdown(editor, '**技术方案** 与 ==核心优势==')
    const strong = editor.querySelector('strong')
    fireEvent.blur(editor)
    fireEvent.focus(editor)
    expect(editor.querySelector('strong')).toBe(strong)
    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true })
    expect(editor).toHaveTextContent('')
    expect(document.querySelectorAll('[contenteditable="true"]')).toHaveLength(1)
  })

  it('未聚焦时接受外部内容更新，并清除上一份文档的撤销记录', () => {
    const onChange = vi.fn()
    const { rerender } = render(<MilkdownEditor value="旧内容" onChange={onChange} />)
    rerender(<MilkdownEditor value="==新内容==" onChange={onChange} />)
    const editor = screen.getByRole('textbox')
    expect(editor.querySelector('mark')).toHaveTextContent('新内容')
    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true })
    expect(editor).toHaveTextContent('新内容')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('直接在渲染状态下展示富文本并支持编辑，不存在分离的 Tab 或 Demo 提示', () => {
    const handleChange = () => {}
    const { container } = render(
      <MilkdownEditor
        value={`这是 ==核心优势== 与 **技术方案**`}
        onChange={handleChange}
        placeholder="请输入内容..."
      />
    )

    // 验证不存在分离的编辑/预览 Tab
    expect(screen.queryByRole('tab', { name: '编辑 (Markdown)' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '写时渲染预览' })).not.toBeInTheDocument()

    // 验证不存在 demo 式提示语
    expect(screen.queryByText(/支持 \*\*加粗\*\*/)).not.toBeInTheDocument()

    // 验证在渲染状态下展示加粗与高亮节点
    const mark = screen.getByText('核心优势')
    expect(mark.tagName.toLowerCase()).toBe('mark')
    expect(mark).toHaveClass('md-highlight')

    const strong = screen.getByText('技术方案')
    expect(strong.tagName.toLowerCase()).toBe('strong')

    // 验证容器是 contenteditable
    const editorNode = container.querySelector('[contenteditable="true"]')
    expect(editorNode).toBeInTheDocument()
  })

  it('指定 cacheKey 时，跨组件卸载再重新挂载能够延续 Undo 历史栈', () => {
    const onChange = vi.fn()
    const { unmount } = render(
      <MilkdownEditor cacheKey="test-persistent-key" value="初始内容" onChange={onChange} />
    )
    const editor1 = screen.getByRole('textbox')
    pasteMarkdown(editor1, '修改后的文本')
    fireEvent.blur(editor1)
    expect(editor1).toHaveTextContent('修改后的文本')

    // 模拟退出编辑态：组件被 unmount
    unmount()

    // 模拟再次点击卡片进入编辑态：使用相同的 cacheKey 重新挂载
    const onChange2 = vi.fn()
    render(
      <MilkdownEditor cacheKey="test-persistent-key" value="修改后的文本" onChange={onChange2} />
    )
    const editor2 = screen.getByRole('textbox')
    expect(editor2).toHaveTextContent('修改后的文本')

    // 按下 Ctrl+Z，能够成功撤销到初始内容！
    fireEvent.keyDown(editor2, { key: 'z', ctrlKey: true })
    expect(editor2).toHaveTextContent('初始内容')
  })
})
