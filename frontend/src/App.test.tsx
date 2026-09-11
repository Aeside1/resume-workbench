import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api } from './api'

vi.mock('./api', () => ({ api: { login: vi.fn(), register: vi.fn(), logout: vi.fn(), workspaces: vi.fn(), createWorkspace: vi.fn(), experienceGroups: vi.fn(), createExperienceGroup: vi.fn(), updateExperienceGroup: vi.fn(), archiveExperienceGroup: vi.fn(), restoreExperienceGroup: vi.fn(), workContents: vi.fn(), createWorkContent: vi.fn(), updateWorkContent: vi.fn(), reorderWorkContents: vi.fn(), archiveWorkContent: vi.fn(), restoreWorkContent: vi.fn() } }))
const mocked = vi.mocked(api)

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); mocked.experienceGroups.mockResolvedValue([]); mocked.workContents.mockResolvedValue([]) })
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

  it('通过模块导航切换工作台、经历内容和简历方案页面', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'navigation@example.com' }, workspaces: [workspace] })
    mocked.workspaces.mockResolvedValue([workspace])

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'navigation@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '工作台' }))
    expect(screen.getByRole('heading', { name: '继续整理你的职业经历' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation', { name: '模块导航' })).getByRole('button', { name: /简历方案/ }))
    expect(screen.getByRole('heading', { name: '简历方案' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '经历内容' }))
    expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument()
  })

  it('可以创建经历分组并维护具体工作内容', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'content@example.com' }, workspaces: [workspace] })
    mocked.workspaces.mockResolvedValue([workspace])
    const group = { id: 10, workspace_id: 1, name: '平台项目', type: 'project' as const, organization: '示例团队', start_date: null, end_date: null, description: '项目背景', archived: false, created_at: '', updated_at: '' }
    const content = { id: 20, experience_group_id: 10, title: '统一状态模型', detailed_record: '梳理状态流转', technical_materials: 'Rust', result_data: '耗时下降', supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
    mocked.createExperienceGroup.mockResolvedValue(group)
    mocked.experienceGroups.mockResolvedValue([])
    mocked.createWorkContent.mockResolvedValue(content)
    mocked.workContents.mockResolvedValue([])
    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'content@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('经历名称'), { target: { value: '平台项目' } })
    fireEvent.click(screen.getByRole('button', { name: '创建经历分组' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /平台项目/ })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '统一状态模型' } })
    fireEvent.change(screen.getByLabelText('详细记录'), { target: { value: '梳理状态流转' } })
    fireEvent.change(screen.getByLabelText('技术材料'), { target: { value: 'Rust' } })
    fireEvent.change(screen.getByLabelText('结果数据'), { target: { value: '耗时下降' } })
    fireEvent.click(screen.getByRole('button', { name: '添加具体工作内容' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '统一状态模型' })).toBeInTheDocument())
    expect(screen.getByText('梳理状态流转')).toBeInTheDocument()
  })

  it('可以编辑、排序和归档具体工作内容', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    const group = { id: 10, workspace_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const first = { id: 20, experience_group_id: 10, title: '第一项', detailed_record: '第一项记录', technical_materials: 'Rust', result_data: null, supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
    const second = { id: 21, experience_group_id: 10, title: '第二项', detailed_record: '第二项记录', technical_materials: null, result_data: null, supplementary_notes: null, position: 1, archived: false, created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'content-actions@example.com' }, workspaces: [workspace] })
    mocked.workspaces.mockResolvedValue([workspace]); mocked.experienceGroups.mockResolvedValue([group]); mocked.workContents.mockResolvedValue([first, second]); mocked.reorderWorkContents.mockResolvedValue([second, first]); mocked.updateWorkContent.mockResolvedValue({ ...first, title: '第一项（已编辑）' }); mocked.archiveWorkContent.mockResolvedValue({ ...first, archived: true })
    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'content-actions@example.com' } }); fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '第一项' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '第一项' })); fireEvent.change(screen.getByLabelText('标题'), { target: { value: '第一项（已编辑）' } }); fireEvent.click(screen.getByRole('button', { name: '保存具体工作内容' })); await waitFor(() => expect(mocked.updateWorkContent).toHaveBeenCalled())
    fireEvent.click(screen.getAllByRole('button', { name: '下移' })[0]); await waitFor(() => expect(mocked.reorderWorkContents).toHaveBeenCalledWith('token', 10, [21, 20]))
    fireEvent.click(screen.getAllByRole('button', { name: '归档' })[0]); await waitFor(() => expect(mocked.archiveWorkContent).toHaveBeenCalledWith('token', 21))
  })

  it('归档内容不阻止对剩余可见内容排序', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    const group = { id: 10, workspace_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const first = { id: 20, experience_group_id: 10, title: '第一项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
    const archived = { id: 22, experience_group_id: 10, title: '已归档项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 1, archived: true, created_at: '', updated_at: '' }
    const second = { id: 21, experience_group_id: 10, title: '第二项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 2, archived: false, created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'visible-order@example.com' }, workspaces: [workspace] })
    mocked.workspaces.mockResolvedValue([workspace])
    mocked.experienceGroups.mockResolvedValue([group])
    mocked.workContents.mockImplementation(async (_token, _groupId, includeArchived) => includeArchived ? [first, archived, second] : [first, second])
    mocked.reorderWorkContents.mockResolvedValue([second, archived, first])

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'visible-order@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '第一项' })).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: '下移' })[0])
    await waitFor(() => expect(mocked.reorderWorkContents).toHaveBeenCalledWith('token', 10, [21, 22, 20]))
  })

  it('归档经历分组后保留恢复入口，避免内容看起来被删除', async () => {
    const workspace = { id: 1, name: '默认工作区', created_at: '', updated_at: '' }
    const group = { id: 10, workspace_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const archivedGroup = { ...group, archived: true }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'archive-group@example.com' }, workspaces: [workspace] })
    mocked.workspaces.mockResolvedValue([workspace])
    mocked.experienceGroups.mockImplementation(async (_token, _workspaceId, includeArchived) => includeArchived ? [archivedGroup] : [group])
    mocked.workContents.mockResolvedValue([])
    mocked.archiveExperienceGroup.mockResolvedValue(archivedGroup)

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'archive-group@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '归档经历分组' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '归档经历分组' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('经历分组已归档'))
    expect(screen.getByText('显示已归档')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '恢复经历分组' })).toBeInTheDocument()
  })
})
