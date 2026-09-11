import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExperienceHubPanel } from './ExperienceHubPanel'
import { api } from '../../api'
import type { Session } from '../../session'

vi.mock('../../api', () => ({
  api: {
    experienceGroups: vi.fn(),
    createExperienceGroup: vi.fn(),
    archiveExperienceGroup: vi.fn(),
    restoreExperienceGroup: vi.fn(),
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
  it('正确渲染顶部操作栏（标题、新建经历分组按钮、显示已归档开关）与卡片流', async () => {
    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /经历/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建经历分组/ })).toBeInTheDocument()
    expect(screen.getByText('显示已归档')).toBeInTheDocument()

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
      expect(screen.getByText(/还没有经历分组/)).toBeInTheDocument()
    })
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

  it('点击显示已归档开关拉取并展示归档经历', async () => {
    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('微信支付平台实习')).toBeInTheDocument())

    const archiveToggle = screen.getByLabelText('显示已归档')
    fireEvent.click(archiveToggle)

    await waitFor(() => {
      expect(mocked.experienceGroups).toHaveBeenCalledWith('test-token', true)
    })
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
      expect(screen.getByRole('status')).toHaveTextContent(/经历分组已归档/)
    })
  })

  it('已归档卡片上一键恢复经历分组', async () => {
    const archivedGroup = { ...mockGroups[0], archived: true }
    mocked.experienceGroups.mockResolvedValue([archivedGroup])
    const restored = { ...archivedGroup, archived: false }
    mocked.restoreExperienceGroup.mockResolvedValue(restored)

    render(<ExperienceHubPanel session={mockSession} onSelectExperience={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('已归档')).toBeInTheDocument())

    const restoreBtn = screen.getByRole('button', { name: '恢复经历分组' })
    fireEvent.click(restoreBtn)

    await waitFor(() => {
      expect(mocked.restoreExperienceGroup).toHaveBeenCalledWith('test-token', 101)
      expect(screen.getByRole('status')).toHaveTextContent(/经历分组已恢复/)
    })
  })
})
