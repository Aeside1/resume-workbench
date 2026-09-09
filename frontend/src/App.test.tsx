import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api } from './api'

vi.mock('./api', () => ({ api: { login: vi.fn(), register: vi.fn(), logout: vi.fn(), workspaces: vi.fn(), createWorkspace: vi.fn() } }))
const mocked = vi.mocked(api)

beforeEach(() => { localStorage.clear(); vi.resetAllMocks() })
afterEach(cleanup)

describe('认证后的工作台', () => {
  it('登录后显示工作区并可切换和创建', async () => {
    const first = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    const second = { id: 2, name: '求职准备', created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'a@example.com' }, workspaces: [first] })
    mocked.workspaces.mockResolvedValue([first])
    mocked.createWorkspace.mockResolvedValue(second)
    render(<App />); fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'a@example.com' } }); fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '默认工作区' })).toBeInTheDocument())
    const createButton = screen.getByRole('button', { name: '新建工作区' })
    expect(createButton).toHaveClass('create-workspace-button')
    fireEvent.change(screen.getByPlaceholderText('新工作区名称'), { target: { value: '求职准备' } }); fireEvent.click(createButton)
    await waitFor(() => expect(screen.getByRole('heading', { name: '求职准备' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /当前工作区/ }))
    expect(document.querySelector('.workspace-chevron')).toBeInTheDocument()
    const defaultOption = await screen.findByRole('option', { name: '默认工作区' })
    expect(defaultOption).toHaveClass('workspace-option')
    expect(defaultOption).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: '求职准备' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(defaultOption)
    await waitFor(() => expect(screen.getByRole('heading', { name: '默认工作区' })).toBeInTheDocument())
    expect(screen.getByText('这是你的基础工作台。接下来可以创建经历分组，逐步沉淀具体工作内容。')).toBeInTheDocument()
  })

  it('注册后可以进入默认工作区并退出登录', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    mocked.register.mockResolvedValue({ token: 'token', user: { id: 1, email: 'new@example.com' }, workspaces: [workspace] })
    mocked.logout.mockResolvedValue(undefined)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '还没有账号？注册' }))
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: '默认工作区' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '退出' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '登录工作台' })).toBeInTheDocument())
    expect(mocked.logout).toHaveBeenCalledWith('token')
  })
})
