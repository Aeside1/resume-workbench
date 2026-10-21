import { vi } from 'vitest'

/**
 * `./api` 的完整替身（测试用）。
 *
 * `vi.mock('./api', ...)` 的工厂会被提升到文件顶部，不能直接引用导入的变量，
 * 所以把这个对象放在单独模块里，让多个测试文件共用同一份全量方法清单——
 * 新增 api 方法时只需要改这里，不会漏掉某个测试文件的 mock 而报「not a function」。
 */
export const apiMock = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  experienceGroups: vi.fn(),
  createExperienceGroup: vi.fn(),
  updateExperienceGroup: vi.fn(),
  archiveExperienceGroup: vi.fn(),
  restoreExperienceGroup: vi.fn(),
  deleteExperienceGroup: vi.fn(),
  workContents: vi.fn(),
  createWorkContent: vi.fn(),
  updateWorkContent: vi.fn(),
  reorderWorkContents: vi.fn(),
  archiveWorkContent: vi.fn(),
  restoreWorkContent: vi.fn(),
  deleteWorkContent: vi.fn(),
  resumeHighlights: vi.fn(),
  createResumeHighlight: vi.fn(),
  updateResumeHighlight: vi.fn(),
  copyResumeHighlight: vi.fn(),
  archiveResumeHighlight: vi.fn(),
  restoreResumeHighlight: vi.fn(),
  deleteResumeHighlight: vi.fn(),
  resumePlans: vi.fn(),
  createResumePlan: vi.fn(),
  resumePlan: vi.fn(),
  updateResumePlan: vi.fn(),
  archiveResumePlan: vi.fn(),
  restoreResumePlan: vi.fn(),
  deleteResumePlan: vi.fn(),
  addPlanBlock: vi.fn(),
  updatePlanBlock: vi.fn(),
  removePlanBlock: vi.fn(),
  reorderPlanBlocks: vi.fn(),
  addPlanItem: vi.fn(),
  updatePlanItem: vi.fn(),
  removePlanItem: vi.fn(),
  reorderPlanItems: vi.fn(),
  planCandidates: vi.fn(),
  planDocument: vi.fn(),
  planArchives: vi.fn(),
  restorePlanArchive: vi.fn(),
  forkResumePlan: vi.fn()
}

export const isReferenceBlockedMock = (error: { status?: number } | undefined) => Boolean(error?.status === 409)

/** `vi.mock('./api', apiModuleMock)` 的工厂返回值 */
export function apiModuleMock() {
  return { api: apiMock, isReferenceBlocked: isReferenceBlockedMock }
}
