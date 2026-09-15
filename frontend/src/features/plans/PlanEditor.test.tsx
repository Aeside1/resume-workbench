import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, type PlanBlock, type PlanCandidates, type PlanItem, type ResumePlan, type ResumePlanDetail } from '../../api'
import type { Session } from '../../session'
import { ToastProvider } from '../../components/ui/Toast'
import { PlanEditor } from './PlanEditor'

vi.mock('../../api', () => ({
  api: {
    resumePlan: vi.fn(),
    planDocument: vi.fn(),
    planCandidates: vi.fn(),
    addPlanBlock: vi.fn(),
    removePlanBlock: vi.fn(),
    reorderPlanBlocks: vi.fn(),
    updatePlanBlock: vi.fn(),
    addPlanItem: vi.fn(),
    removePlanItem: vi.fn(),
    reorderPlanItems: vi.fn(),
    updateResumeHighlight: vi.fn(),
    deleteResumeHighlight: vi.fn(),
    deleteWorkContent: vi.fn(),
    deleteExperienceGroup: vi.fn()
  }
}))

const mocked = vi.mocked(api)
afterEach(cleanup)

const session: Session = { token: 'test-token', user: { id: 1, email: 'owner@example.com' } }

const plan: ResumePlan = {
  id: 7,
  user_id: 1,
  name: '2026 后端岗',
  purpose: '支付中台方向',
  archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z'
}

const HIGHLIGHTS = {
  技术深度版: { id: 11, content: '主导收银台跨端组件重构，首屏耗时降低 75%。' },
  业务成效版: { id: 12, content: '保障大促零故障，支撑日均千万级交易。' }
} as const
type HighlightLabel = keyof typeof HIGHLIGHTS

const candidates: PlanCandidates = {
  experience_groups: [
    {
      id: 29,
      name: '支付平台实习',
      type: 'internship',
      organization: '示例科技',
      start_date: '2024-03-01',
      end_date: '2024-08-31',
      already_added: false,
      work_contents: [
        {
          id: 21,
          title: '收银台跨端组件重构',
          already_added: false,
          highlights: (Object.keys(HIGHLIGHTS) as HighlightLabel[]).map((label, index) => ({
            id: HIGHLIGHTS[label].id,
            label,
            content: HIGHLIGHTS[label].content,
            position: index,
            already_added: false
          }))
        }
      ]
    }
  ]
}

let blocks: PlanBlock[] = []

function makeItem(highlightId: number, label: HighlightLabel): PlanItem {
  return {
    id: 900 + highlightId,
    plan_experience_group_id: 101,
    work_content_id: 21,
    resume_description_id: highlightId,
    position: blocks[0]?.items.length ?? 0,
    work_content_title: '收银台跨端组件重构',
    highlight_label: label,
    highlight_content: HIGHLIGHTS[label].content,
    status: 'ok'
  }
}

/** 装配结果的简化版：只保留本用例断言需要的标题行与正文 */
const renderMarkdown = () =>
  blocks
    .flatMap((block) => [
      ...(block.show_work_content_titles && block.items[0]?.work_content_title
        ? [`**${block.items[0].work_content_title}**`]
        : []),
      ...block.items.map((item) => item.highlight_content ?? '')
    ])
    .join('\n')

beforeEach(() => {
  vi.resetAllMocks()
  blocks = []

  mocked.resumePlan.mockImplementation(async () => ({ ...plan, experience_groups: blocks }) as ResumePlanDetail)
  mocked.planDocument.mockImplementation(async () => ({
    markdown: renderMarkdown(),
    outline: { name: plan.name, purpose: plan.purpose, sections: [] }
  }))
  mocked.planCandidates.mockResolvedValue(candidates)
  mocked.addPlanBlock.mockImplementation(async () => {
    blocks = [
      {
        id: 101,
        plan_id: 7,
        experience_group_id: 29,
        position: 0,
        show_work_content_titles: true,
        name: '支付平台实习',
        type: 'internship',
        organization: '示例科技',
        start_date: '2024-03-01',
        end_date: '2024-08-31',
        items: []
      }
    ]
    return blocks[0]
  })
  mocked.removePlanBlock.mockImplementation(async () => {
    blocks = []
  })
  mocked.reorderPlanBlocks.mockImplementation(async (_token, _planId, blockIds) => {
    blocks = blockIds.map((id) => blocks.find((block) => block.id === id)!)
    return blocks
  })
  mocked.updatePlanBlock.mockImplementation(async (_token, _planId, blockId, payload) => {
    blocks = blocks.map((block) => (block.id === blockId ? { ...block, ...payload } : block))
    return blocks.find((block) => block.id === blockId)!
  })
  mocked.addPlanItem.mockImplementation(async (_token, _planId, payload) => {
    const label = (Object.keys(HIGHLIGHTS) as HighlightLabel[]).find(
      (key) => HIGHLIGHTS[key].id === payload.resume_description_id
    )!
    const item = makeItem(HIGHLIGHTS[label].id, label)
    blocks = blocks.map((block) =>
      block.id === payload.block_id ? { ...block, items: [...block.items, item] } : block
    )
    return { ...item, position: blocks[0].items.length - 1 }
  })
  mocked.removePlanItem.mockImplementation(async (_token, _planId, itemId) => {
    blocks = blocks.map((block) => ({ ...block, items: block.items.filter((item) => item.id !== itemId) }))
  })
  mocked.reorderPlanItems.mockImplementation(async (_token, _planId, blockId, itemIds) => {
    blocks = blocks.map((block) =>
      block.id === blockId
        ? { ...block, items: itemIds.map((id) => block.items.find((item) => item.id === id)!) }
        : block
    )
    return blocks.find((block) => block.id === blockId)!.items
  })
})

function renderEditor() {
  render(
    <ToastProvider>
      <PlanEditor session={session} plan={plan} />
    </ToastProvider>
  )
}

async function addExperienceBlock() {
  renderEditor()
  await screen.findByText('先添加一段经历')
  fireEvent.click(screen.getAllByRole('button', { name: '添加经历分组' })[0])

  const dialog = await screen.findByRole('dialog', { name: '添加经历分组' })
  fireEvent.click(within(dialog).getByRole('button', { name: '添加经历分组 支付平台实习' }))

  // 弹窗在顶层时 React Aria 会把其余内容移出无障碍树，因此先等它关闭再查画布
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: '添加经历分组' })).not.toBeInTheDocument()
  })
  await screen.findByRole('article', { name: '经历块 支付平台实习' })
}

/** 在经历块里挑亮点，交互完成后关闭弹窗（与真实用户路径一致） */
async function pickHighlights(labels: HighlightLabel[]) {
  fireEvent.click(screen.getByRole('button', { name: '添加亮点到 支付平台实习' }))
  const picker = await screen.findByRole('dialog', { name: '添加简历亮点' })
  for (const label of labels) {
    fireEvent.click(within(picker).getByRole('button', { name: `加入简历：${label}` }))
    await within(picker).findByRole('button', { name: `移出简历：${label}` })
  }
  fireEvent.click(within(picker).getByRole('button', { name: '完成' }))
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: '添加简历亮点' })).not.toBeInTheDocument()
  })
}

async function addBlockAndHighlight() {
  await addExperienceBlock()
  await pickHighlights(['技术深度版'])
  await screen.findByText('技术深度版')
}

describe('简历编排主工作面', () => {
  it('空方案展示引导，并可从选择器添加一段经历分组', async () => {
    await addExperienceBlock()

    expect(mocked.addPlanBlock).toHaveBeenCalledWith('test-token', 7, 29)
    // 板块由经历分组类型自动决定
    expect(screen.getByRole('region', { name: '实习经历' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '项目经历' })).toBeInTheDocument()
  })

  it('在经历块里挑简历亮点：勾选加入简历，再点一次移出', async () => {
    await addBlockAndHighlight()

    expect(mocked.addPlanItem).toHaveBeenCalledWith('test-token', 7, {
      block_id: 101,
      work_content_id: 21,
      resume_description_id: 11
    })

    fireEvent.click(screen.getByRole('button', { name: '添加亮点到 支付平台实习' }))
    const picker = await screen.findByRole('dialog', { name: '添加简历亮点' })
    fireEvent.click(within(picker).getByRole('button', { name: '移出简历：技术深度版' }))

    await waitFor(() => {
      expect(mocked.removePlanItem).toHaveBeenCalledWith('test-token', 7, 911)
    })
    await within(picker).findByRole('button', { name: '加入简历：技术深度版' })
  })

  it('块内条目可用按钮排序，提交完整序列', async () => {
    await addExperienceBlock()
    await pickHighlights(['技术深度版', '业务成效版'])
    await screen.findByRole('button', { name: '下移条目 技术深度版' })

    fireEvent.click(screen.getByRole('button', { name: '下移条目 技术深度版' }))

    await waitFor(() => {
      expect(mocked.reorderPlanItems).toHaveBeenCalledWith('test-token', 7, 101, [912, 911])
    })
  })

  it('移除条目只解除引用，不触碰经历资产', async () => {
    await addBlockAndHighlight()

    fireEvent.click(screen.getByRole('button', { name: '移除条目 技术深度版' }))

    await waitFor(() => {
      expect(mocked.removePlanItem).toHaveBeenCalledWith('test-token', 7, 911)
    })
    expect(mocked.deleteResumeHighlight).not.toHaveBeenCalled()
    expect(mocked.deleteWorkContent).not.toHaveBeenCalled()
    expect(mocked.deleteExperienceGroup).not.toHaveBeenCalled()
  })

  it('关掉「显示工作内容标题」后，文稿里不再打印该标题', async () => {
    await addBlockAndHighlight()
    const blockCard = screen.getByRole('article', { name: '经历块 支付平台实习' })

    fireEvent.click(within(blockCard).getByRole('switch', { name: '显示工作内容标题' }))

    await waitFor(() => {
      expect(mocked.updatePlanBlock).toHaveBeenCalledWith('test-token', 7, 101, { show_work_content_titles: false })
    })

    fireEvent.click(screen.getByRole('button', { name: '预览' }))
    const preview = await screen.findByLabelText('简历文稿预览')
    expect(within(preview).getByText(/主导收银台跨端组件重构/)).toBeInTheDocument()
    expect(within(preview).queryByText('收银台跨端组件重构')).not.toBeInTheDocument()
  })

  it('预览开关展示与下载同一份文稿，下载文件名带 .md', async () => {
    await addBlockAndHighlight()

    const createObjectURL = vi.fn(() => 'blob:plan')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    let downloadedName = ''
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.getAttribute('download') ?? ''
    })

    fireEvent.click(screen.getByRole('button', { name: '预览' }))
    const preview = await screen.findByLabelText('简历文稿预览')
    // 预览渲染的就是下载拿到的那份 Markdown：工作内容标题印成粗体
    expect(within(preview).getByText('收银台跨端组件重构')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下载简历文稿' }))

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled()
    })
    expect(downloadedName).toBe('2026 后端岗.md')
    clickSpy.mockRestore()
  })
})
