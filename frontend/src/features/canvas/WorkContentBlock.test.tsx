import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

    // 验证旧有的平铺简历描述 Tab 已移除，替换为专业实体按钮“简历描述提炼”
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /简历描述提炼/ })).toBeInTheDocument()
  })

  it('点击底部简历描述提炼按钮触发 onOpenDrawer 回调', () => {
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

    const drawerBtn = screen.getByRole('button', { name: /简历描述提炼/ })
    fireEvent.click(drawerBtn)
    expect(handleOpenDrawer).toHaveBeenCalledTimes(1)
  })


  it('卡片头部保留 6 点抓手手柄，包含 展开专注 按钮并响应点击回调；双击标题亦进入专注模式；支持删除工作项', () => {
    const handleOpenZenMode = vi.fn()
    const handleStartEdit = vi.fn()
    const handleDelete = vi.fn()

    // 模拟 window.confirm 返回 true
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={2}
        isEditing={false}
        onStartEdit={handleStartEdit}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onDelete={handleDelete}
        onOpenZenMode={handleOpenZenMode}
      />
    )

    // 验证拖拽手柄存在
    expect(screen.getByLabelText('拖拽调整排序')).toBeInTheDocument()

    // 验证专注模式按钮存在并响应点击
    const zenBtn = screen.getByRole('button', { name: /展开专注/ })
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

    // 验证删除按钮（包含矢量垃圾桶图标且位于编辑之后），点击弹出 UI 确认弹窗
    const deleteBtn = screen.getByRole('button', { name: '删除' })
    expect(deleteBtn).toBeInTheDocument()
    expect(deleteBtn.querySelector('svg')).toBeInTheDocument()

    fireEvent.click(deleteBtn)
    const modalConfirmBtn = screen.getByRole('button', { name: '确认删除' })
    expect(modalConfirmBtn).toBeInTheDocument()
    fireEvent.click(modalConfirmBtn)
    expect(handleDelete).toHaveBeenCalledTimes(1)
  })

  it('点击卡片正文区域直接进入聚焦编辑模式；点击底部操作区不会误触发编辑', () => {
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
        onOpenDrawer={vi.fn()}
      />
    )

    const card = screen.getByRole('article', { name: /重构可视化拖拽画布核心渲染引擎/ })

    // 正文区域（卡片内唯一的点击热区）点击进入编辑
    fireEvent.click(within(card).getByText(/平均渲染耗时降低 75%/))
    expect(handleStartEdit).toHaveBeenCalledTimes(1)

    // 底部「简历描述提炼」按钮已与正文热区物理解耦：点击它不会经冒泡误触发编辑
    fireEvent.click(within(card).getByRole('button', { name: '简历描述提炼' }))
    expect(handleStartEdit).toHaveBeenCalledTimes(1)

    // 标题元素本身（h3，非其中的按钮）不承载点击进入编辑
    fireEvent.click(within(card).getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' }))
    expect(handleStartEdit).toHaveBeenCalledTimes(1)
  })

  it('在 isEditing === true 时就地渲染为单一自由 Markdown 草稿正文输入与工具栏，提供完成编辑操作', async () => {
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
      />
    )

    const titleInput = screen.getByLabelText('工作项标题')
    expect(titleInput).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    // 验证旧有的 4 个死板分割框已不复存在
    expect(screen.queryByLabelText('背景与难点')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('技术方案与材料')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('量化结果数据')).not.toBeInTheDocument()

    // 验证 Markdown 工具栏已渲染
    expect(screen.getByRole('toolbar', { name: 'Markdown 格式工具栏' })).toBeInTheDocument()

    // 验证单一草稿正文实时编辑器存在并预填了拼接后的旧数据
    const recordInput = screen.getByLabelText('草稿正文')
    expect(recordInput).toHaveTextContent('旧渲染器全量 re-render 导致大页面卡顿')

    // 修改标题与正文
    fireEvent.change(titleInput, { target: { value: '优化画布渲染管线' } })
    pasteMarkdown(recordInput, '## 全新架构设计\n- 支持海量节点虚拟滚动\n- ==trade off== 权衡并发渲染性能')

    // 验证死板的完成编辑与取消按钮已被移除（由自动保存与失焦/Esc退出接管）
    expect(screen.queryByRole('button', { name: '完成编辑' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument()

    // 点击卡片外部，触发自动保存未保存变更并收起编辑态
    fireEvent.mouseDown(document.body)

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '优化画布渲染管线',
        detailed_record: expect.stringContaining('## 全新架构设计')
      })
    )
    await waitFor(() => {
      expect(handleCancel).toHaveBeenCalledTimes(1)
    })
  })



  it('富文本排版支持各类 # 标题、多层列表嵌套、==trade off== 高亮与代码块', () => {
    const richMarkdownItem: WorkContent = {
      ...mockWorkItem,
      detailed_record: '# 架构设计核心\n## 渲染性能瓶颈\n- 一级项目目标\n  - 二级核心难点\n    - 三级压测指标\n> 架构决策说明\n\n```ts\nconst optimized = true;\n```\n\n针对内存泄漏进行 ==trade off== 权衡。',
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

    // 验证各级 # 标题正常渲染为 heading 节点
    expect(screen.getByRole('heading', { level: 1, name: '架构设计核心' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '渲染性能瓶颈' })).toBeInTheDocument()

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

    // 验证专业实体按钮“简历描述提炼”
    expect(screen.getByRole('button', { name: /简历描述提炼/ })).toBeInTheDocument()
  })

  it('当 isActive 为 true 时，卡片具有 work-content-card--active 样式类且胶囊按钮具有激活类名', () => {
    render(
      <WorkContentBlock
        item={mockWorkItem}
        index={0}
        totalCount={1}
        isEditing={false}
        isActive={true}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const card = document.getElementById(`work-content-${mockWorkItem.id}`)!
    expect(card).toHaveClass('work-content-card--active')

    const drawerBtn = screen.getByRole('button', { name: /简历描述提炼/ })
    expect(drawerBtn).toHaveClass('resume-desc-trigger-btn--active')
  })

  it('保存成功、父级以新对象回写 item 后，卡片内联徽章仍停在「已自动保存」而不被重置（issue 13 回归）', async () => {
    let resolveSave: () => void = () => {}
    const handleSave = vi.fn(
      () => new Promise<void>((resolve) => { resolveSave = resolve })
    )

    const baseProps = {
      item: mockWorkItem,
      index: 0,
      isEditing: true,
      onStartEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onSave: handleSave
    }

    const { rerender } = render(<WorkContentBlock {...baseProps} />)

    // 输入停顿 800ms 后触发自动保存
    fireEvent.change(screen.getByLabelText('工作项标题'), {
      target: { value: '优化画布渲染管线' }
    })

    // 请求在途期间：「保存中...」可见
    await waitFor(() => expect(screen.getByText('保存中...')).toBeInTheDocument(), {
      timeout: 3000
    })

    // 在途期间继续敲字（此内容并不在本次请求里）
    fireEvent.change(screen.getByLabelText('工作项标题'), {
      target: { value: '优化画布渲染管线（在途追加）' }
    })

    resolveSave()
    await waitFor(() => expect(screen.getByText('已自动保存')).toBeInTheDocument())

    // 父级保存成功的回写：同一 id 的新 item 对象，内容为「本次请求发出去的那份」，
    // 而不是用户随后敲进去的那份——草稿必须以本地为准，不被回写覆盖。
    rerender(<WorkContentBlock {...baseProps} item={{ ...mockWorkItem, title: '优化画布渲染管线' }} />)

    expect(screen.getByText('已自动保存')).toBeInTheDocument()
    expect(screen.getByLabelText('工作项标题')).toHaveValue('优化画布渲染管线（在途追加）')
  })

  it('外部路径改内容后进入编辑态，草稿呈现外部最新值而非挂载时的旧值（issue 13 防回归）', () => {
    const baseProps = {
      item: mockWorkItem,
      index: 0,
      onStartEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onSave: vi.fn()
    }

    const { rerender } = render(<WorkContentBlock {...baseProps} isEditing={false} />)

    // 外部路径（如抽屉版本更新）带回新的 item 对象
    const externalItem: WorkContent = {
      ...mockWorkItem,
      title: '外部路径改名',
      detailed_record: '外部路径改正文'
    }
    rerender(<WorkContentBlock {...baseProps} item={externalItem} isEditing={false} />)

    // 进入编辑态：草稿来自外部最新内容，而不是挂载时的旧内容
    rerender(<WorkContentBlock {...baseProps} item={externalItem} isEditing={true} />)

    expect(screen.getByLabelText('工作项标题')).toHaveValue('外部路径改名')
    expect(screen.getByLabelText('草稿正文')).toHaveTextContent('外部路径改正文')
  })

  it('编辑态下换绑到另一张卡片（item.id 变化）时仍会重建草稿，不吃上一张卡片的草稿（issue 13 防回归）', () => {
    const baseProps = {
      item: mockWorkItem,
      index: 0,
      isEditing: true,
      onStartEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onSave: vi.fn()
    }

    const { rerender } = render(<WorkContentBlock {...baseProps} />)
    expect(screen.getByLabelText('工作项标题')).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    // 同一编辑态下换成另一张卡片（不依赖父级是否给了 key）
    const otherCard: WorkContent = {
      ...mockWorkItem,
      id: 43,
      title: '另一张卡片的标题',
      detailed_record: '另一张卡片的正文'
    }
    rerender(<WorkContentBlock {...baseProps} item={otherCard} />)

    expect(screen.getByLabelText('工作项标题')).toHaveValue('另一张卡片的标题')
    expect(screen.getByLabelText('草稿正文')).toHaveTextContent('另一张卡片的正文')
  })
})


