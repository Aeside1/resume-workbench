import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDeleteWorkContentModal } from './ConfirmDeleteWorkContentModal'

afterEach(cleanup)

describe('ConfirmDeleteWorkContentModal 工作项删除确认弹窗 UI 组件', () => {
  it('isOpen 为 true 时正常渲染警示信息与工作项名称', () => {
    render(
      <ConfirmDeleteWorkContentModal
        isOpen={true}
        itemTitle="主导前端渲染性能专项优化"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: '确认删除工作项' })).toBeInTheDocument()
    expect(screen.getByText(/主导前端渲染性能专项优化/)).toBeInTheDocument()
    expect(screen.getByText(/数据无法恢复/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument()
  })

  it('点击取消按钮或右上角关闭按钮触发 onClose 回调', () => {
    const handleClose = vi.fn()
    render(
      <ConfirmDeleteWorkContentModal
        isOpen={true}
        itemTitle="主导前端渲染性能专项优化"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('点击确认删除按钮触发 onConfirm 回调', () => {
    const handleConfirm = vi.fn()
    render(
      <ConfirmDeleteWorkContentModal
        isOpen={true}
        itemTitle="主导前端渲染性能专项优化"
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('isOpen 为 false 时不渲染任何弹窗内容', () => {
    render(
      <ConfirmDeleteWorkContentModal
        isOpen={false}
        itemTitle="主导前端渲染性能专项优化"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByRole('heading', { name: '确认删除工作项' })).not.toBeInTheDocument()
  })
})
