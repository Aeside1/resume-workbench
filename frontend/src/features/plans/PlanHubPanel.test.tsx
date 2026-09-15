import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, type ResumePlan, type ResumePlanDetail } from '../../api'
import type { Session } from '../../session'
import { ToastProvider } from '../../components/ui/Toast'
import { PlanHubPanel } from './PlanHubPanel'

vi.mock('../../api', () => ({
  api: {
    resumePlans: vi.fn(),
    resumePlan: vi.fn(),
    createResumePlan: vi.fn(),
    updateResumePlan: vi.fn(),
    archiveResumePlan: vi.fn(),
    restoreResumePlan: vi.fn(),
    deleteResumePlan: vi.fn()
  }
}))

const mocked = vi.mocked(api)
afterEach(cleanup)

const session: Session = { token: 'test-token', user: { id: 1, email: 'owner@example.com' } }

const basePlan: ResumePlan = {
  id: 7,
  user_id: 1,
  name: '2026 后端岗',
  purpose: '支付中台方向',
  archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z'
}

const detailOf = (plan: ResumePlan, blockCount: number): ResumePlanDetail => ({
  ...plan,
  experience_groups: Array.from({ length: blockCount }, (_, index) => ({
    id: 100 + index,
    plan_id: plan.id,
    experience_group_id: 200 + index,
    position: index,
    show_work_content_titles: true,
    name: `经历 ${index + 1}`,
    type: index === 0 ? 'internship' : 'project',
    organization: '示例科技',
    start_date: null,
    end_date: null,
    items: []
  }))
})

let plans: ResumePlan[] = []

beforeEach(() => {
  vi.resetAllMocks()
  plans = [{ ...basePlan }]
  mocked.resumePlans.mockImplementation(async () => plans)
  mocked.resumePlan.mockImplementation(async (_token, id) => detailOf(plans.find((plan) => plan.id === id)!, 2))
  mocked.createResumePlan.mockImplementation(async (_token, payload) => {
    const created: ResumePlan = { ...basePlan, id: 99, name: payload.name, purpose: payload.purpose ?? null }
    plans = [created, ...plans]
    return created
  })
  mocked.updateResumePlan.mockImplementation(async (_token, id, payload) => {
    const current = plans.find((plan) => plan.id === id)!
    const updated = { ...current, ...payload }
    plans = plans.map((plan) => (plan.id === id ? updated : plan))
    return updated
  })
  mocked.archiveResumePlan.mockImplementation(async (_token, id) => {
    const updated = { ...plans.find((plan) => plan.id === id)!, archived: true }
    plans = plans.map((plan) => (plan.id === id ? updated : plan))
    return updated
  })
  mocked.restoreResumePlan.mockImplementation(async (_token, id) => {
    const updated = { ...plans.find((plan) => plan.id === id)!, archived: false }
    plans = plans.map((plan) => (plan.id === id ? updated : plan))
    return updated
  })
  mocked.deleteResumePlan.mockImplementation(async (_token, id) => {
    plans = plans.filter((plan) => plan.id !== id)
  })
})

function renderHub(onSelectPlan = vi.fn()) {
  render(
    <ToastProvider>
      <PlanHubPanel session={session} onSelectPlan={onSelectPlan} />
    </ToastProvider>
  )
  return onSelectPlan
}

describe('简历方案列表页', () => {
  it('展示在用方案卡片：名称、用途与经历段数', async () => {
    renderHub()

    expect(await screen.findByRole('heading', { name: '2026 后端岗' })).toBeInTheDocument()
    expect(screen.getByText('支付中台方向')).toBeInTheDocument()
    expect(screen.getByText('2 段经历')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建简历方案' })).toBeInTheDocument()
  })

  it('新建方案：名称为空时不能提交，提交后调用创建接口并进入编辑器', async () => {
    const onSelectPlan = renderHub()

    fireEvent.click(await screen.findByRole('button', { name: '新建简历方案' }))
    const submit = screen.getByRole('button', { name: '创建简历方案' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('方案名称'), { target: { value: '2026 全栈岗' } })
    fireEvent.change(screen.getByLabelText('简历用途'), { target: { value: '全栈方向' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => {
      expect(mocked.createResumePlan).toHaveBeenCalledWith('test-token', { name: '2026 全栈岗', purpose: '全栈方向' })
    })
    await waitFor(() => {
      expect(onSelectPlan).toHaveBeenCalledWith(expect.objectContaining({ id: 99, name: '2026 全栈岗' }))
    })
  })

  it('编辑方案名称与用途后调用更新接口', async () => {
    renderHub()

    fireEvent.click(await screen.findByRole('button', { name: '编辑简历方案' }))
    fireEvent.change(screen.getByLabelText('方案名称'), { target: { value: '2026 后端岗（支付）' } })
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))

    await waitFor(() => {
      expect(mocked.updateResumePlan).toHaveBeenCalledWith('test-token', 7, {
        name: '2026 后端岗（支付）',
        purpose: '支付中台方向'
      })
    })
    expect(await screen.findByRole('heading', { name: '2026 后端岗（支付）' })).toBeInTheDocument()
  })

  it('归档后从在用方案消失并出现在归档箱，可恢复', async () => {
    renderHub()
    await screen.findByText('2026 后端岗')

    fireEvent.click(screen.getByRole('button', { name: '归档简历方案' }))
    // 用文本查询：Toast 是顶层 alertdialog，期间 role 查询会被移出无障碍树而不准确
    await waitFor(() => {
      const activeList = screen.getByLabelText('在用简历方案列表')
      expect(within(activeList).queryByText('2026 后端岗')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /归档箱/ }))
    const archivedList = await screen.findByLabelText('已归档简历方案列表')
    expect(within(archivedList).getByText('2026 后端岗')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '恢复简历方案' }))
    await waitFor(() => {
      expect(mocked.restoreResumePlan).toHaveBeenCalledWith('test-token', 7)
    })
  })

  it('彻底删除需要确认弹窗，并说明经历资产不受影响', async () => {
    plans = [{ ...basePlan, archived: true }]
    renderHub()

    fireEvent.click(await screen.findByRole('tab', { name: /归档箱/ }))
    fireEvent.click(await screen.findByRole('button', { name: '彻底删除简历方案' }))

    const dialog = await screen.findByRole('dialog', { name: '确认彻底删除简历方案' })
    expect(within(dialog).getByText(/经历资产里的经历分组/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '确认彻底删除' }))

    await waitFor(() => {
      expect(mocked.deleteResumePlan).toHaveBeenCalledWith('test-token', 7)
    })
  })

  it('卡片 Footer 的归档按钮不会误触发进入编辑器', async () => {
    const onSelectPlan = renderHub()
    await screen.findByRole('heading', { name: '2026 后端岗' })

    fireEvent.click(screen.getByRole('button', { name: '归档简历方案' }))

    await waitFor(() => {
      expect(mocked.archiveResumePlan).toHaveBeenCalled()
    })
    expect(onSelectPlan).not.toHaveBeenCalled()
  })
})
