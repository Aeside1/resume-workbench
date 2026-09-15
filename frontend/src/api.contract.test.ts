import { describe, expect, it } from 'vitest'
import contract from './contracts/openapi-plan-paths.json'
import { api } from './api'

/**
 * 前后端契约测试（切片 04b）。
 *
 * 快照由后端 `backend/tests/test_openapi_contract.py` 生成并提交（放在 src 内，因为
 * web 镜像的构建上下文只有 frontend/），这里断言 `api.ts` 里的每个方案/亮点调用在后端都真实存在，
 * 且后端的每个方案/亮点路由都被前端覆盖（或在 BACKEND_ONLY 里写明原因）。
 * 这样任何一侧单独改路径或字段都会红，而不是静默 404。
 */
const snapshot: Record<string, { request_fields?: string[] }> = contract

type Route = { apiMethod: keyof typeof api; method: string; path: string }

const normalize = (path: string) => path.replace(/\$\{[^}]+\}/g, '{}').replace(/\{[^}]+\}/g, '{}')

/** 快照键里的参数名（plan_id / block_id …）与前端变量名不同，比较前统一归一化成 {} */
const SNAPSHOT_ROUTES: string[] = Object.keys(snapshot).map(normalize)

const FRONTEND_ROUTES: Route[] = [
  { apiMethod: 'resumePlans', method: 'GET', path: '/api/resume-plans' },
  { apiMethod: 'createResumePlan', method: 'POST', path: '/api/resume-plans' },
  { apiMethod: 'resumePlan', method: 'GET', path: '/api/resume-plans/${planId}' },
  { apiMethod: 'updateResumePlan', method: 'PATCH', path: '/api/resume-plans/${planId}' },
  { apiMethod: 'archiveResumePlan', method: 'POST', path: '/api/resume-plans/${planId}/archive' },
  { apiMethod: 'restoreResumePlan', method: 'POST', path: '/api/resume-plans/${planId}/restore' },
  { apiMethod: 'deleteResumePlan', method: 'DELETE', path: '/api/resume-plans/${planId}' },
  { apiMethod: 'forkResumePlan', method: 'POST', path: '/api/resume-plans/${planId}/fork' },
  { apiMethod: 'addPlanBlock', method: 'POST', path: '/api/resume-plans/${planId}/experience-groups' },
  { apiMethod: 'updatePlanBlock', method: 'PATCH', path: '/api/resume-plans/${planId}/experience-groups/${blockId}' },
  { apiMethod: 'removePlanBlock', method: 'DELETE', path: '/api/resume-plans/${planId}/experience-groups/${blockId}' },
  { apiMethod: 'reorderPlanBlocks', method: 'POST', path: '/api/resume-plans/${planId}/experience-groups/reorder' },
  { apiMethod: 'addPlanItem', method: 'POST', path: '/api/resume-plans/${planId}/items' },
  { apiMethod: 'updatePlanItem', method: 'PATCH', path: '/api/resume-plans/${planId}/items/${itemId}' },
  { apiMethod: 'removePlanItem', method: 'DELETE', path: '/api/resume-plans/${planId}/items/${itemId}' },
  { apiMethod: 'reorderPlanItems', method: 'POST', path: '/api/resume-plans/${planId}/experience-groups/${blockId}/items/reorder' },
  { apiMethod: 'planCandidates', method: 'GET', path: '/api/resume-plans/${planId}/candidates' },
  { apiMethod: 'planDocument', method: 'GET', path: '/api/resume-plans/${planId}/document' },
  { apiMethod: 'planArchives', method: 'GET', path: '/api/resume-plans/${planId}/archives' },
  { apiMethod: 'restorePlanArchive', method: 'POST', path: '/api/resume-plans/${planId}/archives/${archiveId}/restore' },
  { apiMethod: 'resumeHighlights', method: 'GET', path: '/api/work-contents/${contentId}/resume-descriptions' },
  { apiMethod: 'createResumeHighlight', method: 'POST', path: '/api/work-contents/${contentId}/resume-descriptions' },
  { apiMethod: 'updateResumeHighlight', method: 'PATCH', path: '/api/resume-descriptions/${id}' },
  { apiMethod: 'copyResumeHighlight', method: 'POST', path: '/api/resume-descriptions/${id}/copy' },
  { apiMethod: 'archiveResumeHighlight', method: 'POST', path: '/api/resume-descriptions/${id}/archive' },
  { apiMethod: 'restoreResumeHighlight', method: 'POST', path: '/api/resume-descriptions/${id}/restore' },
  { apiMethod: 'deleteResumeHighlight', method: 'DELETE', path: '/api/resume-descriptions/${id}' }
]

/** 后端已有、但本轮不由前端调用的路由（写明原因，避免路径漂移被静默忽略） */
const BACKEND_ONLY = [
  // 抽屉只需要列表接口，暂不需要单条读取
  'GET /api/resume-descriptions/{}',
  // 亮点自身的拖动排序没有界面入口（04a 已有的后端能力）
  'POST /api/work-contents/{}/resume-descriptions/reorder'
]

describe('方案与简历亮点的前后端契约', () => {
  it('前端每个调用都能在后端契约里找到对应路由', () => {
    const missing = FRONTEND_ROUTES.filter((route) => !SNAPSHOT_ROUTES.includes(`${route.method} ${normalize(route.path)}`)).map(
      (route) => `${route.method} ${route.path}`
    )
    expect(missing).toEqual([])
  })

  it('api.ts 导出的方法名与契约表一一对应', () => {
    for (const route of FRONTEND_ROUTES) {
      expect(typeof api[route.apiMethod], `${route.apiMethod} 应该是 api 上的方法`).toBe('function')
    }
  })

  it('后端每个方案/亮点路由都被前端接入或已登记为后端专用', () => {
    const wired = new Set(FRONTEND_ROUTES.map((route) => `${route.method} ${normalize(route.path)}`))
    const unwired = SNAPSHOT_ROUTES.filter((key) => !wired.has(key))
    expect(unwired.sort()).toEqual([...BACKEND_ONLY].sort())
  })
})
