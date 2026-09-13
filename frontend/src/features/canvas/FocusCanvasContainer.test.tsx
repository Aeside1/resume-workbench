import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FocusCanvasContainer } from './FocusCanvasContainer'
import { api, type ExperienceGroup, type WorkContent } from '../../api'
import type { Session } from '../../session'

afterEach(cleanup)

describe('FocusCanvasContainer 沉浸长画布与双区大纲联动集成测试', () => {
  const mockSession: Session = {
    token: 'test-token',
    user: { id: 1, email: 'candidate@example.com' }
  }

  const mockGroup: ExperienceGroup = {
    id: 10,
    name: '基础架构部前端开发',
    type: 'internship',
    organization: '美团',
    start_date: '2024-03-01',
    end_date: '2024-08-31',
    description: '负责低代码引擎与组件库调优',
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  const mockContents: WorkContent[] = [
    {
      id: 101,
      experience_group_id: 10,
      title: '重构可视化拖拽画布核心渲染引擎',
      detailed_record: '解决全量 re-render 导致的卡顿痛点。',
      technical_materials: 'React 18 并发机制与虚拟滚动。',
      result_data: '渲染耗时降低 75%，FPS 提升至 58+。',
      supplementary_notes: JSON.stringify({
        note: '',
        versions: [
          {
            id: 'desc_101_1',
            label: '技术深度版',
            content: '主导画布渲染引擎重构，降低耗时 75%。'
          }
        ]
      }),
      position: 0,
      archived: false,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    },
    {
      id: 102,
      experience_group_id: 10,
      title: '设计组件库 Tree-shaking 自动化检测管线',
      detailed_record: '分析无用代码打包引入的问题。',
      technical_materials: '基于 Rollup AST 静态分析插件。',
      result_data: '产物总体积缩减 32%。',
      supplementary_notes: JSON.stringify({
        note: '',
        versions: [
          {
            id: 'desc_102_1',
            label: '工程效率版',
            content: '搭建 Tree-shaking 自动化门禁，包体积削减 32%。'
          },
          {
            id: 'desc_102_2',
            label: '架构通用版',
            content: '输出跨端打包检测方案，并在全组落地应用。'
          }
        ]
      }),
      position: 1,
      archived: false,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
    vi.spyOn(api, 'workContents').mockResolvedValue(mockContents)
    vi.spyOn(api, 'updateWorkContent').mockImplementation(async (_token, id, payload) => {
      const found = mockContents.find((item) => item.id === id)!
      return { ...found, ...payload, id, updated_at: new Date().toISOString() } as WorkContent
    })
    vi.spyOn(api, 'createWorkContent').mockImplementation(async (_token, groupId, payload) => {
      return {
        ...payload,
        id: 103,
        experience_group_id: groupId,
        position: 2,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as WorkContent
    })
  })

  it('渲染主长画布与右侧伴随大纲双区布局，展示经历概况与各工作项', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    // 验证经历概况
    expect(await screen.findByRole('heading', { level: 2, name: '基础架构部前端开发' })).toBeInTheDocument()
    expect(screen.getByText(/美团/)).toBeInTheDocument()

    // 验证主画布工作项
    expect(screen.getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '设计组件库 Tree-shaking 自动化检测管线' })).toBeInTheDocument()

    // 验证右侧大纲
    expect(screen.getByText('经历大纲')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '经历概况' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\. 重构可视化拖拽画布核心渲染引擎/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2\. 设计组件库 Tree-shaking 自动化检测管线/ })).toBeInTheDocument()
  })

  it('点击单项工作卡片右上角“编辑”按钮就地进入表单编辑态，修改后保存折叠回排版并触发已保存状态提示', async () => {
    const handleSaveStatusChange = vi.fn()

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
        onSaveStatusChange={handleSaveStatusChange}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    // 初始状态下全部为只读视图
    expect(screen.queryByLabelText('工作项标题')).not.toBeInTheDocument()

    // 点击第一个工作项的编辑按钮
    const editBtns = screen.getAllByRole('button', { name: '编辑' })
    fireEvent.click(editBtns[0])

    // 就地转化为表单
    const titleInput = screen.getByLabelText('工作项标题')
    expect(titleInput).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    // 修改标题并完成编辑
    fireEvent.change(titleInput, { target: { value: '重构渲染引擎（已优化）' } })
    const finishBtn = screen.getByRole('button', { name: '完成编辑' })
    fireEvent.click(finishBtn)

    // 验证保存 API 被调用，保存状态变化
    await waitFor(() => {
      expect(api.updateWorkContent).toHaveBeenCalledTimes(1)
      expect(handleSaveStatusChange).toHaveBeenCalledWith('saving')
      expect(handleSaveStatusChange).toHaveBeenCalledWith('saved')
    })

    // 表单折叠回整洁阅读排版，展示更新后的标题
    expect(await screen.findByRole('heading', { level: 3, name: '重构渲染引擎（已优化）' })).toBeInTheDocument()
    expect(screen.queryByLabelText('工作项标题')).not.toBeInTheDocument()
  })

  it('输入内容触发自动保存后，卡片保持沉浸编辑状态而不被强制关闭', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })
    const editBtns = screen.getAllByRole('button', { name: '编辑' })
    fireEvent.click(editBtns[0])

    const titleInput = screen.getByLabelText('工作项标题')
    fireEvent.change(titleInput, { target: { value: '重构渲染引擎（自动保存测试）' } })

    // 等待 800ms 防抖保存触发并完成
    await waitFor(() => {
      expect(api.updateWorkContent).toHaveBeenCalled()
    }, { timeout: 2000 })

    // 关键断言：保存完成后，标题输入框仍然存在（保持编辑态），不被强制踢回阅读态
    expect(screen.getByLabelText('工作项标题')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '完成编辑' })).toBeInTheDocument()
  })

  it('点击单项工作卡片右上角“删除”按钮，确认后调用 API 并在画布和大纲中同步移除', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api, 'deleteWorkContent').mockResolvedValue(undefined as any)

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    const deleteBtns = screen.getAllByRole('button', { name: '删除' })
    fireEvent.click(deleteBtns[0])

    const modalConfirmBtn = await screen.findByRole('button', { name: '确认删除' })
    fireEvent.click(modalConfirmBtn)

    await waitFor(() => {
      expect(api.deleteWorkContent).toHaveBeenCalledWith(mockSession.token, 101)
    })

    // 验证被删除项在主画布中消失
    expect(screen.queryByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).not.toBeInTheDocument()
  })


  it('点击画布底部常驻虚线大按钮追加新的具体工作内容', async () => {
    const handleSaveStatusChange = vi.fn()

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
        onSaveStatusChange={handleSaveStatusChange}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    const addDashedBtn = screen.getByRole('button', { name: /添加具体工作内容/ })
    fireEvent.click(addDashedBtn)

    // 在末尾展开新建工作内容编辑块
    const titleInput = screen.getByLabelText('工作项标题')
    expect(titleInput).toBeInTheDocument()

    fireEvent.change(titleInput, { target: { value: '新增的落地实验工作项' } })
    const submitBtn = screen.getByRole('button', { name: '添加工作内容' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.createWorkContent).toHaveBeenCalledTimes(1)
      expect(handleSaveStatusChange).toHaveBeenCalledWith('saved')
    })

    // 验证新卡片已追加至列表
    expect(await screen.findByRole('heading', { level: 3, name: '新增的落地实验工作项' })).toBeInTheDocument()
  })

  it('点击大纲条目能够平滑定位直达目标卡片', async () => {
    const scrollIntoViewMock = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    const outlineItemBtn = screen.getByRole('button', {
      name: /2\. 设计组件库 Tree-shaking 自动化检测管线/
    })
    fireEvent.click(outlineItemBtn)

    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', block: 'start' })
    )
  })

  it('处于编辑态或新建态时触发 onDirtyChange(true)，取消后触发 onDirtyChange(false)', async () => {
    const handleDirtyChange = vi.fn()

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
        onDirtyChange={handleDirtyChange}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })
    expect(handleDirtyChange).toHaveBeenCalledWith(false)

    // 点击编辑，进入 dirty 态
    const editBtn = screen.getAllByRole('button', { name: '编辑' })[0]
    fireEvent.click(editBtn)
    expect(handleDirtyChange).toHaveBeenCalledWith(true)

    // 点击取消，恢复 clean 态
    const cancelBtn = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelBtn)
    expect(handleDirtyChange).toHaveBeenCalledWith(false)
  })

  it('点击经历概况卡片右上角编辑按钮就地编辑并保存，调用 updateExperienceGroup 并触发 onUpdateGroup 和保存状态提示', async () => {
    const updatedGroup: ExperienceGroup = {
      ...mockGroup,
      name: '基础架构部高级前端技术专家',
      organization: '美团核心本地商业'
    }
    const updateSpy = vi.spyOn(api, 'updateExperienceGroup').mockResolvedValue(updatedGroup)
    const handleSaveStatus = vi.fn()
    const handleUpdateGroup = vi.fn()

    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
        onSaveStatusChange={handleSaveStatus}
        onUpdateGroup={handleUpdateGroup}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    const editOverviewBtn = screen.getByRole('button', { name: '编辑经历概况' })
    fireEvent.click(editOverviewBtn)

    expect(screen.getByText('编辑经历概况')).toBeInTheDocument()
    const nameInput = screen.getByLabelText('经历名称')
    fireEvent.change(nameInput, { target: { value: '基础架构部高级前端技术专家' } })

    const saveBtn = screen.getByRole('button', { name: '保存概况' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockSession.token,
        10,
        expect.objectContaining({ name: '基础架构部高级前端技术专家' })
      )
      expect(handleUpdateGroup).toHaveBeenCalledWith(updatedGroup)
      expect(handleSaveStatus).toHaveBeenCalledWith('saved')
    })
  })

  it('点击工作项底部简历描述胶囊按钮，卡片呈现激活微边框并滑出抽屉，展示对应版本卡片', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    expect(document.getElementById('work-content-101')).not.toHaveClass('work-content-card--active')
    expect(screen.queryByRole('complementary', { name: '简历描述提炼抽屉' })).not.toBeInTheDocument()

    // 点击第一个工作项的“简历描述提炼 (1 个版本)”胶囊按钮
    const drawerBtn101 = screen.getByRole('button', { name: /简历描述提炼 \(1 个版本\)/ })
    fireEvent.click(drawerBtn101)

    // 验证抽屉滑出并关联该工作项
    const drawer = await screen.findByRole('complementary', { name: '简历描述提炼抽屉' })
    expect(within(drawer).getByText('重构可视化拖拽画布核心渲染引擎')).toBeInTheDocument()
    expect(within(drawer).getByDisplayValue('技术深度版')).toBeInTheDocument()

    // 验证当前卡片具有浅蓝边框激活态，另一张卡片没有
    expect(document.getElementById('work-content-101')).toHaveClass('work-content-card--active')
    expect(document.getElementById('work-content-102')).not.toHaveClass('work-content-card--active')
  })

  it('在抽屉打开时点击另一工作项胶囊按钮，抽屉平滑换绑新内容且激活态转移至新卡片', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    // 打开第一个工作项的抽屉
    const drawerBtn101 = screen.getByRole('button', { name: /简历描述提炼 \(1 个版本\)/ })
    fireEvent.click(drawerBtn101)

    const drawer = await screen.findByRole('complementary', { name: '简历描述提炼抽屉' })
    expect(within(drawer).getByDisplayValue('技术深度版')).toBeInTheDocument()
    expect(document.getElementById('work-content-101')).toHaveClass('work-content-card--active')

    // 直接点击第二个工作项的胶囊按钮
    const drawerBtn102 = screen.getByRole('button', { name: /简历描述提炼 \(2 个版本\)/ })
    fireEvent.click(drawerBtn102)

    // 验证抽屉内容平滑换绑为第二个工作项的版本卡片
    await waitFor(() => {
      expect(within(drawer).getByText('设计组件库 Tree-shaking 自动化检测管线')).toBeInTheDocument()
      expect(within(drawer).getByDisplayValue('工程效率版')).toBeInTheDocument()
      expect(within(drawer).getByDisplayValue('架构通用版')).toBeInTheDocument()
    })

    // 激活状态转移：card101 失活，card102 激活
    expect(document.getElementById('work-content-101')).not.toHaveClass('work-content-card--active')
    expect(document.getElementById('work-content-102')).toHaveClass('work-content-card--active')
  })

  it('在抽屉中新建版本并保存，调用 updateWorkContent 并更新卡片底部版本计数', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    // 打开第二个工作项的抽屉（初始 2 个版本）
    const drawerBtn102 = screen.getByRole('button', { name: /简历描述提炼 \(2 个版本\)/ })
    fireEvent.click(drawerBtn102)

    await screen.findByDisplayValue('工程效率版')

    // 点击新建版本
    const addVersionBtn = screen.getByRole('button', { name: '新建简历描述版本' })
    fireEvent.click(addVersionBtn)

    // 验证 updateWorkContent 被调用且包含 3 个版本
    await waitFor(() => {
      expect(api.updateWorkContent).toHaveBeenCalledWith(
        mockSession.token,
        102,
        expect.objectContaining({
          supplementary_notes: expect.stringContaining('版本 3')
        })
      )
    })

    // 验证卡片底部的胶囊按钮已更新为 3 个版本
    expect(await screen.findByRole('button', { name: /简历描述提炼 \(3 个版本\)/ })).toBeInTheDocument()
  })

  it('在抽屉中点击复制按钮一键拷贝版本全文到剪贴板，并触发视觉反馈', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    // 打开第一个工作项的抽屉
    const drawerBtn101 = screen.getByRole('button', { name: /简历描述提炼 \(1 个版本\)/ })
    fireEvent.click(drawerBtn101)

    const drawer = await screen.findByRole('complementary', { name: '简历描述提炼抽屉' })
    const copyBtn = within(drawer).getByRole('button', { name: '复制 技术深度版' })
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '主导画布渲染引擎重构，降低耗时 75%。'
    )
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('点击抽屉关闭按钮或按 Escape 键关闭抽屉，卡片激活高亮移除', async () => {
    render(
      <FocusCanvasContainer
        session={mockSession}
        group={mockGroup}
        onExitFocus={vi.fn()}
      />
    )

    await screen.findByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })

    // 打开抽屉
    const drawerBtn101 = screen.getByRole('button', { name: /简历描述提炼 \(1 个版本\)/ })
    fireEvent.click(drawerBtn101)
    expect(await screen.findByRole('complementary', { name: '简历描述提炼抽屉' })).toBeInTheDocument()
    expect(document.getElementById('work-content-101')).toHaveClass('work-content-card--active')

    // 点击右上角关闭按钮
    const closeBtn = screen.getByRole('button', { name: '关闭抽屉' })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: '简历描述提炼抽屉' })).not.toBeInTheDocument()
    })
    expect(document.getElementById('work-content-101')).not.toHaveClass('work-content-card--active')
  })
})
