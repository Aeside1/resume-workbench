import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MilkdownView } from './MilkdownView'

afterEach(cleanup)

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
