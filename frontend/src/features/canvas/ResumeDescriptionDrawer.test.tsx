import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResumeDescriptionDrawer } from './ResumeDescriptionDrawer'
import { api, type ResumeHighlight, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { ToastProvider } from '../../components/ui/Toast'

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

afterEach(cleanup)

const session: Session = { token: 'test-token', user: { id: 1, email: 'owner@example.com' } }

const workContent: WorkContent = {
  id: 101,
  experience_group_id: 1,
  title: '重构可视化拖拽画布核心渲染引擎',
  detailed_record: '详细记录...',
  technical_materials: null,
  result_data: null,
  supplementary_notes: JSON.stringify({
    note: '内部架构说明',
    versions: [{ id: 'desc_1', label: '旧版残留', content: '这段内容已由迁移搬到独立记录，抽屉不再读取' }]
  }),
  position: 0,
  archived: false,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z'
}

const depthHighlight: ResumeHighlight = {
  id: 1,
  work_content_id: 101,
  label: '技术深度版',
  content: '主导可视化拖拽画布核心渲染引擎重构，采用 React 18 并发机制，降低渲染耗时 75%。',
  position: 0,
  archived: false,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z'
}

const outcomeHighlight: ResumeHighlight = {
  id: 2,
  work_content_id: 101,
  label: '业务成效版',
  content: '通过自研虚拟滚动与局部重绘管线，彻底消除大页面卡顿，支撑了 50+ 业务线高效落地。',
  position: 1,
  archived: false,
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z'
}

function renderDrawer(overrides: Partial<React.ComponentProps<typeof ResumeDescriptionDrawer>> = {}) {
  return render(
    <ToastProvider>
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={workContent}
        session={session}
        onClose={vi.fn()}
        {...overrides}
      />
    </ToastProvider>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocked.resumeHighlights.mockResolvedValue([{ ...depthHighlight }, { ...outcomeHighlight }])
  mocked.updateResumeHighlight.mockImplementation(async (_token, id, patch) => ({
    ...(id === depthHighlight.id ? depthHighlight : outcomeHighlight),
    ...patch
  }))
  mocked.copyResumeHighlight.mockResolvedValue({
    ...depthHighlight,
    id: 3,
    label: '技术深度版 副本',
    position: 2
  })
  mocked.createResumeHighlight.mockResolvedValue({
    ...depthHighlight,
    id: 4,
    label: '新的简历亮点',
    content: '',
    position: 3
  })
  mocked.deleteResumeHighlight.mockResolvedValue(undefined)
})

describe('简历亮点提炼抽屉（服务端独立记录）', () => {
  it('isOpen 为 false 时不展示抽屉', () => {
    renderDrawer({ isOpen: false })

    expect(screen.queryByRole('dialog', { name: '简历亮点提炼抽屉' })).not.toBeInTheDocument()
    expect(screen.queryByText('简历亮点提炼')).not.toBeInTheDocument()
  })

  it('打开后从接口载入简历亮点，渲染抽屉标题、关联工作项与卡片流', async () => {
    renderDrawer()

    expect(screen.getByRole('dialog', { name: '简历亮点提炼抽屉' })).toBeInTheDocument()
    expect(screen.getByText('简历亮点提炼')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭抽屉' })).toBeInTheDocument()

    expect(mocked.resumeHighlights).toHaveBeenCalledWith('test-token', 101)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: '技术深度版' })).toBeInTheDocument()
    })
    expect(screen.getByText(/主导可视化拖拽画布核心渲染引擎重构/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑 技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制 技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除 技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '业务成效版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建简历亮点' })).toBeInTheDocument()

    // 旧 JSON 里的历史版本不再进入界面（已由迁移搬到独立记录）
    expect(screen.queryByText('旧版残留')).not.toBeInTheDocument()
  })

  it('点击关闭按钮或按下 Escape 键触发 onClose 回调', async () => {
    const handleClose = vi.fn()
    renderDrawer({ onClose: handleClose })

    fireEvent.click(screen.getByRole('button', { name: '关闭抽屉' }))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(screen.getByRole('dialog', { name: '简历亮点提炼抽屉' }), { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('编辑亮点名称并点击完成，按条提交 PATCH 而不是整份列表', async () => {
    renderDrawer()
    await screen.findByRole('heading', { level: 3, name: '技术深度版' })

    fireEvent.click(screen.getByRole('button', { name: '编辑 技术深度版' }))
    const labelInput = screen.getByDisplayValue('技术深度版')
    fireEvent.change(labelInput, { target: { value: '技术深度版（强化）' } })
    fireEvent.click(screen.getByRole('button', { name: '完成编辑 技术深度版（强化）' }))

    await waitFor(() => {
      expect(mocked.updateResumeHighlight).toHaveBeenCalledWith('test-token', 1, { label: '技术深度版（强化）' })
    })
    expect(screen.getByRole('heading', { level: 3, name: '技术深度版（强化）' })).toBeInTheDocument()
  })

  it('复制按钮复制出一条新的简历亮点，且不再触碰剪贴板', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderDrawer()
    await screen.findByRole('heading', { level: 3, name: '技术深度版' })

    fireEvent.click(screen.getByRole('button', { name: '复制 技术深度版' }))

    await waitFor(() => {
      expect(mocked.copyResumeHighlight).toHaveBeenCalledWith('test-token', 1)
    })
    expect(await screen.findByRole('heading', { level: 3, name: '技术深度版 副本' })).toBeInTheDocument()
    // 「复制到剪贴板」已按决策退役：复制只表示复制成新的亮点记录
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('已复制')).not.toBeInTheDocument()
  })

  it('删除亮点调用接口移除卡片，并可通过 Toast 撤销恢复', async () => {
    renderDrawer()
    await screen.findByRole('heading', { level: 3, name: '业务成效版' })

    fireEvent.click(screen.getByRole('button', { name: '删除 业务成效版' }))

    await waitFor(() => {
      expect(mocked.deleteResumeHighlight).toHaveBeenCalledWith('test-token', 2)
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: '业务成效版' })).not.toBeInTheDocument()
    })

    const undoBtn = await screen.findByRole('button', { name: '撤销' })
    fireEvent.click(undoBtn)

    await waitFor(() => {
      expect(mocked.createResumeHighlight).toHaveBeenCalledWith('test-token', 101, {
        label: '业务成效版',
        content: outcomeHighlight.content
      })
    })
  })

  it('点击新建简历亮点按钮，调用接口追加一条并进入编辑态', async () => {
    renderDrawer()

    fireEvent.click(await screen.findByRole('button', { name: '新建简历亮点' }))

    await waitFor(() => {
      expect(mocked.createResumeHighlight).toHaveBeenCalledWith('test-token', 101)
    })
    expect(await screen.findByDisplayValue('新的简历亮点')).toBeInTheDocument()
  })

  it('当工作项尚无任何简历亮点时，展示空状态引导', async () => {
    mocked.resumeHighlights.mockResolvedValue([])
    renderDrawer()

    expect(await screen.findByText('暂无简历亮点')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建简历亮点' })).toBeInTheDocument()
  })
})
