import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExperienceHubPanel } from './ExperienceHubPanel'
import { api } from '../../api'
import type { Session } from '../../session'

vi.mock('../../api', () => ({
  api: {
    experienceGroups: vi.fn(),
    createExperienceGroup: vi.fn(),
    updateExperienceGroup: vi.fn(),
    archiveExperienceGroup: vi.fn(),
    restoreExperienceGroup: vi.fn(),
    deleteExperienceGroup: vi.fn(),
    workContents: vi.fn()
  }
}))
const mocked = vi.mocked(api)

const mockSession: Session = {
  token: 'test-token',
  user: { id: 1, email: 'user@example.com' }
}

const mockGroups = [
  {
    id: 101,
    user_id: 1,
    name: '微信支付平台实习',
    type: 'internship' as const,
    organization: '腾讯科技',
    start_date: '2024-03-01',
    end_date: '2024-09-01',
    description: '负责营销活动与跨端研发。',
    archived: false,
    created_at: '',
    updated_at: ''
  },
  {
    id: 102,
    user_id: 1,
    name: '开源配置中心',
    type: 'project' as const,
    organization: 'GitHub',
    start_date: '2023-09-01',
    end_date: null,
    description: '基于 Rust 的轻量级配置中心。',
    archived: false,
    created_at: '',
    updated_at: ''
  }
]

beforeEach(() => {
  vi.resetAllMocks()
  mocked.experienceGroups.mockResolvedValue(mockGroups)
  mocked.workContents.mockImplementation(async (_token, groupId) => {
    if (groupId === 101) {
      return [{ id: 1 }, { id: 2 }, { id: 3 }] as any
    }
    return [{ id: 4 }] as any
  })
})
afterEach(cleanup)

describe('ExperienceHubPanel 经历管理 Hub', () => {
  it('正确渲染顶部操作栏（标题、新建经历分组按钮、在用经历与归档箱 Tab）与卡片流', async () => {
    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /经历/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建经历分组/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /在用经历/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /归档箱/ })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('微信支付平台实习')).toBeInTheDocument()
      expect(screen.getByText('开源配置中心')).toBeInTheDocument()
    })

    expect(screen.getByText('3 项具体工作')).toBeInTheDocument()
    expect(screen.getByText('1 项具体工作')).toBeInTheDocument()
  })

  it('列表为空时展示友好的空状态引导', async () => {
    mocked.experienceGroups.mockResolvedValue([])

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/还没有在用经历分组/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    expect(screen.getByText(/归档箱是空的/)).toBeInTheDocument()
  })

  it('点击卡片触发 onSelectExperience 回调进入沉浸长画布', async () => {
    const handleSelect = vi.fn()
    render(<ExperienceHubPanel session={mockSession} onSelectExperience={handleSelect} />)

    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())

    fireEvent.click(screen.getByText('微信支付平台实习'))
    expect(handleSelect).toHaveBeenCalledWith(mockGroups[0])
  })

  it('点击新建经历分组按钮唤出模态弹窗，提交成功后自动调度进入长画布', async () => {
    const handleSelect = vi.fn()
    const newGroup = {
      id: 103,
      user_id: 1,
      name: '字节跳动基础架构实习',
      type: 'internship' as const,
      organization: '字节跳动',
      start_date: '2024-10-01',
      end_date: null,
      description: '负责云原生中间件。',
      archived: false,
      created_at: '',
      updated_at: ''
    }
    mocked.createExperienceGroup.mockResolvedValue(newGroup)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={handleSelect} />)

    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /新建经历分组/ }))
    expect(screen.getByRole('heading', { name: '新建经历分组' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('经历名称'), { target: { value: '字节跳动基础架构实习' } })
    fireEvent.change(screen.getByLabelText('组织或项目归属'), { target: { value: '字节跳动' } })
    fireEvent.click(screen.getByRole('button', { name: '创建经历分组' }))

    await waitFor(() => {
      expect(mocked.createExperienceGroup).toHaveBeenCalled()
      expect(handleSelect).toHaveBeenCalledWith(newGroup)
    })
  })

  it('通过 Tab 切换在用经历列表与归档箱回收站', async () => {
    const mixedGroups = [
      mockGroups[0],
      { ...mockGroups[1], archived: true }
    ]
    mocked.experienceGroups.mockResolvedValue(mixedGroups)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())
    // 初始处于在用经历 Tab，不展示归档的“开源配置中心”
    expect(screen.queryByText('开源配置中心')).not.toBeInTheDocument()

    // 切换到归档箱 Tab
    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    expect(screen.getByText('开源配置中心')).toBeInTheDocument()
    expect(screen.queryByText('微信支付平台实习')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '恢复经历分组' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '彻底删除经历分组' })).toBeInTheDocument()
  })

  it('直接在卡片上归档经历分组，更新状态并展示提示', async () => {
    const archived = { ...mockGroups[0], archived: true }
    mocked.archiveExperienceGroup.mockResolvedValue(archived)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())

    const archiveBtns = screen.getAllByRole('button', { name: '归档经历分组' })
    fireEvent.click(archiveBtns[0])

    await waitFor(() => {
      expect(mocked.archiveExperienceGroup).toHaveBeenCalledWith('test-token', 101)
      expect(screen.getByRole('alert')).toHaveTextContent(/已移至归档箱/)
    })

    // 归档后离开在用经历列表
    expect(screen.queryByText('微信支付平台实习')).not.toBeInTheDocument()

    // 切换到归档箱可以查看到该项
    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    expect(screen.getByText('微信支付平台实习')).toBeInTheDocument()
  })

  it('在归档箱中一键恢复经历分组', async () => {
    const archivedGroup = { ...mockGroups[0], archived: true }
    mocked.experienceGroups.mockResolvedValue([archivedGroup])
    const restored = { ...archivedGroup, archived: false }
    mocked.restoreExperienceGroup.mockResolvedValue(restored)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    // 切换至归档箱
    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    await waitFor(() => expect(screen.getByText('已归档')).toBeInTheDocument())

    const restoreBtn = screen.getByRole('button', { name: '恢复经历分组' })
    fireEvent.click(restoreBtn)

    await waitFor(() => {
      expect(mocked.restoreExperienceGroup).toHaveBeenCalledWith('test-token', 101)
      expect(screen.getByRole('alert')).toHaveTextContent(/已恢复到在用经历列表/)
    })

    // 恢复后离开归档箱
    expect(screen.queryByText('微信支付平台实习')).not.toBeInTheDocument()

    // 切换回在用经历可见
    fireEvent.click(screen.getByRole('tab', { name: /在用经历/ }))
    expect(screen.getByText('微信支付平台实习')).toBeInTheDocument()
  })

  it('在归档箱中点击彻底删除经历分组，支持弹窗确认与取消', async () => {
    const archivedGroup = { ...mockGroups[0], archived: true }
    mocked.experienceGroups.mockResolvedValue([archivedGroup])
    mocked.deleteExperienceGroup.mockResolvedValue(undefined as any)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    // 切换至归档箱
    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())

    // 点击卡片上的彻底删除按钮，弹出确认弹窗
    const cardDeleteBtn = screen.getByRole('button', { name: '彻底删除经历分组' })
    fireEvent.click(cardDeleteBtn)

    expect(screen.getByRole('heading', { name: '确认彻底删除经历分组' })).toBeInTheDocument()
    expect(screen.getByText(/数据无法恢复/)).toBeInTheDocument()

    // 点击取消，不执行删除
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('heading', { name: '确认彻底删除经历分组' })).not.toBeInTheDocument()
    expect(mocked.deleteExperienceGroup).not.toHaveBeenCalled()
    expect(screen.getByText('微信支付平台实习')).toBeInTheDocument()

    // 再次点击彻底删除并确认
    fireEvent.click(cardDeleteBtn)
    const modalConfirmBtn = screen.getByRole('button', { name: '确认彻底删除' })
    fireEvent.click(modalConfirmBtn)

    await waitFor(() => {
      expect(mocked.deleteExperienceGroup).toHaveBeenCalledWith('test-token', 101)
      expect(screen.getByRole('alert')).toHaveTextContent(/已彻底删除/)
    })

    expect(screen.queryByText('微信支付平台实习')).not.toBeInTheDocument()
    expect(screen.getByText(/归档箱是空的/)).toBeInTheDocument()
  })

  it('在在用列表中点击编辑经历分组，唤出编辑弹窗，提交修改后更新经历列表', async () => {
    const updatedGroup = {
      ...mockGroups[0],
      name: '微信支付核心系统开发'
    }
    mocked.updateExperienceGroup.mockResolvedValue(updatedGroup)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('微信支付平台实习')).toBeInTheDocument()
    })

    const editBtns = screen.getAllByRole('button', { name: '编辑经历分组' })
    fireEvent.click(editBtns[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('编辑经历分组')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText('经历名称')
    fireEvent.change(nameInput, { target: { value: '微信支付核心系统开发' } })

    const submitBtn = screen.getByRole('button', { name: '保存修改' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mocked.updateExperienceGroup).toHaveBeenCalledWith(
        mockSession.token,
        101,
        expect.objectContaining({ name: '微信支付核心系统开发' })
      )
      expect(screen.getByText('微信支付核心系统开发')).toBeInTheDocument()
      expect(screen.getByText(/已成功保存修改/)).toBeInTheDocument()
    })
  })
})


