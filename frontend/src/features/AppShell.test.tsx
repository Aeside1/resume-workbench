import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import type { Session } from '../session'

const mockSession: Session = {
  token: 'test-token',
  user: { id: 1, email: 'user@example.com' },
  workspaces: [
    { id: 1, name: '工作区A', created_at: '', updated_at: '' },
    { id: 2, name: '工作区B', created_at: '', updated_at: '' }
  ],
  selectedWorkspaceId: 1
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('AppShell 侧边栏', () => {
  it('渲染紧凑的左侧侧边栏', () => {
    render(<AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    expect(sidebar).toBeInTheDocument()
  })

  it('侧边栏显示工作区切换下拉控件', () => {
    render(<AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    const workspaceSelect = within(sidebar).getByRole('combobox', { name: '当前工作区' })
    expect(workspaceSelect).toHaveTextContent('工作区A')
  })

  it('侧边栏显示用户信息与退出登录按钮', () => {
    render(<AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()}><div>主内容</div></AppShell>)

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
        onSessionChange={vi.fn()}
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
    render(<AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={handleLogout}><div>主内容</div></AppShell>)

    const logoutButton = screen.getByRole('button', { name: '退出登录' })
    fireEvent.click(logoutButton)

    expect(handleLogout).toHaveBeenCalledOnce()
  })

  it('切换工作区下拉选项触发 onSessionChange', () => {
    const handleSessionChange = vi.fn()
    render(<AppShell session={mockSession} onSessionChange={handleSessionChange} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    const workspaceSelect = screen.getByRole('combobox', { name: '当前工作区' })
    fireEvent.change(workspaceSelect, { target: { value: '2' } })

    expect(handleSessionChange).toHaveBeenCalledWith({
      ...mockSession,
      selectedWorkspaceId: 2
    })
  })
})

describe('AppShell 专注模式切换', () => {
  it('默认处于 hub 模式，侧边栏可见', () => {
    render(<AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()}><div>主内容</div></AppShell>)

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '面包屑导航' })).not.toBeInTheDocument()
  })

  it('进入 focus 模式后隐藏侧边栏', () => {
    const { rerender } = render(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="hub">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('complementary', { name: '主导航' })).toBeInTheDocument()

    rerender(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.queryByRole('complementary', { name: '主导航' })).not.toBeInTheDocument()
  })

  it('支持 focus-canvas 模式并隐藏侧边栏与显示顶栏', () => {
    render(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus-canvas" breadcrumb="经历内容 / 蚂蚁集团">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.queryByRole('complementary', { name: '主导航' })).not.toBeInTheDocument()
    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    expect(breadcrumbNav).toBeInTheDocument()
    expect(within(breadcrumbNav).getByText(/经历内容 \/ 蚂蚁集团/)).toBeInTheDocument()
  })

  it('focus 模式显示轻量面包屑顶栏', () => {
    render(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus" breadcrumb="经历内容 / 测试经历">
        <div>主内容</div>
      </AppShell>
    )

    const breadcrumbNav = screen.getByRole('navigation', { name: '面包屑导航' })
    expect(breadcrumbNav).toBeInTheDocument()
    expect(within(breadcrumbNav).getByText(/经历内容 \/ 测试经历/)).toBeInTheDocument()
  })

  it('focus 模式下点击面包屑返回按钮触发 onExitFocus', () => {
    const handleExitFocus = vi.fn()
    render(
      <AppShell
        session={mockSession}
        onSessionChange={vi.fn()}
        onLogout={vi.fn()}
        mode="focus"
        breadcrumb="经历内容 / 测试经历"
        onExitFocus={handleExitFocus}
      >
        <div>主内容</div>
      </AppShell>
    )

    const backButton = screen.getByRole('button', { name: '返回经历内容' })
    fireEvent.click(backButton)

    expect(handleExitFocus).toHaveBeenCalledOnce()
  })

  it('focus 模式顶栏显示退出专注按钮', () => {
    const handleExitFocus = vi.fn()
    render(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus" onExitFocus={handleExitFocus}>
        <div>主内容</div>
      </AppShell>
    )

    const exitButton = screen.getByRole('button', { name: '退出专注模式' })
    fireEvent.click(exitButton)

    expect(handleExitFocus).toHaveBeenCalledOnce()
  })

  it('focus 模式顶栏显示保存状态微指示器', () => {
    const { rerender } = render(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus" saveStatus="saving">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('保存中...')

    rerender(
      <AppShell session={mockSession} onSessionChange={vi.fn()} onLogout={vi.fn()} mode="focus" saveStatus="saved">
        <div>主内容</div>
      </AppShell>
    )

    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('✓ 所有修改已保存')
  })
})
