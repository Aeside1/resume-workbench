import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZenFocusEditor } from './ZenFocusEditor'
import type { ContentDraft } from './WorkContentBlock'
import { api, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { pasteMarkdown } from '../../test/pasteMarkdown'
import { clearMilkdownEditorCache } from '../../components/ui/MilkdownView'

vi.mock('../../api', () => ({
  api: {
    resumeHighlights: vi.fn(),
    createResumeHighlight: vi.fn(),
    updateResumeHighlight: vi.fn(),
    copyResumeHighlight: vi.fn(),
    deleteResumeHighlight: vi.fn()
  }
}))

const mocked = vi.mocked(api)
const session: Session = { token: 'test-token', user: { id: 1, email: 'owner@example.com' } }

describe('ZenFocusEditor 专注写作区组件测试（ADR 004：非模态区域展开）', () => {
  afterEach(cleanup)

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
    // 伴随栏的简历亮点来自服务端接口（迁移后不再读 supplementary_notes 里的历史版本）
    mocked.resumeHighlights.mockResolvedValue([
      {
        id: 1,
        work_content_id: 101,
        label: '技术深度版',
        content: '主导画布渲染引擎重构，渲染耗时降低 75%。',
        position: 0,
        archived: false,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z'
      },
      {
        id: 2,
        work_content_id: 101,
        label: '业务成效版',
        content: '保障数十个业务线可视化大屏平稳上线，提升搭建效率 3 倍。',
        position: 1,
        archived: false,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z'
      }
    ])
  })

  it('isOpen 为 true 时渲染专注写作区（region 角色）与左右双栏对照工作区', async () => {
    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        session={session}
      />
    )

    // 1. 区域形态：不再是 dialog 全屏浮层，而是一个带 aria-label 的 region。
    //    退出按钮、面包屑、保存态 Chip 已整体移到 AppShell 顶栏，区域内不再自渲染。
    expect(
      screen.getByRole('region', { name: /专注写作区: 重构可视化拖拽画布核心渲染引擎/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '退出全屏' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '收起伴随栏' })).not.toBeInTheDocument()
    expect(screen.queryByText('已自动保存')).not.toBeInTheDocument()

    // 2. 左侧主写作区大标题输入与正文
    const titleInput = screen.getByLabelText('工作项大标题')
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).toHaveValue('重构可视化拖拽画布核心渲染引擎')

    const editorBox = screen.getByLabelText('草稿正文')
    expect(editorBox).toBeInTheDocument()
    expect(editorBox).toHaveTextContent('旧渲染器全量 re-render 导致大页面卡顿')

    // 3. 右侧伴随提炼栏改装为 HeroUI Card（Card.Title 即 h3，标题层级不变），简历亮点卡片流仍在
    const companionSidebar = screen.getByLabelText('伴随提炼栏')
    expect(companionSidebar).toBeInTheDocument()
    expect(
      within(companionSidebar).getByRole('heading', { level: 3, name: '简历亮点提炼' })
    ).toBeInTheDocument()
    expect(await within(companionSidebar).findByText('技术深度版')).toBeInTheDocument()
    expect(within(companionSidebar).getByText('业务成效版')).toBeInTheDocument()
    expect(companionSidebar.querySelector('.zen-companion-card')).not.toBeNull()
  })

  it('就地编辑大标题时把实时标题上抛给外壳（顶栏面包屑末级）', () => {
    const handleTitleChange = vi.fn()

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        session={session}
        onTitleChange={handleTitleChange}
      />
    )

    fireEvent.change(screen.getByLabelText('工作项大标题'), {
      target: { value: '重构渲染引擎（区域展开版）' }
    })

    expect(handleTitleChange).toHaveBeenCalledWith('重构渲染引擎（区域展开版）')
  })

  it('修改工作项大标题并在 800ms 防抖后自动保存', async () => {
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
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
  })

  it('卸载时兵底 flush：未到 800ms 防抖就离开（面包屑第 1 级 / 侧栏导航）也不会丢掉最后一笔输入', async () => {
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    const { unmount } = render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
      />
    )

    fireEvent.change(screen.getByLabelText('工作项大标题'), {
      target: { value: '刚敲下就走人的标题' }
    })

    // 不等防抖，直接卸载（外壳离开画布 / 切模块时写作区就是这样被卸载的）
    expect(handleSaveContent).not.toHaveBeenCalled()
    unmount()

    await waitFor(() => {
      expect(handleSaveContent).toHaveBeenCalledWith(
        expect.objectContaining({ title: '刚敲下就走人的标题' }),
        101
      )
    })
  })

  it('卸载后在途保存失败仍把 unsaved 上抛给外壳', async () => {
    let rejectSave: (error: Error) => void = () => {}
    const handleSaveStatusChange = vi.fn()
    const handleSaveContent = vi.fn(
      () => new Promise<void>((_resolve, reject) => { rejectSave = reject })
    )

    const { unmount } = render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        onSaveStatusChange={handleSaveStatusChange}
        session={session}
      />
    )

    fireEvent.change(screen.getByLabelText('工作项大标题'), {
      target: { value: '卸载后失败的标题' }
    })
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(1), { timeout: 2500 })

    unmount()
    rejectSave(new Error('网络断了'))

    await waitFor(() => expect(handleSaveStatusChange).toHaveBeenCalledWith('unsaved'))
  })

  it('修改自由 Markdown 正文并在 800ms 防抖后自动保存', async () => {
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
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

  it('伴随栏开合由外壳的 isCompanionOpen 决定（区域内不再自带开关）', async () => {
    const { rerender } = render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        session={session}
        isCompanionOpen={true}
      />
    )

    expect(screen.getByLabelText('伴随提炼栏')).toBeInTheDocument()

    rerender(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        session={session}
        isCompanionOpen={false}
      />
    )

    await waitFor(() => {
      expect(screen.queryByLabelText('伴随提炼栏')).not.toBeInTheDocument()
    })
  })

  it('按下物理 Escape 键退出专注模式，若有未决修改立即刷新保存', async () => {
    const handleClose = vi.fn()
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={handleSaveContent}
        session={session}
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

  it('Esc 守卫：区域内有模态层（role=dialog）时不退出专注模式', () => {
    const handleClose = vi.fn()

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={vi.fn()}
        session={session}
      />
    )

    const modal = document.createElement('div')
    modal.setAttribute('role', 'dialog')
    document.body.appendChild(modal)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()

    document.body.removeChild(modal)
  })

  it('外壳下发的 exitSignal 关闭命令走同一条退出路径（先 flush 再关）', () => {
    const handleClose = vi.fn()
    const handleSaveContent = vi.fn().mockResolvedValue(undefined)

    const { rerender } = render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={handleSaveContent}
        session={session}
        exitSignal={0}
      />
    )

    fireEvent.change(screen.getByLabelText('工作项大标题'), {
      target: { value: '外壳命令关闭前的未决修改' }
    })

    // 顶栏返回按钮 / 面包屑中间级 → 外壳把计数 +1 下发
    rerender(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={handleClose}
        onSaveContent={handleSaveContent}
        session={session}
        exitSignal={1}
      />
    )

    expect(handleSaveContent).toHaveBeenCalledWith(
      expect.objectContaining({ title: '外壳命令关闭前的未决修改' }),
      101
    )
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('慢网下第一笔在途时输入的内容不会丢：停手后自己补发第二笔（与画布卡片共用同一份保存队列）', async () => {
    const landed: string[] = []
    const handleSaveContent = vi.fn(
      (draft: ContentDraft) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            landed.push(draft.title)
            resolve()
          }, 1000)
        })
    )

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
      />
    )

    const titleInput = screen.getByLabelText('工作项大标题')

    // 输入 E1 → 停手 800ms → 第一笔发出（往返 1s，仍在途）
    fireEvent.change(titleInput, { target: { value: 'E1' } })
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(1), { timeout: 2500 })
    expect(landed).toEqual([])

    // 第一笔还在路上时继续输入 E2，然后彻底停手
    fireEvent.change(titleInput, { target: { value: 'E1E2' } })
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(2), { timeout: 4000 })
    expect(handleSaveContent).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'E1E2' }),
      101
    )

    await waitFor(() => expect(landed).toEqual(['E1', 'E1E2']), { timeout: 4000 })

    // 补发只有一笔，不会滚成第三笔
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(handleSaveContent).toHaveBeenCalledTimes(2)
  })

  it('慢网正文编辑也会在尾段补发后落库完整内容（Zen 与画布卡片同口径，issue #8）', async () => {
    const landed: string[] = []
    const handleSaveContent = vi.fn(
      (draft: ContentDraft) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            landed.push(draft.detailed_record)
            resolve()
          }, 1000)
        })
    )

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
      />
    )

    const editor = screen.getByLabelText('草稿正文')
    pasteMarkdown(editor, 'Zen 正文 E1')
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(1), { timeout: 2500 })

    pasteMarkdown(editor, 'Zen 正文 E2')
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(2), { timeout: 4000 })
    await waitFor(() => expect(landed).toHaveLength(2), { timeout: 4000 })

    expect(landed[1]).toContain('Zen 正文 E1')
    expect(landed[1]).toContain('Zen 正文 E2')
    expect(screen.getByLabelText('草稿正文')).toHaveTextContent('Zen 正文 E2')
  })

  it('保存失败时把 unsaved 上抛给外壳，顶栏 Chip 不再归零冒充一切正常（issue #8）', async () => {
    const handleSaveStatusChange = vi.fn()
    const handleSaveContent = vi.fn().mockRejectedValue(new Error('网络断了'))

    render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        onSaveStatusChange={handleSaveStatusChange}
        session={session}
      />
    )

    fireEvent.change(screen.getByLabelText('工作项大标题'), {
      target: { value: '存不上去的标题' }
    })

    await waitFor(() => expect(handleSaveStatusChange).toHaveBeenCalledWith('unsaved'), {
      timeout: 2500
    })
    expect(handleSaveStatusChange).not.toHaveBeenCalledWith('saved')
  })

  it('父级把保存成功的 item 回写成新对象时，不把写作区里更新的输入冲掉（issue #13 在 Zen 侧的同构缺口）', async () => {
    const resolvers: Array<() => void> = []
    const handleSaveContent = vi.fn(
      () => new Promise<void>((resolve) => { resolvers.push(resolve) })
    )

    const { rerender } = render(
      <ZenFocusEditor
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
      />
    )

    const titleInput = screen.getByLabelText('工作项大标题')
    fireEvent.change(titleInput, { target: { value: 'E1' } })
    await waitFor(() => expect(handleSaveContent).toHaveBeenCalledTimes(1), { timeout: 2500 })

    // 第一笔在途时又敲了字
    fireEvent.change(titleInput, { target: { value: 'E1E2' } })

    // 第一笔落地，父级以新对象回写同一张卡片（内容是第一笔那份）
    resolvers[0]()
    rerender(
      <ZenFocusEditor
        isOpen={true}
        workContent={{ ...mockWorkContent, title: 'E1' }}
        onClose={vi.fn()}
        onSaveContent={handleSaveContent}
        session={session}
      />
    )

    expect(screen.getByLabelText('工作项大标题')).toHaveValue('E1E2')
  })

  it('isOpen 为 false 时不渲染任何内容', () => {
    const { container } = render(
      <ZenFocusEditor
        isOpen={false}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onSaveContent={vi.fn()}
        session={session}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
