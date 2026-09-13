import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkContentBlock, getCombinedDetailedRecord } from './WorkContentBlock'
import type { WorkContent } from '../../api'
import { pasteMarkdown } from '../../test/pasteMarkdown'

describe('WorkContentBlock 单项工作卡片（自由 Markdown 草稿本、专注模式与抽屉胶囊）', () => {
  afterEach(cleanup)

  const mockWorkItem: WorkContent = {
    id: 42,
    experience_group_id: 1,
    title: '重构可视化拖拽画布核心渲染引擎',
    detailed_record: '旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。',
    technical_materials: '采用 React 18 并发机制与虚拟滚动容器。',
    result_data: '平均渲染耗时降低 75%，内存占用减少 40%，FPS 稳定在 58+。',
    supplementary_notes: JSON.stringify({
      note: '产出专利 1 篇并在中台技术沙龙进行架构分享。',
      versions: [
        { id: 'desc-1', label: '技术深度版', content: '深入剖析虚拟滚动与渲染性能' }
      ]
    }),
    position: 0,
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  it('getCombinedDetailedRecord 工具函数正确拼接旧数据的背景、技术材料、结果数据与历史补充说明', () => {
    const combined = getCombinedDetailedRecord(mockWorkItem, '产出专利 1 篇并在中台技术沙龙进行架构分享。')
    expect(combined).toContain('旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。')
    expect(combined).toContain('### 技术方案与材料\n\n采用 React 18 并发机制与虚拟滚动容器。')
    expect(combined).toContain('### 量化结果数据\n\n平均渲染耗时降低 75%，内存占用减少 40%，FPS 稳定在 58+。')
    expect(combined).toContain('### 补充说明\n\n产出专利 1 篇并在中台技术沙龙进行架构分享。')

    // 纯新单 Markdown 数据时不添加多余的三级标题
    expect(getCombinedDetailedRecord({ detailed_record: '纯自由 Markdown 正文' })).toBe('纯自由 Markdown 正文')
    expect(getCombinedDetailedRecord({})).toBe('')
  })

  it('默认以规整 Typography 阅读态排版展示单一 Markdown 正文，底部渲染极简简历描述胶囊按钮', () => {
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
        onOpenDrawer={vi.fn()}
        onOpenZenMode={vi.fn()}
      />
    )

    // 验证标题与渲染的自由 Markdown 笔记内容（包含拼接的背景、材料、结果与补充说明）
    expect(screen.getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).toBeInTheDocument()
    expect(screen.getByText(/旧渲染器全量 re-render 导致大页面卡顿/)).toBeInTheDocument()
    expect(screen.getByText(/采用 React 18 并发机制/)).toBeInTheDocument()
    expect(screen.getByText(/平均渲染耗时降低 75%/)).toBeInTheDocument()
    expect(screen.getByText(/产出专利 1 篇并在中台技术沙龙进行架构分享/)).toBeInTheDocument()

    // 验证旧有的 4 个死板表单分割标题在阅读态已不作为独立 section 标签存在
    expect(screen.queryByRole('heading', { level: 4, name: '背景与难点' })).not.toBeInTheDocument()

    // 验证旧有的平铺简历描述 Tab 已移除，替换为极简胶囊按钮
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /📝 简历描述 \(1 个版本\) →/ })).toBeInTheDocument()
  })

  it('点击底部胶囊按钮触发 onOpenDrawer 回调', () => {
    const handleOpenDrawer = vi.fn()

    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onArchive={vi.fn()}
        onOpenDrawer={handleOpenDrawer}
      />
    )

    const capsuleBtn = screen.getByRole('button', { name: /📝 简历描述 \(1 个版本\) →/ })
    fireEvent.click(capsuleBtn)
    expect(handleOpenDrawer).toHaveBeenCalledTimes(1)
  })

  it('卡片头部保留 6 点抓手手柄，新增 ⛶ 展开专注 按钮并响应点击回调；双击标题亦进入专注模式', () => {
    const handleOpenZenMode = vi.fn()
    const handleStartEdit = vi.fn()
    const handleArchive = vi.fn()

    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={2}
        isEditing={false}
        onStartEdit={handleStartEdit}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onArchive={handleArchive}
        onOpenZenMode={handleOpenZenMode}
      />
    )

    // 验证拖拽手柄存在
    expect(screen.getByLabelText('拖拽调整排序')).toBeInTheDocument()

    // 验证专注模式按钮存在并响应点击
    const zenBtn = screen.getByRole('button', { name: '⛶ 展开专注' })
    expect(zenBtn).toBeInTheDocument()
    fireEvent.click(zenBtn)
    expect(handleOpenZenMode).toHaveBeenCalledTimes(1)

    // 验证双击标题亦触发专注模式
    const titleBtn = screen.getByRole('button', { name: '重构可视化拖拽画布核心渲染引擎' })
    fireEvent.doubleClick(titleBtn)
    expect(handleOpenZenMode).toHaveBeenCalledTimes(2)

    // 验证单击标题触发编辑
    fireEvent.click(titleBtn)
    expect(handleStartEdit).toHaveBeenCalledTimes(1)

    // 验证归档按钮
    const archiveBtn = screen.getByRole('button', { name: '归档' })
    fireEvent.click(archiveBtn)
    expect(handleArchive).toHaveBeenCalledTimes(1)
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

  it('在 isEditing === true 时就地渲染为单一自由 Markdown 草稿正文输入，提供保存与取消操作', () => {
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

    // 验证旧有的 4 个死板分割框已不复存在
    expect(screen.queryByLabelText('背景与难点')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('技术方案与材料')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('量化结果数据')).not.toBeInTheDocument()

    // 验证单一草稿正文实时编辑器存在并预填了拼接后的旧数据
    const recordInput = screen.getByLabelText('草稿正文')
    expect(recordInput).toHaveTextContent('旧渲染器全量 re-render 导致大页面卡顿')

    // 修改标题与正文
    fireEvent.change(titleInput, { target: { value: '优化画布渲染管线' } })
    pasteMarkdown(recordInput, '## 全新架构设计\n- 支持海量节点虚拟滚动\n- ==trade off== 权衡并发渲染性能')

    const saveBtn = screen.getByRole('button', { name: '保存' })
    fireEvent.click(saveBtn)

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '优化画布渲染管线',
        detailed_record: expect.stringContaining('## 全新架构设计')
      })
    )

    const cancelBtn = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelBtn)
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('富文本排版支持多层列表嵌套、==trade off== 高亮与代码块', () => {
    const richMarkdownItem: WorkContent = {
      ...mockWorkItem,
      detailed_record: '- 一级项目目标\n  - 二级核心难点\n    - 三级压测指标\n> 架构决策说明\n\n```ts\nconst optimized = true;\n```\n\n针对内存泄漏进行 ==trade off== 权衡。',
      technical_materials: null,
      result_data: null,
      supplementary_notes: JSON.stringify({ note: '', versions: [] })
    }

    render(
      <WorkContentBlock
        item={richMarkdownItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onArchive={vi.fn()}
      />
    )

    // 验证列表
    expect(screen.getByText('一级项目目标')).toBeInTheDocument()
    expect(screen.getByText('二级核心难点')).toBeInTheDocument()
    expect(screen.getByText('三级压测指标')).toBeInTheDocument()

    // 验证引用块与代码
    expect(screen.getByText('架构决策说明')).toBeInTheDocument()
    expect(screen.getByText('const optimized = true;')).toBeInTheDocument()

    // 验证高亮 ==trade off== 产生 mark 标签
    const highlightEl = screen.getByText('trade off')
    expect(highlightEl.tagName.toLowerCase()).toBe('mark')

    // 验证 0 个版本时的胶囊按钮
    expect(screen.getByRole('button', { name: /📝 简历描述 \(0 个版本\) →/ })).toBeInTheDocument()
  })
})

