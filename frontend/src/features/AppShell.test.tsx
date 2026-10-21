import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { GUEST_SESSION, type Session } from '../session'

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

describe('AppShell 形态切换（04k：专注也在内容区展开）', () => {
  it('默认处于 hub 形态：侧栏可见', () => {
    const { container } = render(<AppShell session={mockSession} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(container.querySelector('.app-shell')).toHaveClass('app-shell--hub')
  })

  it('workspace 形态保留侧边栏（分组画布与简历方案编辑器都在壳内展开）', () => {
    const { container } = render(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="workspace">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(container.querySelector('.app-shell')).toHaveClass('app-shell--workspace')
    expect(container.querySelector('.app-main')).toHaveClass('app-main--workspace')
  })

  it('专注形态（isFocusOpen）不隐藏侧边栏，只把内容区锁成整屏高度（04k）', () => {
    const { container } = render(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="workspace" isFocusOpen>
        <div>主内容</div>
      </AppShell>
    )

    // 关键断言：专注不再覆盖左侧栏（04k 口径）
    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(container.querySelector('.app-shell')).toHaveClass('app-shell--focus')
    expect(container.querySelector('.app-main')).toHaveClass('app-main--focus')
  })

  it('外壳不再渲染任何页头：面包屑与保存态都由内容区页头（FocusTopbar）承担', () => {
    const { rerender } = render(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="workspace">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()

    rerender(
      <AppShell session={mockSession} onLogout={vi.fn()} mode="workspace" isFocusOpen>
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '保存状态' })).not.toBeInTheDocument()
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

describe('AppShell 游客态（ADR 008）', () => {
  it('游客身份名片与「登录 / 注册」入口取代退出登录', () => {
    const onRequestAuth = vi.fn()
    render(
      <AppShell session={GUEST_SESSION} onRequestAuth={onRequestAuth}>
        <div>主内容</div>
      </AppShell>
    )

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(within(sidebar).getByText('游客工作台')).toBeInTheDocument()
    expect(within(sidebar).getByText('未登录 · 示例只读')).toBeInTheDocument()
    expect(within(sidebar).queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument()

    fireEvent.click(within(sidebar).getByRole('button', { name: '登录 / 注册' }))
    expect(onRequestAuth).toHaveBeenCalledOnce()
  })

  it('折叠态下游客仍能按可访问名找到登录入口（不依赖被藏的文本）', () => {
    render(
      <AppShell session={GUEST_SESSION} onRequestAuth={vi.fn()} isSidebarCollapsed onToggleSidebar={vi.fn()}>
        <div>主内容</div>
      </AppShell>
    )

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(sidebar).toHaveClass('app-sidebar--collapsed')
    expect(within(sidebar).queryByText('未登录 · 示例只读')).not.toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: '登录 / 注册' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('switch', { name: '深色模式' })).toBeInTheDocument()
  })
})
