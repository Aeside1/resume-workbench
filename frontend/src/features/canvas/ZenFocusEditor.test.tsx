import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZenFocusEditor } from './ZenFocusEditor'
import type { ExperienceGroup, WorkContent } from '../../api'
import { pasteMarkdown } from '../../test/pasteMarkdown'
import { clearMilkdownEditorCache } from '../../components/ui/MilkdownView'

describe('ZenFocusEditor 全屏专注写作工作台组件测试', () => {
  afterEach(cleanup)

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

  const mockWorkContent: WorkContent = {
    id: 101,
    experience_group_id: 10,
    title: '重构可视化拖拽画布核心渲染引擎',
    detailed_record: '旧渲染器全量 re-render 导致大页面卡顿，帧率掉至 20fps。',
    technical_materials: '',
    result_data: '',
    supplementary_notes: JSON.stringify({
      note: '',
      versions: [
        {
          id: 'desc_101_1',
          label: '技术深度版',
          content: '主导画布渲染引擎重构，渲染耗时降低 75%。'
        },
        {
          id: 'desc_101_2',
          label: '业务成效版',
          content: '保障数十个业务线可视化大屏平稳上线，提升搭建效率 3 倍。'
        }
      ]
    }),
    position: 0,
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    clearMilkdownEditorCache()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('isOpen 为 true 时正常渲染全屏视窗、极简 Topbar、左右双栏对照工作区', () => {
    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    // 1. 验证全屏 Overlay 与 Topbar
    expect(screen.getByRole('dialog', { name: /全屏专注工作台: 重构可视化拖拽画布核心渲染引擎/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出全屏' })).toBeInTheDocument()
    expect(screen.getByText('Esc')).toBeInTheDocument()

    // 2. 验证面包屑
    expect(screen.getByText('美团 · 基础架构部前端开发')).toBeInTheDocument()
    expect(screen.getByText('重构可视化拖拽画布核心渲染引擎')).toBeInTheDocument()

    // 3. 验证 Topbar 操作项
    expect(screen.getByRole('button', { name: '复制整篇 Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起伴随栏' })).toBeInTheDocument()

    // 4. 验证左侧主写作区大标题输入与正文
    const titleInput = screen.getByLabelText('工作项大标题')
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    const editorBox = screen.getByLabelText('草稿正文')
    expect(editorBox).toBeInTheDocument()
    expect(editorBox).toHaveTextContent('旧渲染器全量 re-render 导致大页面卡顿')

    // 5. 验证右侧伴随提炼栏与版本卡片流
    const companionSidebar = screen.getByLabelText('伴随提炼栏')
    expect(companionSidebar).toBeInTheDocument()
    expect(within(companionSidebar).getByRole('heading', { level: 3, name: '简历描述提炼' })).toBeInTheDocument()
    expect(within(companionSidebar).getByText('技术深度版')).toBeInTheDocument()
    expect(within(companionSidebar).getByText('业务成效版')).toBeInTheDocument()
  })

  it('修改工作项大标题并在 800ms 防抖后自动保存', async () => {
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        onUpdateVersions={vi.fn()}
      />
    )

    const titleInput = screen.getByLabelText('工作项大标题')
    fireEvent.change(titleInput, { target: { value: '重构可视化拖拽画布核心渲染引擎（重大突破）' } })

    // 等待 800ms 防抖保存触发
    await waitFor(() => {
      expect(handleSaveContent).toHaveBeenCalledTimes(1)
      expect(handleSaveContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '重构可视化拖拽画布核心渲染引擎（重大突破）',
          detailed_record: mockWorkContent.detailed_record
        }),
        101
      )
    }, { timeout: 2000 })

    // 验证保存成功后 Topbar 保存状态呈现
    expect(await screen.findByText('已自动保存')).toBeInTheDocument()
  })

  it('修改自由 Markdown 正文并在 800ms 防抖后自动保存', async () => {
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        onUpdateVersions={vi.fn()}
      />
    )

    const editor = screen.getByLabelText('草稿正文')
    pasteMarkdown(editor, '新增的架构演进思考与性能分析')

    await waitFor(() => {
      expect(handleSaveContent).toHaveBeenCalledTimes(1)
      expect(handleSaveContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '重构可视化拖拽画布核心渲染引擎',
          detailed_record: expect.stringContaining('新增的架构演进思考与性能分析')
        }),
        101
      )
    }, { timeout: 2000 })
  })

  it('点击“复制整篇 Markdown”快捷按钮，将大标题与自由底稿格式化复制到剪贴板', async () => {
    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    const copyBtn = screen.getByRole('button', { name: '复制整篇 Markdown' })
    fireEvent.click(copyBtn)

    const expectedCopiedText = `# 重构可视化拖拽画布核心渲染引擎\n\n${mockWorkContent.detailed_record}`
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedCopiedText)

    // 验证复制视觉状态切换为“已复制”
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('支持在右侧伴随提炼栏临时收起与重新展开（单栏/双栏切换）', () => {
    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    // 默认双栏状态
    expect(screen.getByLabelText('伴随提炼栏')).toBeInTheDocument()

    // 1. 点击伴随栏右上角收起按钮
    const companionCloseBtn = screen.getByRole('button', { name: '关闭伴随提炼栏' })
    fireEvent.click(companionCloseBtn)

    // 验证伴随栏已收起，Topbar 按钮文案变为“展开伴随栏”
    expect(screen.queryByLabelText('伴随提炼栏')).not.toBeInTheDocument()
    const toggleBtn = screen.getByRole('button', { name: '展开伴随栏' })
    expect(toggleBtn).toBeInTheDocument()

    // 2. 点击 Topbar 上的“展开伴随栏”按钮
    fireEvent.click(toggleBtn)
    expect(screen.getByLabelText('伴随提炼栏')).toBeInTheDocument()
  })

  it('按下物理 Escape 键平滑退出专注模式，若有未决修改立即刷新保存', async () => {
    const handleClose = vi.fn()
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={handleSaveContent}
        onUpdateVersions={vi.fn()}
      />
    )

    const titleInput = screen.getByLabelText('工作项大标题')
    fireEvent.change(titleInput, { target: { value: '即将退出的修改' } })

    // 未等待 800ms 防抖，直接按下 Escape 键
    fireEvent.keyDown(window, { key: 'Escape' })

    // 验证立即刷新保存并调用 onClose
    expect(handleSaveContent).toHaveBeenCalledTimes(1)
    expect(handleSaveContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '即将退出的修改'
      }),
      101
    )
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('点击 Topbar“退出全屏”按钮亦退出专注模式并刷新保存', async () => {
    const handleClose = vi.fn()
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={handleSaveContent}
        onUpdateVersions={vi.fn()}
      />
    )

    const exitBtn = screen.getByRole('button', { name: '退出全屏' })
    fireEvent.click(exitBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('isOpen 为 false 时不渲染任何内容', () => {
    const { container } = render(
      <ZenFocusEditor
        isOpen={false}
        group={mockGroup}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
