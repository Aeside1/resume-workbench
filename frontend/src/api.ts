export type AuthResponse = { token: string; user: { id: number; email: string } }
export type ExperienceGroup = { id: number; user_id?: number; name: string; type: 'internship' | 'project'; organization: string | null; start_date: string | null; end_date: string | null; description: string | null; archived: boolean; created_at: string; updated_at: string }
export type WorkContent = { id: number; experience_group_id: number; title: string; detailed_record: string | null; technical_materials: string | null; result_data: string | null; supplementary_notes: string | null; position: number; archived: boolean; created_at: string; updated_at: string }

/**
 * 简历亮点（术语见 CONTEXT.md）：具体工作内容下的一种可直接放进简历的写法。
 * 代码标识符沿用 ResumeDescription，界面与文档统一叫「简历亮点」。
 */
export type ResumeHighlight = { id: number; work_content_id: number; label: string; content: string; position: number; archived: boolean; created_at: string; updated_at: string }

/** 简历方案（术语见 CONTEXT.md）：面向一次求职准备的一套可编辑简历组合 */
export type ResumePlan = { id: number; user_id: number; name: string; purpose: string | null; archived: boolean; created_at: string; updated_at: string }

/** 简历条目引用的解析状态：ok / 没选亮点 / 来源已不存在 */
export type PlanItemStatus = 'ok' | 'missing_highlight' | 'missing_source'

export type PlanItem = { id: number; plan_experience_group_id: number; work_content_id: number | null; resume_description_id: number | null; position: number; work_content_title: string | null; highlight_label: string | null; highlight_content: string | null; status: PlanItemStatus }

/** 经历块：简历大纲里引用的一段经历分组，块内承载若干简历条目 */
export type PlanBlock = { id: number; plan_id: number; experience_group_id: number; position: number; show_work_content_titles: boolean; name: string; type: 'internship' | 'project'; organization: string | null; start_date: string | null; end_date: string | null; items: PlanItem[] }

export type ResumePlanDetail = ResumePlan & { experience_groups: PlanBlock[] }

export type PlanDocument = { markdown: string; outline: { name: string; purpose: string | null; sections: Array<{ section: 'internship' | 'project'; title: string; blocks: PlanBlock[] }> } }

export type PlanCandidates = { experience_groups: Array<{ id: number; name: string; type: 'internship' | 'project'; organization: string | null; start_date: string | null; end_date: string | null; already_added: boolean; work_contents: Array<{ id: number; title: string; already_added: boolean; highlights: Array<{ id: number; label: string; content: string; position: number; already_added: boolean }> }> }> }

/** 方案留档：source=revision（结构性自动留档）/ export（导出快照，切片 05） */
export type PlanArchive = { id: number; plan_id: number; source: 'revision' | 'export'; summary: string | null; created_at: string }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * 带 HTTP 状态码的接口错误。
 *
 * 调用方需要区分「被引用而拒绝删除（409）」与一般失败，才能决定用哪种反馈方式
 * （阻断性弹窗 vs 内联提示），因此不能在抛出时丢掉 status。
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** 是否属于「被简历方案引用」而拒绝删除（409） */
export function isReferenceBlocked(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.detail ?? '请求失败，请稍后重试', response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  register: (email: string, password: string) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: (token: string) => request<void>('/api/auth/logout', { method: 'POST' }, token),
  me: (token: string) => request<{ id: number; email: string }>('/api/auth/me', {}, token),
  experienceGroups: (token: string, includeArchived = false) => request<ExperienceGroup[]>(`/api/experience-groups?include_archived=${includeArchived}`, {}, token),
  createExperienceGroup: (token: string, payload: Omit<ExperienceGroup, 'id' | 'user_id' | 'archived' | 'created_at' | 'updated_at'>) => request<ExperienceGroup>('/api/experience-groups', { method: 'POST', body: JSON.stringify(payload) }, token),
  updateExperienceGroup: (token: string, id: number, payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => request<ExperienceGroup>(`/api/experience-groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  archiveExperienceGroup: (token: string, id: number) => request<ExperienceGroup>(`/api/experience-groups/${id}/archive`, { method: 'POST' }, token),
  restoreExperienceGroup: (token: string, id: number) => request<ExperienceGroup>(`/api/experience-groups/${id}/restore`, { method: 'POST' }, token),
  deleteExperienceGroup: (token: string, id: number) => request<void>(`/api/experience-groups/${id}`, { method: 'DELETE' }, token),
  workContents: (token: string, groupId: number, includeArchived = false) => request<WorkContent[]>(`/api/experience-groups/${groupId}/work-contents?include_archived=${includeArchived}`, {}, token),
  createWorkContent: (token: string, groupId: number, payload: Omit<WorkContent, 'id' | 'experience_group_id' | 'position' | 'archived' | 'created_at' | 'updated_at'>) => request<WorkContent>(`/api/experience-groups/${groupId}/work-contents`, { method: 'POST', body: JSON.stringify(payload) }, token),
  updateWorkContent: (token: string, id: number, payload: Partial<Pick<WorkContent, 'title' | 'detailed_record' | 'technical_materials' | 'result_data' | 'supplementary_notes'>>) => request<WorkContent>(`/api/work-contents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  reorderWorkContents: (token: string, groupId: number, ids: number[]) => request<WorkContent[]>(`/api/experience-groups/${groupId}/work-contents/reorder`, { method: 'POST', body: JSON.stringify({ work_content_ids: ids }) }, token),
  archiveWorkContent: (token: string, id: number) => request<WorkContent>(`/api/work-contents/${id}/archive`, { method: 'POST' }, token),
  restoreWorkContent: (token: string, id: number) => request<WorkContent>(`/api/work-contents/${id}/restore`, { method: 'POST' }, token),
  deleteWorkContent: (token: string, id: number) => request<void>(`/api/work-contents/${id}`, { method: 'DELETE' }, token),
  resumeHighlights: (token: string, contentId: number, includeArchived = false) => request<ResumeHighlight[]>(`/api/work-contents/${contentId}/resume-descriptions?include_archived=${includeArchived}`, {}, token),
  createResumeHighlight: (token: string, contentId: number, payload: { label?: string; content?: string } = {}) => request<ResumeHighlight>(`/api/work-contents/${contentId}/resume-descriptions`, { method: 'POST', body: JSON.stringify(payload) }, token),
  updateResumeHighlight: (token: string, id: number, payload: Partial<Pick<ResumeHighlight, 'label' | 'content'>>) => request<ResumeHighlight>(`/api/resume-descriptions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  copyResumeHighlight: (token: string, id: number) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/copy`, { method: 'POST' }, token),
  archiveResumeHighlight: (token: string, id: number) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/archive`, { method: 'POST' }, token),
  restoreResumeHighlight: (token: string, id: number) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/restore`, { method: 'POST' }, token),
  deleteResumeHighlight: (token: string, id: number) => request<void>(`/api/resume-descriptions/${id}`, { method: 'DELETE' }, token),
  resumePlans: (token: string, includeArchived = false) => request<ResumePlan[]>(`/api/resume-plans?include_archived=${includeArchived}`, {}, token),
  createResumePlan: (token: string, payload: { name: string; purpose?: string | null }) => request<ResumePlan>('/api/resume-plans', { method: 'POST', body: JSON.stringify(payload) }, token),
  resumePlan: (token: string, id: number) => request<ResumePlanDetail>(`/api/resume-plans/${id}`, {}, token),
  updateResumePlan: (token: string, id: number, payload: Partial<Pick<ResumePlan, 'name' | 'purpose'>>) => request<ResumePlan>(`/api/resume-plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  archiveResumePlan: (token: string, id: number) => request<ResumePlan>(`/api/resume-plans/${id}/archive`, { method: 'POST' }, token),
  restoreResumePlan: (token: string, id: number) => request<ResumePlan>(`/api/resume-plans/${id}/restore`, { method: 'POST' }, token),
  deleteResumePlan: (token: string, id: number) => request<void>(`/api/resume-plans/${id}`, { method: 'DELETE' }, token),
  addPlanBlock: (token: string, planId: number, experienceGroupId: number) => request<PlanBlock>(`/api/resume-plans/${planId}/experience-groups`, { method: 'POST', body: JSON.stringify({ experience_group_id: experienceGroupId }) }, token),
  updatePlanBlock: (token: string, planId: number, blockId: number, payload: { show_work_content_titles: boolean }) => request<PlanBlock>(`/api/resume-plans/${planId}/experience-groups/${blockId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  removePlanBlock: (token: string, planId: number, blockId: number) => request<void>(`/api/resume-plans/${planId}/experience-groups/${blockId}`, { method: 'DELETE' }, token),
  reorderPlanBlocks: (token: string, planId: number, blockIds: number[]) => request<PlanBlock[]>(`/api/resume-plans/${planId}/experience-groups/reorder`, { method: 'POST', body: JSON.stringify({ block_ids: blockIds }) }, token),
  addPlanItem: (token: string, planId: number, payload: { block_id: number; work_content_id: number; resume_description_id?: number }) => request<PlanItem>(`/api/resume-plans/${planId}/items`, { method: 'POST', body: JSON.stringify(payload) }, token),
  updatePlanItem: (token: string, planId: number, itemId: number, payload: { resume_description_id: number }) => request<PlanItem>(`/api/resume-plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  removePlanItem: (token: string, planId: number, itemId: number) => request<void>(`/api/resume-plans/${planId}/items/${itemId}`, { method: 'DELETE' }, token),
  reorderPlanItems: (token: string, planId: number, blockId: number, itemIds: number[]) => request<PlanItem[]>(`/api/resume-plans/${planId}/experience-groups/${blockId}/items/reorder`, { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }, token),
  planCandidates: (token: string, planId: number) => request<PlanCandidates>(`/api/resume-plans/${planId}/candidates`, {}, token),
  planDocument: (token: string, planId: number) => request<PlanDocument>(`/api/resume-plans/${planId}/document`, {}, token),
  planArchives: (token: string, planId: number) => request<PlanArchive[]>(`/api/resume-plans/${planId}/archives`, {}, token),
  restorePlanArchive: (token: string, planId: number, archiveId: number) => request<ResumePlanDetail>(`/api/resume-plans/${planId}/archives/${archiveId}/restore`, { method: 'POST' }, token),
}

