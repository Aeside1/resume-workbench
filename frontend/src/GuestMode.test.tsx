import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api } from './api'
import { GUEST_STORAGE_KEY, loadSampleWorkspace, readGuestWorkspace } from './guest/workspace'

vi.mock('./api', async () => (await import('./test/apiMock')).apiModuleMock())

const mocked = vi.mocked(api)

const sidebar = () => screen.getByRole('complementary', { name: '主导航' })
const openAuthFromSidebar = () => fireEvent.click(within(sidebar()).getByRole('button', { name: '登录 / 注册' }))

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  mocked.experienceGroups.mockResolvedValue([])
  mocked.workContents.mockResolvedValue([])
  mocked.resumeHighlights.mockResolvedValue([])
  mocked.resumePlans.mockResolvedValue([])
})

afterEach(cleanup)

describe('游客工作台（未登录也能进入，ADR 008）', () => {
  it('首次访问直接落到游客工作台，不出现登录表单', async () => {
    render(<App />)

    expect(screen.getByRole('region', { name: '游客模式说明' })).toBeInTheDocument()
    expect(screen.getByText('游客模式：数据只保存在这台浏览器')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '经历分组' })).toBeInTheDocument()

    // 认证页不再是入口闸门
    expect(screen.queryByLabelText('邮箱')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '登录工作台' })).not.toBeInTheDocument()

    // 侧栏换成游客身份 + 登录入口，而不是退出登录
    expect(within(sidebar()).getByText('游客工作台')).toBeInTheDocument()
    expect(within(sidebar()).getByText('本地草稿 · 未登录')).toBeInTheDocument()
    expect(within(sidebar()).getByRole('button', { name: '登录 / 注册' })).toBeInTheDocument()
    expect(within(sidebar()).queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument()

    // 游客态的本地令牌不拿去问 /api/auth/me
    expect(mocked.me).not.toHaveBeenCalled()
  })

  it('从侧栏进入认证页后可以「先以游客身份继续」回到工作台', async () => {
    render(<App />)
    openAuthFromSidebar()

    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '先以游客身份继续' }))

    expect(screen.queryByRole('heading', { name: '登录工作台' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '游客模式说明' })).toBeInTheDocument()
  })

  it('简历方案在游客态只给登录引导，不请求方案接口', async () => {
    render(<App />)
    fireEvent.click(within(sidebar()).getByRole('button', { name: '简历方案' }))

    expect(screen.getByRole('heading', { name: '简历方案' })).toBeInTheDocument()
    expect(screen.getByText('简历方案需要登录后使用')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '简历方案需要登录' })).toBeInTheDocument()
    expect(mocked.resumePlans).not.toHaveBeenCalled()
    expect(mocked.createResumePlan).not.toHaveBeenCalled()
  })

  it('工作台概览在游客态显示「游客工作台」而不是邮箱', async () => {
    render(<App />)
    fireEvent.click(within(sidebar()).getByRole('button', { name: '工作台概览' }))

    expect(screen.getByRole('heading', { name: '游客工作台' })).toBeInTheDocument()
    expect(within(sidebar()).getByText('本地草稿 · 未登录')).toBeInTheDocument()
  })

  it('载入示例内容后横幅给出清空入口，清空后回到空草稿', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    expect(screen.queryByRole('button', { name: '清空本地草稿' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '载入示例内容' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '清空本地草稿' })).toBeInTheDocument())

    const seeded = readGuestWorkspace()
    expect(seeded.groups.every((group) => group.name.startsWith('示例'))).toBe(true)
    expect(seeded.workContents.length).toBeGreaterThan(0)
    expect(seeded.highlights.length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '清空本地草稿' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '清空本地草稿' })).not.toBeInTheDocument())
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull()
    expect(readGuestWorkspace().groups).toHaveLength(0)
  })

  it('本地草稿变化后横幅实时出现「清空本地草稿」，不需要刷新页面', async () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: '清空本地草稿' })).not.toBeInTheDocument()

    // 模拟游客刚在列表里写下第一个分组：写入本地草稿会广播变更事件
    await act(async () => {
      loadSampleWorkspace()
    })

    await waitFor(() => expect(screen.getByRole('button', { name: '清空本地草稿' })).toBeInTheDocument())
  })

  it('登录成功后游客横幅与游客身份消失，回到账号工作台', async () => {
    mocked.login.mockResolvedValue({ token: 'server-token', user: { id: 1, email: 'back@example.com' } })
    render(<App />)
    openAuthFromSidebar()

    fireEvent.change(await screen.findByLabelText('邮箱'), { target: { value: 'back@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByText('back@example.com')).toBeInTheDocument())
    expect(screen.queryByRole('region', { name: '游客模式说明' })).not.toBeInTheDocument()
    expect(within(sidebar()).getByRole('button', { name: '退出登录' })).toBeInTheDocument()
    expect(within(sidebar()).queryByRole('button', { name: '登录 / 注册' })).not.toBeInTheDocument()
  })
})
