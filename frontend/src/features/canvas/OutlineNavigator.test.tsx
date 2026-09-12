import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OutlineNavigator } from './OutlineNavigator'
import type { ExperienceGroup, WorkContent } from '../../api'

afterEach(cleanup)

describe('OutlineNavigator 右侧常驻伴随大纲 TOC Mini-map', () => {
  const mockGroup: ExperienceGroup = {
    id: 1,
    name: '基础架构部前端开发',
    type: 'internship',
    organization: '美团',
    start_date: '2024-03-01',
    end_date: '2024-08-31',
    description: '负责低代码引擎调优',
    archived: false,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  }

  const mockContents: WorkContent[] = [
    {
      id: 101,
      experience_group_id: 1,
      title: '重构可视化拖拽画布核心渲染引擎',
      detailed_record: null,
      technical_materials: null,
      result_data: null,
      supplementary_notes: null,
      position: 0,
      archived: false,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    },
    {
      id: 102,
      experience_group_id: 1,
      title: '设计组件库 Tree-shaking 自动化检测管线',
      detailed_record: null,
      technical_materials: null,
      result_data: null,
      supplementary_notes: null,
      position: 1,
      archived: false,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    }
  ]

  it('完整列出经历概况与所有具体工作项标题条目', () => {
    render(
      <OutlineNavigator
        group={mockGroup}
        contents={mockContents}
        activeId="section-overview"
        onNavigate={vi.fn()}
        onAddNew={vi.fn()}
      />
    )

    expect(screen.getByText('经历大纲')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /经历概况/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重构可视化拖拽画布核心渲染引擎/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /设计组件库 Tree-shaking 自动化检测管线/ })).toBeInTheDocument()
  })

  it('根据 activeId 高亮对应的大纲条目', () => {
    render(
      <OutlineNavigator
        group={mockGroup}
        contents={mockContents}
        activeId="work-content-102"
        onNavigate={vi.fn()}
        onAddNew={vi.fn()}
      />
    )

    const activeBtn = screen.getByRole('button', { name: /设计组件库 Tree-shaking 自动化检测管线/ })
    expect(activeBtn).toHaveClass('active')
    expect(activeBtn).toHaveAttribute('aria-current', 'location')
  })

  it('点击大纲条目派发 onNavigate 回调并传递对应的 targetId', () => {
    const handleNavigate = vi.fn()
    render(
      <OutlineNavigator
        group={mockGroup}
        contents={mockContents}
        activeId="section-overview"
        onNavigate={handleNavigate}
        onAddNew={vi.fn()}
      />
    )

    const targetBtn = screen.getByRole('button', { name: /重构可视化拖拽画布核心渲染引擎/ })
    fireEvent.click(targetBtn)

    expect(handleNavigate).toHaveBeenCalledWith('work-content-101')
  })

  it('点击快捷入口“+ 新增工作内容”派发 onAddNew 回调', () => {
    const handleAddNew = vi.fn()
    render(
      <OutlineNavigator
        group={mockGroup}
        contents={mockContents}
        activeId="section-overview"
        onNavigate={vi.fn()}
        onAddNew={handleAddNew}
      />
    )

    const addBtn = screen.getByRole('button', { name: '+ 新增工作内容' })
    fireEvent.click(addBtn)

    expect(handleAddNew).toHaveBeenCalledTimes(1)
  })

  it('呈现以经历概况为父级的大纲树状结构并标明具体工作内容子项，且不包含多余统计指标', () => {
    render(
      <OutlineNavigator
        group={mockGroup}
        contents={mockContents}
        activeId="section-overview"
        onNavigate={vi.fn()}
        onAddNew={vi.fn()}
      />
    )

    // 经历概况作为顶层节点
    const overviewBtn = screen.getByRole('button', { name: /经历概况/ })
    expect(overviewBtn).toHaveClass('outline-nav-item--parent')

    // 下属具备具体工作内容分组子树
    expect(screen.getByText('具体工作内容')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()

    // 冗余统计数据已彻底移除
    expect(screen.queryByText('已沉淀工作项')).not.toBeInTheDocument()
    expect(screen.queryByText('多版本简历资产')).not.toBeInTheDocument()
  })
})
