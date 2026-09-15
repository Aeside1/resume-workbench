import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReferenceBlockedModal } from './ReferenceBlockedModal'

afterEach(cleanup)

const blockedMessage =
  '该内容正被简历方案《Test》引用，请先在方案中移除或替换对应条目，再执行删除。'

describe('ReferenceBlockedModal 删除被阻断的模态提示（04j）', () => {
  it('展示默认标题与后端原文', () => {
    render(<ReferenceBlockedModal isOpen={true} message={blockedMessage} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: '无法彻底删除' })
    expect(within(dialog).getByText(blockedMessage)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '知道了' })).toBeInTheDocument()
  })

  it('支持自定义标题（一般失败用「删除失败」）', () => {
    render(<ReferenceBlockedModal isOpen={true} title="删除失败" message="网络异常" onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: '删除失败' })).toBeInTheDocument()
  })

  it('点「知道了」触发 onClose', () => {
    const onClose = vi.fn()
    render(<ReferenceBlockedModal isOpen={true} message={blockedMessage} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '知道了' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('isOpen 为 false 时不渲染', () => {
    render(<ReferenceBlockedModal isOpen={false} message={blockedMessage} onClose={vi.fn()} />)

    expect(screen.queryByRole('dialog', { name: '无法彻底删除' })).not.toBeInTheDocument()
  })
})
