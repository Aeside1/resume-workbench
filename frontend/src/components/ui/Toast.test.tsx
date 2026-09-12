import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, toast, useToast } from './Toast'

afterEach(cleanup)

function TestComponent({ onAction }: { onAction?: () => void }) {
  const t = useToast()

  return (
    <div>
      <button
        onClick={() =>
          t.success('操作成功完成', {
            action: onAction ? { label: '撤销', onClick: onAction } : undefined,
          })
        }
      >
        触发成功提示
      </button>
      <button onClick={() => t.error('发生异常')}>触发错误提示</button>
    </div>
  )
}

describe('基于 sonner 的 Toast 组件与 API 测试', () => {
  it('在 ToastProvider 下可以正常弹出 Toast 并带有 role="status"', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('触发成功提示'))

    await waitFor(() => {
      const statusElem = screen.getByRole('status')
      expect(statusElem).toBeInTheDocument()
      expect(statusElem).toHaveTextContent('操作成功完成')
    })
  })

  it('支持 Action 按钮（如撤销）点击触发回调', async () => {
    const handleAction = vi.fn()
    render(
      <ToastProvider>
        <TestComponent onAction={handleAction} />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('触发成功提示'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撤销' })).toBeInTheDocument()
    })

    const undoBtn = screen.getByRole('button', { name: '撤销' })
    fireEvent.click(undoBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('支持弹出错误提示并带有 role="alert"', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('触发错误提示'))

    await waitFor(() => {
      const alertElem = screen.getByRole('alert')
      expect(alertElem).toBeInTheDocument()
      expect(alertElem).toHaveTextContent('发生异常')
    })
  })
})
