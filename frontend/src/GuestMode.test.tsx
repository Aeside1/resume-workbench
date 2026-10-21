import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api } from './api'

vi.mock('./api', async () => (await import('./test/apiMock')).apiModuleMock())

const mocked = vi.mocked(api)

const sidebar = () => screen.getByRole('complementary', { name: '主导航' })
const openAuthFromSidebar = () => fireEvent.click(within(sidebar()).getByRole('button', { name: '登录 / 注册' }))

const sampleGroup = { id: 1, name: '订单中台重构', type: 'project' as const, organization: '示例科技', start_date: null, end_date: null, description: '示例说明', archived: false, created_at: '', updated_at: '' }
const sampleContent = { id: 11, experience_group_id: 1, title: '拆分下单与支付链路', detailed_record: '正文', technical_materials: null, result_data: null, supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
const sampleHighlight = { id: 21, work_content_id: 11, label: '技术深度版', content: '正文', position: 0, archived: false, created_at: '', updated_at: '' }

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  mocked.experienceGroups.mockResolvedValue([sampleGroup])
  mocked.workContents.mockResolvedValue([sampleContent])
  mocked.resumeHighlights.mockResolvedValue([sampleHighlight])
  mocked.resumePlans.mockResolvedValue([])
})

afterEach(cleanup)

describe('游客工作台（未登录只读示例内容，ADR 008）', () => {
  it('首次访问直接落到游客工作台，不出现登录表单', async () => {
    render(<App />)

    expect(screen.getByRole('region', { name: '游客模式说明' })).toBeInTheDocument()
    expect(screen.getByText('示例内容 · 只读')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '经历分组' })).toBeInTheDocument()

    expect(screen.queryByLabelText('邮箱')).not.toBeInTheDocument()
    expect(within(sidebar()).getByText('游客工作台')).toBeInTheDocument()
    expect(within(sidebar()).getByText('未登录 · 示例只读')).toBeInTheDocument()
    expect(within(sidebar()).getByRole('button', { name: '登录 / 注册' })).toBeInTheDocument()
    expect(within(sidebar()).queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument()
    expect(mocked.me).not.toHaveBeenCalled()
  })

  it('经历分组只读：没有新建 / 编辑 / 归档入口', async () => {
    render(<App />)

    expect(await screen.findByText('订单中台重构')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /新建经历分组/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑经历分组' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '归档经历分组' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '彻底删除经历分组' })).not.toBeInTheDocument()
  })

  it('可以打开画布查看工作内容，但画布内没有编辑 / 新建 / 专注入口', async () => {
    render(<App />)
    fireEvent.click(await screen.findByText('订单中台重构'))

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: '拆分下单与支付链路' })).toBeInTheDocument()
    )
    expect(screen.queryByRole('button', { name: '添加具体工作内容' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新增工作内容' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑经历概况' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '展开专注模式' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('拖拽调整排序')).not.toBeInTheDocument()
  })

  it('抽屉里可以查看简历亮点，但没有新建 / 编辑 / 复制 / 删除', async () => {
    render(<App />)
    fireEvent.click(await screen.findByText('订单中台重构'))

    fireEvent.click(await screen.findByRole('button', { name: '简历亮点提炼' }))

    expect(await screen.findByText('技术深度版')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新建简历亮点' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑 技术深度版' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '复制 技术深度版' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '删除 技术深度版' })).not.toBeInTheDocument()
  })

  it('简历方案只给登录引导，不请求方案接口', async () => {
    render(<App />)
    fireEvent.click(within(sidebar()).getByRole('button', { name: '简历方案' }))

    expect(screen.getByRole('heading', { name: '简历方案' })).toBeInTheDocument()
    expect(screen.getByText('简历方案需要登录后使用')).toBeInTheDocument()
    expect(mocked.resumePlans).not.toHaveBeenCalled()
  })

  it('认证页可以「先以游客身份继续」返回工作台', async () => {
    render(<App />)
    openAuthFromSidebar()

    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '先以游客身份继续' }))

    expect(screen.queryByRole('heading', { name: '登录工作台' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '游客模式说明' })).toBeInTheDocument()
  })

  it('登录成功后游客横幅与游客身份消失', async () => {
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
