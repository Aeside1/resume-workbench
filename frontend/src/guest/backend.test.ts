import { beforeEach, describe, expect, it } from 'vitest'
import { api, ApiError } from '../api'
import { GUEST_TOKEN } from '../session'
import { readGuestWorkspace } from './workspace'

const guestPayload = {
  name: '订单中台重构',
  type: 'project' as const,
  organization: '示例科技',
  start_date: '2024-03-01',
  end_date: '2024-09-30',
  description: '把下单与支付链路拆开'
}

beforeEach(() => localStorage.clear())

describe('游客本地后端（api 按 token 分派，ADR 008 §2.5）', () => {
  it('身份：游客令牌不出网，me 返回游客身份，logout 不把本地令牌送去服务端', async () => {
    await expect(api.me(GUEST_TOKEN)).resolves.toEqual({ id: 0, email: '游客模式' })
    await expect(api.logout(GUEST_TOKEN)).resolves.toBeUndefined()
  })

  it('经历分组：创建 / 更新 / 归档过滤 / 恢复', async () => {
    const created = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    expect(created.id).toBeGreaterThan(0)
    // 游客对象不属于任何服务端用户：不编造 user_id 哨兵值（ADR 008 §2.2）
    expect(created.user_id).toBeUndefined()
    expect(created.archived).toBe(false)

    await expect(api.experienceGroups(GUEST_TOKEN)).resolves.toEqual([created])

    const renamed = await api.updateExperienceGroup(GUEST_TOKEN, created.id, { name: '订单中台重构（二期）' })
    expect(renamed.name).toBe('订单中台重构（二期）')
    expect(renamed.updated_at >= created.updated_at).toBe(true)

    const archived = await api.archiveExperienceGroup(GUEST_TOKEN, created.id)
    expect(archived.archived).toBe(true)
    await expect(api.experienceGroups(GUEST_TOKEN)).resolves.toEqual([])
    await expect(api.experienceGroups(GUEST_TOKEN, true)).resolves.toHaveLength(1)

    const restored = await api.restoreExperienceGroup(GUEST_TOKEN, created.id)
    expect(restored.archived).toBe(false)
    await expect(api.experienceGroups(GUEST_TOKEN)).resolves.toHaveLength(1)
  })

  it('经历分组：结束日期早于开始日期返回 422（与服务端口径一致）', async () => {
    const created = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    await expect(
      api.updateExperienceGroup(GUEST_TOKEN, created.id, { start_date: '2024-10-01' })
    ).rejects.toMatchObject({ status: 422 })
  })

  it('具体工作内容：position 追加、归档过滤、排序校验、删除级联亮点', async () => {
    const group = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    const first = await api.createWorkContent(GUEST_TOKEN, group.id, { title: '拆链路', detailed_record: '记录', technical_materials: null, result_data: null, supplementary_notes: null })
    const second = await api.createWorkContent(GUEST_TOKEN, group.id, { title: '契约测试', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null })
    expect([first.position, second.position]).toEqual([0, 1])

    const highlight = await api.createResumeHighlight(GUEST_TOKEN, first.id, { label: '技术版', content: '正文' })
    expect(highlight.position).toBe(0)

    await api.archiveWorkContent(GUEST_TOKEN, second.id)
    const visible = await api.workContents(GUEST_TOKEN, group.id)
    expect(visible.map((content) => content.id)).toEqual([first.id])
    await expect(api.workContents(GUEST_TOKEN, group.id, true)).resolves.toHaveLength(2)

    const reordered = await api.reorderWorkContents(GUEST_TOKEN, group.id, [second.id, first.id])
    expect(reordered.map((content) => content.id)).toEqual([second.id, first.id])
    await expect(api.reorderWorkContents(GUEST_TOKEN, group.id, [first.id])).rejects.toMatchObject({ status: 422 })

    await api.deleteWorkContent(GUEST_TOKEN, first.id)
    await expect(api.resumeHighlights(GUEST_TOKEN, first.id, true)).rejects.toMatchObject({ status: 404 })

    await api.deleteExperienceGroup(GUEST_TOKEN, group.id)
    const workspace = readGuestWorkspace()
    expect(workspace.groups).toHaveLength(0)
    expect(workspace.workContents).toHaveLength(0)
    expect(workspace.highlights).toHaveLength(0)
  })

  it('具体工作内容：删除分组会级联删掉组内工作内容与亮点', async () => {
    const group = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    const content = await api.createWorkContent(GUEST_TOKEN, group.id, { title: '拆链路', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null })
    await api.createResumeHighlight(GUEST_TOKEN, content.id, { label: '技术版' })

    await api.deleteExperienceGroup(GUEST_TOKEN, group.id)

    const workspace = readGuestWorkspace()
    expect(workspace.workContents).toHaveLength(0)
    expect(workspace.highlights).toHaveLength(0)
  })

  it('简历亮点：默认名称、复制、归档过滤、删除', async () => {
    const group = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    const content = await api.createWorkContent(GUEST_TOKEN, group.id, { title: '拆链路', detailed_record: null, technical_materials: null, result_data: null, supplementary_notes: null })

    const created = await api.createResumeHighlight(GUEST_TOKEN, content.id)
    expect(created.label).toBe('新的简历亮点')
    expect(created.content).toBe('')

    const clone = await api.copyResumeHighlight(GUEST_TOKEN, created.id)
    expect(clone.label).toBe('新的简历亮点 副本')
    expect(clone.position).toBe(1)

    await api.archiveResumeHighlight(GUEST_TOKEN, clone.id)
    const visible = await api.resumeHighlights(GUEST_TOKEN, content.id)
    expect(visible.map((item) => item.id)).toEqual([created.id])
    await expect(api.resumeHighlights(GUEST_TOKEN, content.id, true)).resolves.toHaveLength(2)

    await api.deleteResumeHighlight(GUEST_TOKEN, created.id)
    await expect(api.resumeHighlights(GUEST_TOKEN, content.id, true)).resolves.toHaveLength(1)
  })

  it('简历方案属于账号能力：游客态一律 401 拒绝，且不写脏本地草稿', async () => {
    const failures = await Promise.allSettled([
      api.resumePlans(GUEST_TOKEN),
      api.createResumePlan(GUEST_TOKEN, { name: '前端岗' }),
      api.resumePlan(GUEST_TOKEN, 1),
      api.planDocument(GUEST_TOKEN, 1)
    ])

    for (const failure of failures) {
      expect(failure.status).toBe('rejected')
      const error = (failure as PromiseRejectedResult).reason
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(401)
      expect(error.message).toContain('登录')
    }

    expect(readGuestWorkspace().groups).toHaveLength(0)
  })

  it('本地草稿跨调用持久化：新的一次会话仍能读到', async () => {
    const group = await api.createExperienceGroup(GUEST_TOKEN, guestPayload)
    // 直接读 localStorage 模拟「刷新页面后重新装载」
    expect(localStorage.getItem('resume-guest-workspace')).toBeTruthy()
    expect(readGuestWorkspace().groups.map((item) => item.id)).toEqual([group.id])

    await expect(api.experienceGroups(GUEST_TOKEN)).resolves.toHaveLength(1)
  })
})
