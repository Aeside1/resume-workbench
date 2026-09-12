import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResumeDescriptionTabs, type ResumeDescriptionItem } from './ResumeDescriptionTabs'

afterEach(cleanup)

describe('ResumeDescriptionTabs 多版本简历描述与完整 CRUD', () => {
  const mockDescriptions: ResumeDescriptionItem[] = [
    {
      id: 'desc-1',
      tag: '技术深度版',
      bullets: [
        '主导底层渲染引擎重构，引入虚拟化视窗，支撑万级节点流畅渲染。',
        '设计基于 DAG 的变更检测机制，降低全量 re-render 开销 60%。'
      ]
    },
    {
      id: 'desc-2',
      tag: '业务量化版',
      bullets: [
        '提升中台核心画布页面首屏加载性能 45%，推动 8 个核心业务线平稳接入。',
        '保障重大促销活动期间系统 0 故障，支撑日均百万级访问峰值。'
      ]
    }
  ]

  it('默认无传入版本时彻底移除假数据，展示空态引导并支持立即新增', () => {
    render(<ResumeDescriptionTabs workContentId={101} />)

    // 不再默认含有硬编码假数据
    expect(screen.queryByRole('tab', { name: '技术深度版' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '业务结果版' })).not.toBeInTheDocument()

    // 展示空态
    expect(screen.getByText(/暂无针对不同岗位的简历描述写法/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 立即新增版本写法' })).toBeInTheDocument()
  })

  it('正确渲染所有传入版本 Tab 并默认激活第一个版本', () => {
    render(<ResumeDescriptionTabs workContentId={101} descriptions={mockDescriptions} />)

    expect(screen.getByRole('tab', { name: '技术深度版' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '业务量化版' })).toBeInTheDocument()
    expect(screen.getByText(/主导底层渲染引擎重构/)).toBeInTheDocument()
    expect(screen.getByText(/设计基于 DAG 的变更检测机制/)).toBeInTheDocument()
    expect(screen.queryByText(/提升中台核心画布页面首屏加载性能/)).not.toBeInTheDocument()
  })

  it('点击不同版本 Tab 能够平滑切换并展示对应版本的 bullet points', () => {
    render(<ResumeDescriptionTabs workContentId={101} descriptions={mockDescriptions} />)

    const businessTab = screen.getByRole('tab', { name: '业务量化版' })
    fireEvent.click(businessTab)

    expect(screen.getByText(/提升中台核心画布页面首屏加载性能/)).toBeInTheDocument()
    expect(screen.getByText(/保障重大促销活动期间系统 0 故障/)).toBeInTheDocument()
    expect(screen.queryByText(/主导底层渲染引擎重构/)).not.toBeInTheDocument()
  })

  it('支持点击“+ 新增写法”按钮展开添加表单并保存新版本 (Create)', () => {
    const handleChange = vi.fn()
    render(
      <ResumeDescriptionTabs
        workContentId={101}
        descriptions={mockDescriptions}
        onChange={handleChange}
      />
    )

    const addBtn = screen.getByRole('button', { name: '+ 新增写法' })
    fireEvent.click(addBtn)

    expect(screen.getByLabelText('版本标签')).toBeInTheDocument()
    expect(screen.getByLabelText(/简历描述要点/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('版本标签'), { target: { value: '管理与协同版' } })
    fireEvent.change(screen.getByPlaceholderText('输入该版本的 bullet points，每行一条...'), {
      target: { value: '协同跨部门 5 人团队完成交付\n推进敏捷迭代流程' }
    })

    const saveBtn = screen.getByRole('button', { name: '保存新写法' })
    fireEvent.click(saveBtn)

    expect(screen.getByRole('tab', { name: '管理与协同版' })).toBeInTheDocument()
    expect(screen.getByText('协同跨部门 5 人团队完成交付')).toBeInTheDocument()
    expect(screen.getByText('推进敏捷迭代流程')).toBeInTheDocument()
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('支持编辑当前选中的版本写法并更新 (Update)', () => {
    const handleChange = vi.fn()
    render(
      <ResumeDescriptionTabs
        workContentId={101}
        descriptions={mockDescriptions}
        onChange={handleChange}
      />
    )

    const editBtn = screen.getByRole('button', { name: '编辑写法' })
    fireEvent.click(editBtn)

    expect(screen.getByDisplayValue('技术深度版')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('版本标签'), { target: { value: '架构演进深度版' } })

    const saveBtn = screen.getByRole('button', { name: '保存修改' })
    fireEvent.click(saveBtn)

    expect(screen.getByRole('tab', { name: '架构演进深度版' })).toBeInTheDocument()
    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tag: '架构演进深度版' })
      ])
    )
  })

  it('支持删除当前版本写法并触发确认与回调 (Delete)', () => {
    const handleChange = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <ResumeDescriptionTabs
        workContentId={101}
        descriptions={mockDescriptions}
        onChange={handleChange}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: '删除' })
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('技术深度版'))
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('tab', { name: '技术深度版' })).not.toBeInTheDocument()
    // 自动切换至剩余版本
    expect(screen.getByRole('tab', { name: '业务量化版' })).toBeInTheDocument()
  })

  it('点击取消收起表单且不改变已有版本', () => {
    render(<ResumeDescriptionTabs workContentId={101} descriptions={mockDescriptions} />)

    fireEvent.click(screen.getByRole('button', { name: '+ 新增写法' }))
    expect(screen.getByLabelText('版本标签')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByLabelText('版本标签')).not.toBeInTheDocument()
  })
})
