import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api } from './api'

vi.mock('./api', () => ({ api: { login: vi.fn(), register: vi.fn(), logout: vi.fn(), me: vi.fn(), experienceGroups: vi.fn(), createExperienceGroup: vi.fn(), updateExperienceGroup: vi.fn(), archiveExperienceGroup: vi.fn(), restoreExperienceGroup: vi.fn(), deleteExperienceGroup: vi.fn(), workContents: vi.fn(), createWorkContent: vi.fn(), updateWorkContent: vi.fn(), reorderWorkContents: vi.fn(), archiveWorkContent: vi.fn(), restoreWorkContent: vi.fn() } }))
const mocked = vi.mocked(api)

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); mocked.experienceGroups.mockResolvedValue([]); mocked.workContents.mockResolvedValue([]) })
afterEach(cleanup)

describe('认证后的工作台', () => {
  it('登录后直接进入个人职业工作台', async () => {
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'a@example.com' } })
    render(<App />); fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'a@example.com' } }); fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByText('a@example.com')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '当前工作区' })).not.toBeInTheDocument()
  })

  it('注册后可以进入个人职业工作台并退出登录', async () => {
    mocked.register.mockResolvedValue({ token: 'token', user: { id: 1, email: 'new@example.com' } })
    mocked.logout.mockResolvedValue(undefined)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '还没有账号？注册' }))
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '注册' }))

    await waitFor(() => expect(screen.getByText('new@example.com')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '登录工作台' })).toBeInTheDocument())
  })

  it('通过模块导航切换工作台、经历内容和简历方案页面', async () => {
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'navigation@example.com' } })

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'navigation@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument())
    const sidebar = screen.getByRole('complementary', { name: '主导航' })
    fireEvent.click(within(sidebar).getByRole('button', { name: '工作台概览' }))
    expect(screen.getByRole('heading', { name: 'navigation@example.com' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '继续整理你的职业经历' })).toBeInTheDocument()
    fireEvent.click(within(sidebar).getByRole('button', { name: '简历方案' }))
    expect(screen.getByRole('heading', { name: '简历方案' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'navigation@example.com' })).not.toBeInTheDocument()
    fireEvent.click(within(sidebar).getByRole('button', { name: '经历内容' }))
    expect(screen.getByRole('heading', { name: '经历分组' })).toBeInTheDocument()
  })

  it('可以创建经历分组并维护具体工作内容', async () => {
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'content@example.com' } })
    const group = { id: 10, user_id: 1, name: '平台项目', type: 'project' as const, organization: '示例团队', start_date: null, end_date: null, description: '项目背景', archived: false, created_at: '', updated_at: '' }
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
    fireEvent.click(screen.getAllByRole('button', { name: /新建经历分组/ })[0])
    fireEvent.change(screen.getByLabelText('经历名称'), { target: { value: '平台项目' } })
    fireEvent.click(screen.getByRole('button', { name: '创建经历分组' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '平台项目' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '添加具体工作内容' }))
    fireEvent.change(screen.getByLabelText('工作项标题'), { target: { value: '统一状态模型' } })
    fireEvent.change(screen.getByLabelText('背景与难点'), { target: { value: '梳理状态流转' } })
    fireEvent.change(screen.getByLabelText('技术方案与材料'), { target: { value: 'Rust' } })
    fireEvent.change(screen.getByLabelText('量化结果数据'), { target: { value: '耗时下降' } })
    fireEvent.click(screen.getByRole('button', { name: '添加工作内容' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: '统一状态模型' })).toBeInTheDocument())
    expect(screen.getByText('梳理状态流转')).toBeInTheDocument()
  })

  it('可以编辑、排序和归档具体工作内容', async () => {
    const group = { id: 10, user_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const first = { id: 20, experience_group_id: 10, title: '第一项', detailed_record: '第一项记录', technical_materials: 'Rust', result_data: null, supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
    const second = { id: 21, experience_group_id: 10, title: '第二项', detailed_record: '第二项记录', technical_materials: null, result_data: null, supplementary_notes: null, position: 1, archived: false, created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'content-actions@example.com' } })
    mocked.experienceGroups.mockResolvedValue([group]); mocked.workContents.mockResolvedValue([first, second]); mocked.reorderWorkContents.mockResolvedValue([second, first]); mocked.updateWorkContent.mockResolvedValue({ ...first, title: '第一项（已编辑）' }); mocked.archiveWorkContent.mockResolvedValue({ ...first, archived: true })
    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'content-actions@example.com' } }); fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } }); fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByText('平台项目')).toBeInTheDocument())
    fireEvent.click(screen.getByText('平台项目'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: '第一项' })).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: '编辑' })[0])
    fireEvent.change(screen.getByLabelText('工作项标题'), { target: { value: '第一项（已编辑）' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(mocked.updateWorkContent).toHaveBeenCalled())
    fireEvent.click(screen.getAllByRole('button', { name: '下移' })[0]); await waitFor(() => expect(mocked.reorderWorkContents).toHaveBeenCalledWith('token', 10, [21, 20]))
    fireEvent.click(screen.getAllByRole('button', { name: '归档' })[0]); await waitFor(() => expect(mocked.archiveWorkContent).toHaveBeenCalledWith('token', 21))
  })

  it('归档内容不阻止对剩余可见内容排序', async () => {
    const group = { id: 10, user_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const first = { id: 20, experience_group_id: 10, title: '第一项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 0, archived: false, created_at: '', updated_at: '' }
    const archived = { id: 22, experience_group_id: 10, title: '已归档项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 1, archived: true, created_at: '', updated_at: '' }
    const second = { id: 21, experience_group_id: 10, title: '第二项', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null, position: 2, archived: false, created_at: '', updated_at: '' }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'visible-order@example.com' } })
    mocked.experienceGroups.mockResolvedValue([group])
    mocked.workContents.mockImplementation(async (_token, _groupId, includeArchived) => includeArchived ? [first, archived, second] : [first, second])
    mocked.reorderWorkContents.mockResolvedValue([second, archived, first])

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'visible-order@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByText('平台项目')).toBeInTheDocument())
    fireEvent.click(screen.getByText('平台项目'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: '第一项' })).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: '下移' })[0])
    await waitFor(() => expect(mocked.reorderWorkContents).toHaveBeenCalledWith('token', 10, [21, 22, 20]))
  })

  it('归档经历分组后进入归档箱，支持恢复与彻底删除', async () => {
    const group = { id: 10, user_id: 1, name: '平台项目', type: 'project' as const, organization: null, start_date: null, end_date: null, description: null, archived: false, created_at: '', updated_at: '' }
    const archivedGroup = { ...group, archived: true }
    mocked.login.mockResolvedValue({ token: 'token', user: { id: 1, email: 'archive-group@example.com' } })
    mocked.experienceGroups.mockResolvedValue([group])
    mocked.workContents.mockResolvedValue([])
    mocked.archiveExperienceGroup.mockResolvedValue(archivedGroup)
    mocked.deleteExperienceGroup.mockResolvedValue(undefined as any)

    render(<App />)
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'archive-group@example.com' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '归档经历分组' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '归档经历分组' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已移至归档箱'))
    expect(screen.queryByRole('button', { name: '归档经历分组' })).not.toBeInTheDocument()

    // 切换到归档箱，可以恢复或彻底删除
    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    expect(screen.getByRole('button', { name: '恢复经历分组' })).toBeInTheDocument()
    const deleteBtn = screen.getByRole('button', { name: '彻底删除经历分组' })
    expect(deleteBtn).toBeInTheDocument()

    fireEvent.click(deleteBtn)
    const modalConfirmBtn = screen.getByRole('button', { name: '确认彻底删除' })
    fireEvent.click(modalConfirmBtn)

    await waitFor(() => {
      expect(mocked.deleteExperienceGroup).toHaveBeenCalledWith('token', 10)
      expect(screen.getByRole('status')).toHaveTextContent('已彻底删除')
    })
  })
})


