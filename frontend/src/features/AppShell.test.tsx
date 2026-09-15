import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import type { Session } from '../session'

const mockSession: Session = {
  token: 'test-token',
  user: { id: 1, email: 'user@example.com' }
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('AppShell 侧边栏', () => {
  it('渲染紧凑的左侧侧边栏', () => {
    render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(sidebar).toBeInTheDocument()
  })

  it('侧边栏展示用户身份静态名片', () => {
    render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(within(sidebar).getByText('个人职业工作台')).toBeInTheDocument()
    expect(within(sidebar).getByText('user@example.com')).toBeInTheDocument()
    expect(within(sidebar).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('侧边栏显示用户信息与退出登录按钮', () => {
    render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(within(sidebar).getByText('user@example.com')).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: '退出登录' })).toBeInTheDocument()
  })

  it('侧边栏提供清晰的模块导航项', () => {
    const navigationButtons = (
      <>
        <button type="button">工作台概览</button>
        <button type="button">经历内容</button>
        <button type="button">简历方案</button>
      </>
    )
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        navigationButtons={navigationButtons}
      >
        <div>主内容</div>
      </AppShell>
    )

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    const nav = within(sidebar).getByRole('navigation', { name: '主要模块' })

    expect(within(nav).getByRole('button', { name: '工作台概览' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: '经历内容' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: '简历方案' })).toBeInTheDocument()
  })

  it('点击退出登录按钮触发 onLogout 回调', () => {
    const handleLogout = vi.fn()
    render(<AppShell session={mockSession} onLogout={handleLogout}><div>主内容</div></AppShell>)

    const logoutButton = screen.getByRole('button', { name: '退出登录' })
    fireEvent.click(logoutButton)

    expect(handleLogout).toHaveBeenCalledOnce()
  })
})

describe('AppShell 形态切换（04g：只有展开专注接管整屏）', () => {
  it('默认处于 hub 形态：侧栏可见且不渲染顶栏', () => {
    render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()
  })

  it('workspace 形态保留侧边栏、不渲染顶栏（分组画布与简历方案编辑器都在壳内展开）', () => {
    render(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="workspace">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()
  })

  it('只有 zen 形态隐藏侧边栏并交由面包屑顶栏接管', () => {
    const { rerender } = render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        mode="workspace"
        breadcrumbTrail={[{ label: '经历内容', onPress: vi.fn() }, { label: '蚂蚁集团' }]}
      >
        <div>主内容</div>
      </AppShell>
    )

    // workspace 下即便传了面包屑也不渲染顶栏，侧栏仍在
    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()

    rerender(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        mode="zen"
        breadcrumbTrail={[{ label: '经历内容', onPress: vi.fn() }, { label: '蚂蚁集团' }]}
      >
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.queryByRole('complementary', { name: '主导航' })).not.toBeInTheDocument()
    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    expect(breadcrumbNav).toBeInTheDocument()
    // 中间级改用 HeroUI Breadcrumbs（框架 Link），因此角色由 button 变为 link
    expect(within(breadcrumbNav).getByRole('link', { name: '经历内容' })).toBeInTheDocument()
    expect(within(breadcrumbNav).getByText('蚂蚁集团')).toBeInTheDocument()
  })

  it('zen 形态顶栏的返回按钮触发 onExitFocus', () => {
    const handleExitFocus = vi.fn()
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        mode="zen"
        breadcrumbTrail={[
          { label: '经历内容', onPress: handleExitFocus },
          { label: '测试经历' }
        ]}
        onExitFocus={handleExitFocus}
      >
        <div>主内容</div>
      </AppShell>
    )

    fireEvent.click(screen.getByRole('button', { name: '返回经历内容' }))

    expect(handleExitFocus).toHaveBeenCalledOnce()
  })

  it('zen 形态渲染三级面包屑，末级不可点且中间级与返回按钮都指向回画布', () => {
    const handleExitFocus = vi.fn()
    const handleBackToCanvas = vi.fn()
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        mode="zen"
        breadcrumbTrail={[
          { label: '经历内容', onPress: handleExitFocus },
          { label: '蚂蚁集团', onPress: handleBackToCanvas },
          { label: '重构渲染引擎' }
        ]}
        onExitFocus={handleExitFocus}
        backLabel="返回画布"
        focusActions={<button type="button">收起伴随栏</button>}
      >
        <div>主内容</div>
      </AppShell>
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

    // 第 1 级退出整个专注模式，第 2 级回画布，第 3 级是当前位置（不可点）
    expect(within(items[0]).getByRole('link')).toBeInTheDocument()
    expect(within(items[1]).getByRole('link')).toBeInTheDocument()
    // 第 3 级是当前位置：虽仍渲染为框架 Link，但已标记 aria-current="page"，
    // 点击不会触发任何去向（onPress 已在 AppShell 侧按“末级不可点”过滤）。
    expect(within(items[2]).getByRole('link')).toHaveAttribute('aria-current', 'page')

    fireEvent.click(within(items[1]).getByRole('link'))
    expect(handleBackToCanvas).toHaveBeenCalledOnce()
  })

  it('面包屑各级按位置（而非文案）绑定去向：重名标题不会导致点错层级', () => {
    const handleExitFocus = vi.fn()
    const handleBackToCanvas = vi.fn()
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        mode="zen"
        breadcrumbTrail={[
          { label: '同名分组', onPress: handleExitFocus },
          { label: '同名分组', onPress: handleBackToCanvas },
          { label: '当前工作项' }
        ]}
        onExitFocus={handleExitFocus}
      >
        <div>主内容</div>
      </AppShell>
    )

    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    const links = within(breadcrumbNav).getAllByRole('link', { name: '同名分组' })
    expect(links).toHaveLength(2)

    fireEvent.click(links[1])
    expect(handleBackToCanvas).toHaveBeenCalledOnce()
    expect(handleExitFocus).not.toHaveBeenCalled()
  })

  it('zen 形态顶栏显示保存状态微指示器', () => {
    const { rerender } = render(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="zen" saveStatus="saving">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('保存中...')

    rerender(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="zen" saveStatus="saved">
        <div>主内容</div>
      </AppShell>
    )

    // 成功态的前置勾号已改用 HeroUI SuccessIcon（AGENTS.md 规则 4：禁止以纯文本字符充当图标），
    // 因此断言只校验文案本身。
    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('所有修改已保存')
  })
})

describe('AppShell 侧栏折叠（04h）', () => {
  const navButtons = (
    <button type="button" aria-label="经历内容">
      <span>经历内容</span>
    </button>
  )

  it('默认展开：渲染用户邮箱与「收起侧栏」开关', () => {
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        navigationButtons={navButtons}
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
      >
        <div>主内容</div>
      </AppShell>
    )

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(sidebar).not.toHaveClass('app-sidebar--collapsed')
    expect(within(sidebar).getByText('user@example.com')).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: '收起侧栏' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: '经历内容' })).toBeInTheDocument()
  })

  it('折叠态：加折叠类、不渲染邮箱，退出登录与主题开关仍保留可访问名', () => {
    render(
      <AppShell
        session={mockSession}
        onLogout={vi.fn()}
        navigationButtons={navButtons}
        isSidebarCollapsed={true}
        onToggleSidebar={vi.fn()}
      >
        <div>主内容</div>
      </AppShell>
    )

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(sidebar).toHaveClass('app-sidebar--collapsed')
    expect(within(sidebar).queryByText('user@example.com')).not.toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: '展开侧栏' })).toBeInTheDocument()
    // 图标态不影响可访问名（不依赖被隐藏的文本）
    expect(within(sidebar).getByRole('button', { name: '退出登录' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('switch', { name: '深色模式' })).toBeInTheDocument()
  })

  it('点折叠开关触发 onToggleSidebar', () => {
    const onToggle = vi.fn()
    render(
      <AppShell session={mockSession} onLogout={vi.fn()} onToggleSidebar={onToggle} isSidebarCollapsed={false}>
        <div>主内容</div>
      </AppShell>
    )

    fireEvent.click(screen.getByRole('button', { name: '收起侧栏' }))

    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('未提供 onToggleSidebar 时不渲染折叠开关（不造死按钮）', () => {
    render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    expect(screen.queryByRole('button', { name: '收起侧栏' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '展开侧栏' })).not.toBeInTheDocument()
  })
})
