import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResumeDescriptionDrawer } from './ResumeDescriptionDrawer'
import type { WorkContent } from '../../api'
import { ToastProvider } from '../../components/ui/Toast'
import { pasteMarkdown } from '../../test/pasteMarkdown'

afterEach(cleanup)

describe('ResumeDescriptionDrawer 纵向版本卡片提炼抽屉', () => {
  const mockWorkContent: WorkContent = {
    id: 101,
    experience_group_id: 1,
    title: '重构可视化拖拽画布核心渲染引擎',
    detailed_record: '详细记录...',
    technical_materials: null,
    result_data: null,
    supplementary_notes: JSON.stringify({
      note: '内部架构说明',
      versions: [
        {
          id: 'desc_1',
          label: '技术深度版',
          content: '主导可视化拖拽画布核心渲染引擎重构，采用 React 18 并发机制，降低渲染耗时 75%。'
        },
        {
          id: 'desc_2',
          label: '业务成效版',
          content: '通过自研虚拟滚动与局部重绘管线，彻底消除大页面卡顿，支撑了 50+ 业务线高效落地。'
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
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('isOpen 为 false 时不展示抽屉', () => {
    render(
      <ResumeDescriptionDrawer
        isOpen={false}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    expect(screen.queryByRole('complementary', { name: '简历描述提炼抽屉' })).not.toBeInTheDocument()
    expect(screen.queryByText('简历描述提炼')).not.toBeInTheDocument()
  })

  it('isOpen 为 true 且包含版本时，渲染抽屉标题、关联工作项标题与纵向版本卡片流', () => {
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    // 抽屉头部与关联工作项
    expect(screen.getByRole('complementary', { name: '简历描述提炼抽屉' })).toBeInTheDocument()
    expect(screen.getByText('简历描述提炼')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '重构可视化拖拽画布核心渲染引擎' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭抽屉' })).toBeInTheDocument()

    // 纵向版本卡片流（默认阅读态展示）
    expect(screen.getByRole('heading', { level: 3, name: '技术深度版' })).toBeInTheDocument()
    expect(screen.getByText(/主导可视化拖拽画布核心渲染引擎重构/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑 技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制 技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除 技术深度版' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 3, name: '业务成效版' })).toBeInTheDocument()
    expect(screen.getByText(/通过自研虚拟滚动与局部重绘管线/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑 业务成效版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制 业务成效版' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除 业务成效版' })).toBeInTheDocument()

    // 底部新建按钮
    expect(screen.getByRole('button', { name: '新建简历描述版本' })).toBeInTheDocument()
  })

  it('点击关闭按钮或按下 Escape 键触发 onClose 回调', () => {
    const handleClose = vi.fn()
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={handleClose}
        onUpdateVersions={vi.fn()}
      />
    )

    // 点击右上角关闭按钮
    const closeBtn = screen.getByRole('button', { name: '关闭抽屉' })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    // 按下 Escape 键
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('点击复制按钮调用剪贴板 API 拷贝版本全文并给出视觉反馈', async () => {
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    const copyBtn = screen.getByRole('button', { name: '复制 技术深度版' })
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '主导可视化拖拽画布核心渲染引擎重构，采用 React 18 并发机制，降低渲染耗时 75%。'
    )

    // 按钮反馈变为“已复制”
    await waitFor(() => {
      expect(screen.getByText('已复制')).toBeInTheDocument()
    })
  })

  it('默认展示态下点击编辑按钮或标题进入编辑模式，修改标题并点击完成退出编辑模式', async () => {
    const handleUpdateVersions = vi.fn()
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={handleUpdateVersions}
      />
    )

    // 默认展示态下为 h4 标题
    expect(screen.getByRole('heading', { level: 3, name: '技术深度版' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('技术深度版')).not.toBeInTheDocument()

    // 点击编辑按钮进入编辑模式
    const editBtn = screen.getByRole('button', { name: '编辑 技术深度版' })
    fireEvent.click(editBtn)

    // 编辑模式下 input 呈现
    const labelInput = screen.getByDisplayValue('技术深度版')
    expect(labelInput).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '完成编辑 技术深度版' })).toBeInTheDocument()

    // 修改标题并失焦保存
    fireEvent.change(labelInput, { target: { value: '技术深度版（强化）' } })
    fireEvent.blur(labelInput)

    expect(handleUpdateVersions).toHaveBeenCalledWith(
      101,
      expect.arrayContaining([
        expect.objectContaining({
          id: 'desc_1',
          label: '技术深度版（强化）'
        })
      ])
    )

    // 点击完成编辑按钮，退出编辑模式
    const finishBtn = screen.getByRole('button', { name: '完成编辑 技术深度版（强化）' })
    fireEvent.click(finishBtn)

    // 验证退回展示态
    expect(screen.getByRole('heading', { level: 3, name: '技术深度版（强化）' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('技术深度版（强化）')).not.toBeInTheDocument()
  })

  it('点击删除版本按钮，移除对应版本并立即触发 onUpdateVersions', () => {
    const handleUpdateVersions = vi.fn()
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={handleUpdateVersions}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: '删除 业务成效版' })
    fireEvent.click(deleteBtn)

    expect(handleUpdateVersions).toHaveBeenCalledWith(
      101,
      expect.not.arrayContaining([
        expect.objectContaining({ id: 'desc_2' })
      ])
    )
    expect(screen.queryByText('业务成效版')).not.toBeInTheDocument()
  })

  it('删除版本后可通过 Toast 撤销操作恢复该版本', async () => {
    const handleUpdateVersions = vi.fn()
    render(
      <ToastProvider>
        <ResumeDescriptionDrawer
          isOpen={true}
          workContent={mockWorkContent}
          onClose={vi.fn()}
          onUpdateVersions={handleUpdateVersions}
        />
      </ToastProvider>
    )

    const deleteBtn = screen.getByRole('button', { name: '删除 业务成效版' })
    fireEvent.click(deleteBtn)
    expect(screen.queryByText('业务成效版')).not.toBeInTheDocument()

    // 寻找 Toast 撤销按钮
    const undoBtn = await screen.findByRole('button', { name: '撤销' })
    fireEvent.click(undoBtn)

    expect(handleUpdateVersions).toHaveBeenLastCalledWith(
      101,
      expect.arrayContaining([
        expect.objectContaining({ id: 'desc_2', label: '业务成效版' })
      ])
    )
    expect(screen.getByRole('heading', { level: 3, name: '业务成效版' })).toBeInTheDocument()
  })

  it('点击新建简历描述版本按钮，追加新版本并触发 onUpdateVersions', () => {
    const handleUpdateVersions = vi.fn()
    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={mockWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={handleUpdateVersions}
      />
    )

    const addBtn = screen.getByRole('button', { name: '新建简历描述版本' })
    fireEvent.click(addBtn)

    expect(handleUpdateVersions).toHaveBeenCalledWith(
      101,
      expect.arrayContaining([
        expect.objectContaining({ label: '自定义版本', content: '' })
      ])
    )
    expect(screen.getByDisplayValue('自定义版本')).toBeInTheDocument()
  })

  it('当工作项尚无任何简历版本时，展示清晰的空状态引导', () => {
    const emptyWorkContent: WorkContent = {
      ...mockWorkContent,
      supplementary_notes: null
    }

    render(
      <ResumeDescriptionDrawer
        isOpen={true}
        workContent={emptyWorkContent}
        onClose={vi.fn()}
        onUpdateVersions={vi.fn()}
      />
    )

    expect(screen.getByText('暂无简历描述版本')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建简历描述版本' })).toBeInTheDocument()
  })
})
