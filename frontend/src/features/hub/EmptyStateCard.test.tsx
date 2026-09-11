import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyStateCard } from './EmptyStateCard'

afterEach(cleanup)

describe('EmptyStateCard 空状态卡片组件', () => {
  it('正确渲染标题、说明文案和行动按钮', () => {
    const handleAction = vi.fn()
    render(
      <EmptyStateCard
        title="开始整理一段经历"
        description="还没有在用经历分组，点击下方按钮开始沉淀。"
        actionLabel="+ 新建经历分组"
        onAction={handleAction}
      />
    )

    expect(screen.getByRole('heading', { name: '开始整理一段经历' })).toBeInTheDocument()
    expect(screen.getByText('还没有在用经历分组，点击下方按钮开始沉淀。')).toBeInTheDocument()
    const actionBtn = screen.getByRole('button', { name: '+ 新建经历分组' })
    expect(actionBtn).toBeInTheDocument()

    fireEvent.click(actionBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('无 actionLabel 时不渲染行动按钮', () => {
    render(
      <EmptyStateCard
        title="归档箱是空的"
        description="没有已归档的经历分组。"
      />
    )

    expect(screen.getByRole('heading', { name: '归档箱是空的' })).toBeInTheDocument()
    expect(screen.getByText('没有已归档的经历分组。')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
