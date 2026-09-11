import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

afterEach(cleanup)

describe('ConfirmDeleteModal 彻底删除确认弹窗', () => {
  it('isOpen 为 true 时正常渲染警示信息与经历分组名称', () => {
    render(
      <ConfirmDeleteModal
        isOpen={true}
        groupName="微信支付开发实习"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: '确认彻底删除经历分组' })).toBeInTheDocument()
    expect(screen.getByText(/微信支付开发实习/)).toBeInTheDocument()
    expect(screen.getByText(/数据无法恢复/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认彻底删除' })).toBeInTheDocument()
  })

  it('点击取消按钮或右上角关闭按钮触发 onClose 回调', () => {
    const handleClose = vi.fn()
    render(
      <ConfirmDeleteModal
        isOpen={true}
        groupName="微信支付开发实习"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('点击确认彻底删除按钮触发 onConfirm 回调', () => {
    const handleConfirm = vi.fn()
    render(
      <ConfirmDeleteModal
        isOpen={true}
        groupName="微信支付开发实习"
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '确认彻底删除' }))
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('isOpen 为 false 时不渲染任何弹窗内容', () => {
    render(
      <ConfirmDeleteModal
        isOpen={false}
        groupName="微信支付开发实习"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByRole('heading', { name: '确认彻底删除经历分组' })).not.toBeInTheDocument()
  })
})
