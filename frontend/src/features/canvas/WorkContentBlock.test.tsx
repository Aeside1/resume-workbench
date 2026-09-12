import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkContentBlock } from './WorkContentBlock'
import type { WorkContent } from '../../api'

afterEach(cleanup)

describe('WorkContentBlock 单项工作卡片（阅读态与就地编辑态）', () => {
  const mockWorkItem: WorkContent = {
    id: 42,
    experience_group_id: 1,
    title: '重构可视化拖拽画布核心渲染引擎',
    detailed_record: '旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。',
    technical_materials: '采用 React 18 并发机制与自定义虚拟滚动容器。',
    result_data: '平均渲染耗时降低 75%，内存占用减少 40%，FPS 稳定在 58+。',
    supplementary_notes: JSON.stringify({
      note: '产出专利 1 篇并在中台技术沙龙进行架构分享。',
      descriptions: [
        { id: 'desc-1', tag: '技术深度版', bullets: ['深入剖析虚拟滚动与渲染性能'] }
      ]
    }),
    position: 0,
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  it('默认以规整 Typography 阅读态排版展示背景难点、技术方案与结果数据，并挂接简历描述 Tab', () => {
    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={3}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onMove={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).toBeInTheDocument()
    expect(screen.getByText('旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。')).toBeInTheDocument()
    expect(screen.getByText('采用 React 18 并发机制与自定义虚拟滚动容器。')).toBeInTheDocument()
    expect(screen.getByText('平均渲染耗时降低 75%，内存占用减少 40%，FPS 稳定在 58+。')).toBeInTheDocument()
    expect(screen.getByText('产出专利 1 篇并在中台技术沙龙进行架构分享。')).toBeInTheDocument()

    // 验证底部挂接的简历描述 Tab
    expect(screen.getByRole('tab', { name: '技术深度版' })).toBeInTheDocument()
  })

  it('首项禁用上移，末项禁用下移，点击上移下移与归档触发对应回调', () => {
    const handleMove = vi.fn()
    const handleArchive = vi.fn()

    // index = 0, totalCount = 2 -> 上移禁用，下移启用
    const { rerender } = render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={2}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onMove={handleMove}
        onArchive={handleArchive}
      />
    )

    const moveUpBtn = screen.getByRole('button', { name: '上移' })
    const moveDownBtn = screen.getByRole('button', { name: '下移' })
    const archiveBtn = screen.getByRole('button', { name: '归档' })

    expect(moveUpBtn).toBeDisabled()
    expect(moveDownBtn).not.toBeDisabled()

    fireEvent.click(moveDownBtn)
    expect(handleMove).toHaveBeenCalledWith(1)

    fireEvent.click(archiveBtn)
    expect(handleArchive).toHaveBeenCalledTimes(1)

    // 当为末项时 (index = 1, totalCount = 2)
    rerender(
      <WorkContentBlock
        item={mockWorkItem}
        index={1}
        totalCount={2}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onMove={handleMove}
        onArchive={handleArchive}
      />
    )

    expect(screen.getByRole('button', { name: '上移' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '下移' })).toBeDisabled()
  })

  it('已归档项显示已归档徽章与恢复按钮', () => {
    const archivedItem = { ...mockWorkItem, archived: true }
    render(
      <WorkContentBlock
        item={archivedItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onMove={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    expect(screen.getByText('已归档')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()
  })

  it('点击编辑按钮触发 onStartEdit 回调', () => {
    const handleStartEdit = vi.fn()
    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onStartEdit={handleStartEdit}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onMove={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    const editBtn = screen.getByRole('button', { name: '编辑' })
    fireEvent.click(editBtn)
    expect(handleStartEdit).toHaveBeenCalledTimes(1)
  })

  it('在 isEditing === true 时就地渲染为表单输入控件，提供保存与取消操作', () => {
    const handleSave = vi.fn()
    const handleCancel = vi.fn()

    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={1}
        isEditing={true}
        onStartEdit={vi.fn()}
        onCancelEdit={handleCancel}
        onSave={handleSave}
        onMove={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    const titleInput = screen.getByLabelText('工作项标题')
    expect(titleInput).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    const recordInput = screen.getByLabelText('背景与难点')
    expect(recordInput).toHaveValue('旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。')

    fireEvent.change(titleInput, { target: { value: '优化画布渲染管线' } })

    const saveBtn = screen.getByRole('button', { name: '保存' })
    fireEvent.click(saveBtn)

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '优化画布渲染管线',
        detailed_record: '旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。'
      })
    )

    const cancelBtn = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelBtn)
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('当没有简历描述时展示空提示，新增描述后触发 onSave 将 JSON 序列化数据持久化', () => {
    const handleSave = vi.fn()
    const emptyItem = { ...mockWorkItem, supplementary_notes: null }

    render(
      <WorkContentBlock
        item={emptyItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={handleSave}
        onMove={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    expect(screen.getByText('暂无针对不同岗位的简历描述写法')).toBeInTheDocument()

    // 点击“+ 立即新增版本写法”
    fireEvent.click(screen.getByRole('button', { name: '+ 立即新增版本写法' }))
    const tagInput = screen.getByLabelText('版本标签')
    fireEvent.change(tagInput, { target: { value: '业务导向版' } })
    const bulletsInput = screen.getByPlaceholderText('输入该版本的 bullet points，每行一条...')
    fireEvent.change(bulletsInput, { target: { value: '业务指标翻倍提升\n支持千万级调用' } })

    fireEvent.click(screen.getByRole('button', { name: '保存新写法' }))

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: emptyItem.title,
        supplementary_notes: expect.stringContaining('业务导向版')
      })
    )
  })
})
