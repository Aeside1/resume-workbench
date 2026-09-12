import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

afterEach(cleanup)

function TestComponent({ onAction }: { onAction?: () => void }) {
  const toast = useToast()

  return (
    <div>
      <button
        onClick={() =>
          toast.success('操作成功完成', {
            action: onAction ? { label: '撤销', onClick: onAction } : undefined,
          })
        }
      >
        触发成功提示
      </button>
      <button onClick={() => toast.error('发生异常')}>触发错误提示</button>
      {toast.ToastPortal}
    </div>
  )
}

describe('Toast 组件与 useToast Hook', () => {
  it('在 ToastProvider 下可以正常弹出 Toast 并带有 role="status"', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('触发成功提示'))

    const statusElem = screen.getByRole('status')
    expect(statusElem).toBeInTheDocument()
    expect(statusElem).toHaveTextContent('操作成功完成')
  })

  it('支持点击关闭按钮关闭 Toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('触发成功提示'))
    expect(screen.getByRole('status')).toBeInTheDocument()

    const closeBtn = screen.getByLabelText('关闭提示')
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('支持 Action 操作按钮（如撤销）点击触发回调', () => {
    const handleAction = vi.fn()
    render(
      <ToastProvider>
        <TestComponent onAction={handleAction} />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('触发成功提示'))

    const undoBtn = screen.getByRole('button', { name: '撤销' })
    expect(undoBtn).toBeInTheDocument()

    fireEvent.click(undoBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('在没有 ToastProvider 的孤立测试环境下自适应使用本地 fallback', () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByText('触发错误提示'))

    const statusElem = screen.getByRole('status')
    expect(statusElem).toBeInTheDocument()
    expect(statusElem).toHaveTextContent('发生异常')
  })
})
