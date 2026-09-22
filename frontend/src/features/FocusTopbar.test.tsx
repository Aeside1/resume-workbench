import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FocusTopbar } from './FocusTopbar'

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

const trail = [
  { label: '经历内容', onPress: vi.fn() },
  { label: '蚂蚁集团', onPress: vi.fn() },
  { label: '重构渲染引擎' }
]

describe('FocusTopbar 专注写作区的内容区页头（04k：由内容区渲染）', () => {
  it('渲染三级面包屑，末级不可点且中间级与返回按钮都指向回画布', () => {
    const handleExitFocus = vi.fn()
    const handleBackToCanvas = vi.fn()

    render(
      <FocusTopbar
        trail={[
          { label: '经历内容', onPress: handleExitFocus },
          { label: '蚂蚁集团', onPress: handleBackToCanvas },
          { label: '重构渲染引擎' }
        ]}
        backLabel="返回画布"
        onBack={handleBackToCanvas}
        actions={<button type="button">收起伴随栏</button>}
      />
    )

    expect(screen.getByRole('button', { name: '返回画布' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起伴随栏' })).toBeInTheDocument()

    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    const items = within(breadcrumbNav).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map((item) => item.textContent)).toEqual([
      '经历内容',
      '蚂蚁集团',
      '重构渲染引擎'
    ])

    // 第 1 级退出整个专注，第 2 级回画布，第 3 级是当前位置（不可点）
    expect(within(items[0]).getByRole('link')).toBeInTheDocument()
    expect(within(items[1]).getByRole('link')).toBeInTheDocument()
    // 第 3 级是当前位置：虽仍渲染为框架 Link，但已标记 aria-current="page"，
    // 点击不会触发任何去向（onPress 已在 FocusTopbar 侧按“末级不可点”过滤）。
    expect(within(items[2]).getByRole('link')).toHaveAttribute('aria-current', 'page')

    fireEvent.click(within(items[1]).getByRole('link'))
    expect(handleBackToCanvas).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '返回画布' }))
    expect(handleBackToCanvas).toHaveBeenCalledTimes(2)
  })

  it('第 1 级退出整个专注模式（回经历内容）', () => {
    const handleExitFocus = vi.fn()
    const handleBackToCanvas = vi.fn()

    render(
      <FocusTopbar
        trail={[
          { label: '经历内容', onPress: handleExitFocus },
          { label: '蚂蚁集团', onPress: handleBackToCanvas },
          { label: '重构渲染引擎' }
        ]}
        backLabel="返回画布"
        onBack={handleBackToCanvas}
      />
    )

    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    const items = within(breadcrumbNav).getAllByRole('listitem')
    fireEvent.click(within(items[0]).getByRole('link'))

    expect(handleExitFocus).toHaveBeenCalledOnce()
    expect(handleBackToCanvas).not.toHaveBeenCalled()
  })

  it('面包屑各级按位置（而非文案）绑定去向：重名标题不会导致点错层级', () => {
    const handleExitFocus = vi.fn()
    const handleBackToCanvas = vi.fn()

    render(
      <FocusTopbar
        trail={[
          { label: '同名分组', onPress: handleExitFocus },
          { label: '同名分组', onPress: handleBackToCanvas },
          { label: '当前工作项' }
        ]}
        backLabel="返回画布"
        onBack={handleBackToCanvas}
      />
    )

    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    const links = within(breadcrumbNav).getAllByRole('link', { name: '同名分组' })
    expect(links).toHaveLength(2)

    fireEvent.click(links[1])
    expect(handleBackToCanvas).toHaveBeenCalledOnce()
    expect(handleExitFocus).not.toHaveBeenCalled()
  })

  it('显示保存状态微指示器（专注全程可见）', () => {
    const { rerender } = render(
      <FocusTopbar trail={trail} backLabel="返回画布" onBack={vi.fn()} saveStatus="saving" />
    )

    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('保存中...')

    rerender(<FocusTopbar trail={trail} backLabel="返回画布" onBack={vi.fn()} saveStatus="saved" />)

    // 成功态的前置勾号已改用 HeroUI SuccessIcon（AGENTS.md 规则 4：禁止以纯文本字符充当图标），
    // 因此断言只校验文案本身。
    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('所有修改已保存')
  })

  it('未提供 onBack 时不渲染返回按钮（不造死按钮）', () => {
    render(<FocusTopbar trail={[{ label: '经历内容' }]} backLabel="返回画布" />)

    expect(screen.queryByRole('button', { name: '返回画布' })).not.toBeInTheDocument()
  })
})
