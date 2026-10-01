import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'
import { api } from '../api'

vi.mock('../api', () => ({
  api: { login: vi.fn(), register: vi.fn() }
}))

const mocked = vi.mocked(api)

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('AuthPage 双栏认证页', () => {
  it('左栏交代系统定位与「你会这样用它」四步', () => {
    render(<AuthPage onAuthenticated={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: /先沉淀经历/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '你会这样用它' })).toBeInTheDocument()

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    for (const step of ['建立经历分组', '沉淀具体工作内容', '维护多条简历亮点', '组合成简历方案']) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }

    // 账号隔离口径取代了已废弃的「工作区 / 导出快照」描述
    expect(screen.getByText(/经历资产与简历方案仅你可见/)).toBeInTheDocument()
    expect(screen.queryByText(/工作区/)).not.toBeInTheDocument()
    expect(screen.queryByText(/导出快照/)).not.toBeInTheDocument()
  })

  it('右栏默认登录，可切换到注册并提交注册请求', async () => {
    mocked.register.mockResolvedValue({ token: 'token', user: { id: 1, email: 'new@example.com' } })
    const onAuthenticated = vi.fn()
    render(<AuthPage onAuthenticated={onAuthenticated} />)

    expect(screen.getByRole('heading', { name: '登录工作台' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '还没有账号？注册' }))
    expect(screen.getByRole('heading', { name: '创建你的工作台' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    await waitFor(() => expect(mocked.register).toHaveBeenCalledWith('new@example.com', 'password123'))
    expect(mocked.login).not.toHaveBeenCalled()
    expect(onAuthenticated).toHaveBeenCalledWith({ token: 'token', user: { id: 1, email: 'new@example.com' } })
  })

  it('提交失败时以 alert 呈现错误且停留在登录态', async () => {
    mocked.login.mockRejectedValue(new Error('邮箱或密码不正确'))
    render(<AuthPage onAuthenticated={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码不正确')
    expect(screen.getByRole('heading', { name: '登录工作台' })).toBeInTheDocument()
  })
})
