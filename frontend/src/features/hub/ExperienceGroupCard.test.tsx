import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExperienceGroupCard } from './ExperienceGroupCard'
import type { ExperienceGroup } from '../../api'

afterEach(cleanup)

describe('ExperienceGroupCard', () => {
  const baseGroup: ExperienceGroup = {
    id: 1,
    user_id: 1,
    name: '微信支付开发实习',
    type: 'internship',
    organization: '腾讯科技',
    start_date: '2024-03-01',
    end_date: '2024-09-01',
    description: '负责营销活动体系与收银台组件重构。',
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-09-01T00:00:00Z'
  }

  it('清晰展示名称、组织归属、经历类型、起止日期、整体说明与工作项数量', () => {
    render(
      <ExperienceGroupCard
        group={baseGroup}
        workContentCount={5}
        onSelect={vi.fn()}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(screen.getByText('微信支付开发实习')).toBeInTheDocument()
    expect(screen.getByText('腾讯科技')).toBeInTheDocument()
    expect(screen.getByText('实习经历')).toBeInTheDocument()
    expect(screen.getByText(/2024-03-01/)).toBeInTheDocument()
    expect(screen.getByText(/2024-09-01/)).toBeInTheDocument()
    expect(screen.getByText('负责营销活动体系与收银台组件重构。')).toBeInTheDocument()
    expect(screen.getByText('5 项具体工作')).toBeInTheDocument()
  })

  it('无起止日期与说明时展示优雅兜底文案', () => {
    const minimalGroup: ExperienceGroup = {
      ...baseGroup,
      id: 2,
      name: '个人博客项目',
      type: 'project',
      organization: null,
      start_date: null,
      end_date: null,
      description: null
    }

    render(
      <ExperienceGroupCard
        group={minimalGroup}
        workContentCount={0}
        onSelect={vi.fn()}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(screen.getByText('个人博客项目')).toBeInTheDocument()
    expect(screen.getByText('项目经历')).toBeInTheDocument()
    expect(screen.getByText('未填写归属')).toBeInTheDocument()
    expect(screen.getByText('未设置起止时间')).toBeInTheDocument()
    expect(screen.getByText('还没有整体说明。')).toBeInTheDocument()
    expect(screen.getByText('0 项具体工作')).toBeInTheDocument()
  })

  it('点击卡片主体触发 onSelect 回调并传递经历数据', () => {
    const handleSelect = vi.fn()
    render(
      <ExperienceGroupCard
        group={baseGroup}
        workContentCount={3}
        onSelect={handleSelect}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('微信支付开发实习'))
    expect(handleSelect).toHaveBeenCalledWith(baseGroup)
  })

  it('未归档经历展示归档按钮，点击触发 onArchive 且不触发 onSelect', () => {
    const handleSelect = vi.fn()
    const handleArchive = vi.fn()

    render(
      <ExperienceGroupCard
        group={baseGroup}
        workContentCount={2}
        onSelect={handleSelect}
        onArchive={handleArchive}
        onRestore={vi.fn()}
      />
    )

    const archiveBtn = screen.getByRole('button', { name: '归档经历分组' })
    expect(archiveBtn).toBeInTheDocument()
    fireEvent.click(archiveBtn)

    expect(handleArchive).toHaveBeenCalledWith(baseGroup)
    expect(handleSelect).not.toHaveBeenCalled()
  })

  it('未归档经历展示编辑按钮，点击触发 onEdit 且不冒泡触发 onSelect', () => {
    const handleSelect = vi.fn()
    const handleEdit = vi.fn()

    render(
      <ExperienceGroupCard
        group={baseGroup}
        workContentCount={2}
        onSelect={handleSelect}
        onEdit={handleEdit}
        onArchive={vi.fn()}
      />
    )

    const editBtn = screen.getByRole('button', { name: '编辑经历分组' })
    expect(editBtn).toBeInTheDocument()

    fireEvent.click(editBtn)
    expect(handleEdit).toHaveBeenCalledWith(baseGroup)
    expect(handleSelect).not.toHaveBeenCalled()
  })

  it('已归档经历展示已归档标记与恢复按钮，点击触发 onRestore 且不触发 onSelect', () => {
    const archivedGroup: ExperienceGroup = { ...baseGroup, archived: true }
    const handleSelect = vi.fn()
    const handleRestore = vi.fn()

    render(
      <ExperienceGroupCard
        group={archivedGroup}
        workContentCount={2}
        onSelect={handleSelect}
        onArchive={vi.fn()}
        onRestore={handleRestore}
      />
    )

    expect(screen.getByText('已归档')).toBeInTheDocument()
    const restoreBtn = screen.getByRole('button', { name: '恢复经历分组' })
    expect(restoreBtn).toBeInTheDocument()
    fireEvent.click(restoreBtn)

    expect(handleRestore).toHaveBeenCalledWith(archivedGroup)
    expect(handleSelect).not.toHaveBeenCalled()
  })

  it('已归档经历展示彻底删除按钮，点击触发 onDelete 且不触发 onSelect', () => {
    const archivedGroup: ExperienceGroup = { ...baseGroup, archived: true }
    const handleSelect = vi.fn()
    const handleDelete = vi.fn()

    render(
      <ExperienceGroupCard
        group={archivedGroup}
        workContentCount={2}
        onSelect={handleSelect}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
        onDelete={handleDelete}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: '彻底删除经历分组' })
    expect(deleteBtn).toBeInTheDocument()
    fireEvent.click(deleteBtn)

    expect(handleDelete).toHaveBeenCalledWith(archivedGroup)
    expect(handleSelect).not.toHaveBeenCalled()
  })
})

