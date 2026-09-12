import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditExperienceModal } from './EditExperienceModal'
import type { ExperienceGroup } from '../../api'

afterEach(cleanup)

describe('EditExperienceModal 经历分组编辑弹窗', () => {
  const mockGroup: ExperienceGroup = {
    id: 1,
    name: '微信支付核心交易',
    type: 'internship',
    organization: '腾讯科技',
    start_date: '2024-03-01',
    end_date: '2024-08-31',
    description: '负责交易路由与对账系统',
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  it('isOpen 为 true 且 group 存在时渲染模态弹窗并回填现有经历数据', () => {
    render(
      <EditExperienceModal
        isOpen={true}
        group={mockGroup}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('编辑经历分组')).toBeInTheDocument()
    expect(screen.getByLabelText('经历名称')).toHaveValue('微信支付核心交易')
    expect(screen.getByLabelText('组织或项目归属')).toHaveValue('腾讯科技')
    expect(screen.getByLabelText('整体说明')).toHaveValue('负责交易路由与对账系统')
  })

  it('点击取消按钮触发 onClose 回调', () => {
    const handleClose = vi.fn()
    render(
      <EditExperienceModal
        isOpen={true}
        group={mockGroup}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelBtn)
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('修改内容并点击保存提交触发 onSubmit', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EditExperienceModal
        isOpen={true}
        group={mockGroup}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    const nameInput = screen.getByLabelText('经历名称')
    fireEvent.change(nameInput, { target: { value: '微信支付核心系统架构' } })

    const saveBtn = screen.getByRole('button', { name: '保存修改' })
    fireEvent.click(saveBtn)

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '微信支付核心系统架构',
        organization: '腾讯科技'
      })
    )
  })
})
