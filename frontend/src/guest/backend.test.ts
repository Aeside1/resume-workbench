import { beforeEach, describe, expect, it } from 'vitest'
import { api, ApiError } from '../api'
import { GUEST_TOKEN } from '../session'
import { SAMPLE_GROUPS, SAMPLE_HIGHLIGHTS, SAMPLE_WORK_CONTENTS } from './sampleContent'

const groupPayload = {
  name: '新分组',
  type: 'project' as const,
  organization: null,
  start_date: null,
  end_date: null,
  description: null
}

const contentPayload = {
  title: '新工作内容',
  detailed_record: null,
  technical_materials: null,
  result_data: null,
  supplementary_notes: null
}

beforeEach(() => localStorage.clear())

describe('游客数据源：只读示例内容（ADR 008）', () => {
  it('me 返回游客身份', async () => {
    await expect(api.me(GUEST_TOKEN)).resolves.toEqual({ id: 0, email: '游客模式' })
  })

  it('读取示例经历分组、具体工作内容与简历亮点', async () => {
    await expect(api.experienceGroups(GUEST_TOKEN, true)).resolves.toEqual(SAMPLE_GROUPS)

    const contents = await api.workContents(GUEST_TOKEN, 1)
    expect(contents.map((content) => content.title)).toEqual(['拆分下单与支付链路', '建立接口契约回归测试'])

    const highlights = await api.resumeHighlights(GUEST_TOKEN, 11)
    expect(highlights.map((highlight) => highlight.label)).toEqual(['技术深度版', '结果强调版', '极简版'])
  })

  it('所有写操作一律 401 拒绝，不落任何本地数据', async () => {
    const failures = await Promise.allSettled([
      api.createExperienceGroup(GUEST_TOKEN, groupPayload),
      api.updateExperienceGroup(GUEST_TOKEN, 1, { name: '改名' }),
      api.archiveExperienceGroup(GUEST_TOKEN, 1),
      api.restoreExperienceGroup(GUEST_TOKEN, 1),
      api.deleteExperienceGroup(GUEST_TOKEN, 1),
      api.createWorkContent(GUEST_TOKEN, 1, contentPayload),
      api.updateWorkContent(GUEST_TOKEN, 11, { title: '改名' }),
      api.reorderWorkContents(GUEST_TOKEN, 1, [12, 11]),
      api.archiveWorkContent(GUEST_TOKEN, 11),
      api.restoreWorkContent(GUEST_TOKEN, 11),
      api.deleteWorkContent(GUEST_TOKEN, 11),
      api.createResumeHighlight(GUEST_TOKEN, 11),
      api.updateResumeHighlight(GUEST_TOKEN, 21, { label: '改名' }),
      api.copyResumeHighlight(GUEST_TOKEN, 21),
      api.archiveResumeHighlight(GUEST_TOKEN, 21),
      api.restoreResumeHighlight(GUEST_TOKEN, 21),
      api.deleteResumeHighlight(GUEST_TOKEN, 21)
    ])

    for (const failure of failures) {
      expect(failure.status).toBe('rejected')
      const error = (failure as PromiseRejectedResult).reason
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(401)
    }
    expect(localStorage.length).toBe(0)
  })

  it('简历方案接口一律 401', async () => {
    const failures = await Promise.allSettled([
      api.resumePlans(GUEST_TOKEN),
      api.createResumePlan(GUEST_TOKEN, { name: '前端岗' }),
      api.resumePlan(GUEST_TOKEN, 1),
      api.planDocument(GUEST_TOKEN, 1)
    ])

    for (const failure of failures) {
      expect(failure.status).toBe('rejected')
      expect((failure as PromiseRejectedResult).reason).toMatchObject({ status: 401 })
    }
  })

  it('游客 logout 不发请求', async () => {
    await expect(api.logout(GUEST_TOKEN)).resolves.toBeUndefined()
  })
})

describe('示例内容', () => {
  it('id 唯一，且工作内容与亮点都挂在真实父级上', () => {
    const groupIds = new Set(SAMPLE_GROUPS.map((group) => group.id))
    const contentIds = new Set(SAMPLE_WORK_CONTENTS.map((content) => content.id))
    const ids = [
      ...SAMPLE_GROUPS.map((group) => group.id),
      ...SAMPLE_WORK_CONTENTS.map((content) => content.id),
      ...SAMPLE_HIGHLIGHTS.map((highlight) => highlight.id)
    ]

    expect(new Set(ids).size).toBe(ids.length)
    expect(SAMPLE_WORK_CONTENTS.every((content) => groupIds.has(content.experience_group_id))).toBe(true)
    expect(SAMPLE_HIGHLIGHTS.every((highlight) => contentIds.has(highlight.work_content_id))).toBe(true)
  })
})
