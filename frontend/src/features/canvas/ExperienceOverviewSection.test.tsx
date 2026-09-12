import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'

afterEach(cleanup)
import { ExperienceOverviewSection } from './ExperienceOverviewSection'
import type { ExperienceGroup } from '../../api'

describe('ExperienceOverviewSection 经历整体概况卡片', () => {
  const mockInternship: ExperienceGroup = {
    id: 1,
    name: '基础架构部前端开发',
    type: 'internship',
    organization: '美团',
    start_date: '2024-03-01',
    end_date: '2024-08-31',
    description: '负责低代码搭建平台核心画布引擎与组件库的性能调优与架构演进。',
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  it('渲染实习经历类型徽章、经历名称、组织与起止时间', () => {
    render(<ExperienceOverviewSection group={mockInternship} />)

    expect(screen.getByText('实习经历')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '基础架构部前端开发' })).toBeInTheDocument()
    expect(screen.getByText(/美团/)).toBeInTheDocument()
    expect(screen.getByText(/2024-03-01 — 2024-08-31/)).toBeInTheDocument()
    expect(screen.getByText('负责低代码搭建平台核心画布引擎与组件库的性能调优与架构演进。')).toBeInTheDocument()
  })

  it('渲染项目经历类型徽章且容错未填写组织和时间的情况', () => {
    const mockProject: ExperienceGroup = {
      id: 2,
      name: '开源可视化图表库',
      type: 'project',
      organization: null,
      start_date: null,
      end_date: null,
      description: null,
      archived: false,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    }

    render(<ExperienceOverviewSection group={mockProject} />)

    expect(screen.getByText('项目经历')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '开源可视化图表库' })).toBeInTheDocument()
    expect(screen.getByText('未填写归属')).toBeInTheDocument()
  })

  it('具有 section-overview 锚点供 TOC 导航定位', () => {
    const { container } = render(<ExperienceOverviewSection group={mockInternship} />)
    const section = container.querySelector('#section-overview')
    expect(section).not.toBeNull()
  })

  it('提供 onUpdate 时显示编辑概况按钮，点击展开就地编辑表单', () => {
    render(<ExperienceOverviewSection group={mockInternship} onUpdate={vi.fn()} />)

    const editBtn = screen.getByRole('button', { name: '编辑经历概况' })
    expect(editBtn).toBeInTheDocument()

    fireEvent.click(editBtn)

    expect(screen.getByText('编辑经历概况')).toBeInTheDocument()
    expect(screen.getByLabelText('经历名称')).toHaveValue('基础架构部前端开发')
    expect(screen.getByRole('button', { name: '保存概况' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('在就地编辑态修改并保存，触发 onUpdate 回调并折叠回排版', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined)
    render(<ExperienceOverviewSection group={mockInternship} onUpdate={handleUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: '编辑经历概况' }))

    const nameInput = screen.getByLabelText('经历名称')
    fireEvent.change(nameInput, { target: { value: '基础架构部高级前端研发' } })

    const saveBtn = screen.getByRole('button', { name: '保存概况' })
    fireEvent.click(saveBtn)

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '基础架构部高级前端研发',
        organization: '美团'
      })
    )
  })
})
