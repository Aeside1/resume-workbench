import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateExperienceModal } from './CreateExperienceModal'

afterEach(cleanup)

describe('CreateExperienceModal', () => {
  it('isOpen 为 true 时渲染模态弹窗和所有表单字段', () => {
    render(
      <CreateExperienceModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: '新建经历分组' })).toBeInTheDocument()
    expect(screen.getByLabelText('经历名称')).toBeInTheDocument()
    expect(screen.getByLabelText('类型')).toBeInTheDocument()
    expect(screen.getByLabelText('组织或项目归属')).toBeInTheDocument()
    expect(screen.getByLabelText('开始日期')).toBeInTheDocument()
    expect(screen.getByLabelText('结束日期')).toBeInTheDocument()
    expect(screen.getByLabelText('整体说明')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建经历分组' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('isOpen 为 false 时不渲染弹窗内容', () => {
    render(
      <CreateExperienceModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.queryByRole('heading', { name: '新建经历分组' })).not.toBeInTheDocument()
  })

  it('点击取消按钮触发 onClose 回调', () => {
    const handleClose = vi.fn()
    render(
      <CreateExperienceModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('填写表单并提交触发 onSubmit 回调，成功后清空草稿并关闭', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <CreateExperienceModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('经历名称'), { target: { value: '字节跳动数据中台实习' } })
    fireEvent.change(screen.getByLabelText('组织或项目归属'), { target: { value: '数据平台部' } })
    fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2024-03-01' } })
    fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2024-08-31' } })
    fireEvent.change(screen.getByLabelText('整体说明'), { target: { value: '负责离线计算与资产治理工作。' } })

    fireEvent.click(screen.getByRole('button', { name: '创建经历分组' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: '字节跳动数据中台实习',
        type: 'project', // 默认或者根据选择
        organization: '数据平台部',
        start_date: '2024-03-01',
        end_date: '2024-08-31',
        description: '负责离线计算与资产治理工作。'
      })
    })

    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('经历名称为空时不触发提交', async () => {
    const handleSubmit = vi.fn()
    render(
      <CreateExperienceModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('经历名称'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '创建经历分组' }))

    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
