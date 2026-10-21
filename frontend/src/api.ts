import { ApiError, isReferenceBlocked } from './apiErrors'
import { createGuestBackend } from './guest/backend'
import { isGuestToken, type SessionUser } from './session'

export { ApiError, isReferenceBlocked }

export type AuthResponse = { token: string; user: SessionUser }
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

export type ExperienceGroupPayload = Omit<ExperienceGroup, 'id' | 'user_id' | 'archived' | 'created_at' | 'updated_at'>
export type ExperienceGroupPatch = Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>
export type WorkContentPayload = Omit<WorkContent, 'id' | 'experience_group_id' | 'position' | 'archived' | 'created_at' | 'updated_at'>
export type WorkContentPatch = Partial<Pick<WorkContent, 'title' | 'detailed_record' | 'technical_materials' | 'result_data' | 'supplementary_notes'>>
export type ResumeHighlightPayload = { label?: string; content?: string }
export type ResumeHighlightPatch = Partial<Pick<ResumeHighlight, 'label' | 'content'>>
export type ResumePlanPayload = { name: string; purpose?: string | null }
export type ResumePlanPatch = Partial<Pick<ResumePlan, 'name' | 'purpose'>>

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

/**
 * 工作台数据源：`api` 对外的方法（首个参数是 token）在内部按 token 分派到这里。
 *
 * - `httpBackend(token)`：已登录时打服务端接口，作用域由服务端从令牌解析；
 * - `guestBackend()`：未登录时读写浏览器本地草稿（ADR 008 §2.5）。
 *
 * 组件继续只拿 `session: Session`，不需要知道数据来自哪一侧。
 */
export type Backend = {
  me(): Promise<SessionUser>
  experienceGroups(includeArchived: boolean): Promise<ExperienceGroup[]>
  createExperienceGroup(payload: ExperienceGroupPayload): Promise<ExperienceGroup>
  updateExperienceGroup(id: number, payload: ExperienceGroupPatch): Promise<ExperienceGroup>
  archiveExperienceGroup(id: number): Promise<ExperienceGroup>
  restoreExperienceGroup(id: number): Promise<ExperienceGroup>
  deleteExperienceGroup(id: number): Promise<void>
  workContents(groupId: number, includeArchived: boolean): Promise<WorkContent[]>
  createWorkContent(groupId: number, payload: WorkContentPayload): Promise<WorkContent>
  updateWorkContent(id: number, payload: WorkContentPatch): Promise<WorkContent>
  reorderWorkContents(groupId: number, ids: number[]): Promise<WorkContent[]>
  archiveWorkContent(id: number): Promise<WorkContent>
  restoreWorkContent(id: number): Promise<WorkContent>
  deleteWorkContent(id: number): Promise<void>
  resumeHighlights(contentId: number, includeArchived: boolean): Promise<ResumeHighlight[]>
  createResumeHighlight(contentId: number, payload: ResumeHighlightPayload): Promise<ResumeHighlight>
  updateResumeHighlight(id: number, payload: ResumeHighlightPatch): Promise<ResumeHighlight>
  copyResumeHighlight(id: number): Promise<ResumeHighlight>
  archiveResumeHighlight(id: number): Promise<ResumeHighlight>
  restoreResumeHighlight(id: number): Promise<ResumeHighlight>
  deleteResumeHighlight(id: number): Promise<void>
  resumePlans(includeArchived: boolean): Promise<ResumePlan[]>
  createResumePlan(payload: ResumePlanPayload): Promise<ResumePlan>
  resumePlan(id: number): Promise<ResumePlanDetail>
  updateResumePlan(id: number, payload: ResumePlanPatch): Promise<ResumePlan>
  archiveResumePlan(id: number): Promise<ResumePlan>
  restoreResumePlan(id: number): Promise<ResumePlan>
  deleteResumePlan(id: number): Promise<void>
  addPlanBlock(planId: number, experienceGroupId: number): Promise<PlanBlock>
  updatePlanBlock(planId: number, blockId: number, payload: { show_work_content_titles: boolean }): Promise<PlanBlock>
  removePlanBlock(planId: number, blockId: number): Promise<void>
  reorderPlanBlocks(planId: number, blockIds: number[]): Promise<PlanBlock[]>
  addPlanItem(planId: number, payload: { block_id: number; work_content_id: number; resume_description_id?: number }): Promise<PlanItem>
  updatePlanItem(planId: number, itemId: number, payload: { resume_description_id: number }): Promise<PlanItem>
  removePlanItem(planId: number, itemId: number): Promise<void>
  reorderPlanItems(planId: number, blockId: number, itemIds: number[]): Promise<PlanItem[]>
  planCandidates(planId: number): Promise<PlanCandidates>
  planDocument(planId: number): Promise<PlanDocument>
  planArchives(planId: number): Promise<PlanArchive[]>
  restorePlanArchive(planId: number, archiveId: number): Promise<ResumePlanDetail>
  forkResumePlan(id: number): Promise<ResumePlanDetail>
}

function httpBackend(token: string): Backend {
  return {
    me: () => request<SessionUser>('/api/auth/me', {}, token),
    experienceGroups: (includeArchived) => request<ExperienceGroup[]>(`/api/experience-groups?include_archived=${includeArchived}`, {}, token),
    createExperienceGroup: (payload) => request<ExperienceGroup>('/api/experience-groups', { method: 'POST', body: JSON.stringify(payload) }, token),
    updateExperienceGroup: (id, payload) => request<ExperienceGroup>(`/api/experience-groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    archiveExperienceGroup: (id) => request<ExperienceGroup>(`/api/experience-groups/${id}/archive`, { method: 'POST' }, token),
    restoreExperienceGroup: (id) => request<ExperienceGroup>(`/api/experience-groups/${id}/restore`, { method: 'POST' }, token),
    deleteExperienceGroup: (id) => request<void>(`/api/experience-groups/${id}`, { method: 'DELETE' }, token),
    workContents: (groupId, includeArchived) => request<WorkContent[]>(`/api/experience-groups/${groupId}/work-contents?include_archived=${includeArchived}`, {}, token),
    createWorkContent: (groupId, payload) => request<WorkContent>(`/api/experience-groups/${groupId}/work-contents`, { method: 'POST', body: JSON.stringify(payload) }, token),
    updateWorkContent: (id, payload) => request<WorkContent>(`/api/work-contents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    reorderWorkContents: (groupId, ids) => request<WorkContent[]>(`/api/experience-groups/${groupId}/work-contents/reorder`, { method: 'POST', body: JSON.stringify({ work_content_ids: ids }) }, token),
    archiveWorkContent: (id) => request<WorkContent>(`/api/work-contents/${id}/archive`, { method: 'POST' }, token),
    restoreWorkContent: (id) => request<WorkContent>(`/api/work-contents/${id}/restore`, { method: 'POST' }, token),
    deleteWorkContent: (id) => request<void>(`/api/work-contents/${id}`, { method: 'DELETE' }, token),
    resumeHighlights: (contentId, includeArchived) => request<ResumeHighlight[]>(`/api/work-contents/${contentId}/resume-descriptions?include_archived=${includeArchived}`, {}, token),
    createResumeHighlight: (contentId, payload) => request<ResumeHighlight>(`/api/work-contents/${contentId}/resume-descriptions`, { method: 'POST', body: JSON.stringify(payload) }, token),
    updateResumeHighlight: (id, payload) => request<ResumeHighlight>(`/api/resume-descriptions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    copyResumeHighlight: (id) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/copy`, { method: 'POST' }, token),
    archiveResumeHighlight: (id) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/archive`, { method: 'POST' }, token),
    restoreResumeHighlight: (id) => request<ResumeHighlight>(`/api/resume-descriptions/${id}/restore`, { method: 'POST' }, token),
    deleteResumeHighlight: (id) => request<void>(`/api/resume-descriptions/${id}`, { method: 'DELETE' }, token),
    resumePlans: (includeArchived) => request<ResumePlan[]>(`/api/resume-plans?include_archived=${includeArchived}`, {}, token),
    createResumePlan: (payload) => request<ResumePlan>('/api/resume-plans', { method: 'POST', body: JSON.stringify(payload) }, token),
    resumePlan: (id) => request<ResumePlanDetail>(`/api/resume-plans/${id}`, {}, token),
    updateResumePlan: (id, payload) => request<ResumePlan>(`/api/resume-plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    archiveResumePlan: (id) => request<ResumePlan>(`/api/resume-plans/${id}/archive`, { method: 'POST' }, token),
    restoreResumePlan: (id) => request<ResumePlan>(`/api/resume-plans/${id}/restore`, { method: 'POST' }, token),
    deleteResumePlan: (id) => request<void>(`/api/resume-plans/${id}`, { method: 'DELETE' }, token),
    addPlanBlock: (planId, experienceGroupId) => request<PlanBlock>(`/api/resume-plans/${planId}/experience-groups`, { method: 'POST', body: JSON.stringify({ experience_group_id: experienceGroupId }) }, token),
    updatePlanBlock: (planId, blockId, payload) => request<PlanBlock>(`/api/resume-plans/${planId}/experience-groups/${blockId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    removePlanBlock: (planId, blockId) => request<void>(`/api/resume-plans/${planId}/experience-groups/${blockId}`, { method: 'DELETE' }, token),
    reorderPlanBlocks: (planId, blockIds) => request<PlanBlock[]>(`/api/resume-plans/${planId}/experience-groups/reorder`, { method: 'POST', body: JSON.stringify({ block_ids: blockIds }) }, token),
    addPlanItem: (planId, payload) => request<PlanItem>(`/api/resume-plans/${planId}/items`, { method: 'POST', body: JSON.stringify(payload) }, token),
    updatePlanItem: (planId, itemId, payload) => request<PlanItem>(`/api/resume-plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
    removePlanItem: (planId, itemId) => request<void>(`/api/resume-plans/${planId}/items/${itemId}`, { method: 'DELETE' }, token),
    reorderPlanItems: (planId, blockId, itemIds) => request<PlanItem[]>(`/api/resume-plans/${planId}/experience-groups/${blockId}/items/reorder`, { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }, token),
    planCandidates: (planId) => request<PlanCandidates>(`/api/resume-plans/${planId}/candidates`, {}, token),
    planDocument: (planId) => request<PlanDocument>(`/api/resume-plans/${planId}/document`, {}, token),
    planArchives: (planId) => request<PlanArchive[]>(`/api/resume-plans/${planId}/archives`, {}, token),
    restorePlanArchive: (planId, archiveId) => request<ResumePlanDetail>(`/api/resume-plans/${planId}/archives/${archiveId}/restore`, { method: 'POST' }, token),
    forkResumePlan: (id) => request<ResumePlanDetail>(`/api/resume-plans/${id}/fork`, { method: 'POST' }, token)
  }
}

const guestBackend = createGuestBackend()

function backendFor(token: string): Backend {
  return isGuestToken(token) ? guestBackend : httpBackend(token)
}

export const api = {
  register: (email: string, password: string) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: (token: string) => request<void>('/api/auth/logout', { method: 'POST' }, token),
  me: (token: string) => backendFor(token).me(),
  experienceGroups: (token: string, includeArchived = false) => backendFor(token).experienceGroups(includeArchived),
  createExperienceGroup: (token: string, payload: ExperienceGroupPayload) => backendFor(token).createExperienceGroup(payload),
  updateExperienceGroup: (token: string, id: number, payload: ExperienceGroupPatch) => backendFor(token).updateExperienceGroup(id, payload),
  archiveExperienceGroup: (token: string, id: number) => backendFor(token).archiveExperienceGroup(id),
  restoreExperienceGroup: (token: string, id: number) => backendFor(token).restoreExperienceGroup(id),
  deleteExperienceGroup: (token: string, id: number) => backendFor(token).deleteExperienceGroup(id),
  workContents: (token: string, groupId: number, includeArchived = false) => backendFor(token).workContents(groupId, includeArchived),
  createWorkContent: (token: string, groupId: number, payload: WorkContentPayload) => backendFor(token).createWorkContent(groupId, payload),
  updateWorkContent: (token: string, id: number, payload: WorkContentPatch) => backendFor(token).updateWorkContent(id, payload),
  reorderWorkContents: (token: string, groupId: number, ids: number[]) => backendFor(token).reorderWorkContents(groupId, ids),
  archiveWorkContent: (token: string, id: number) => backendFor(token).archiveWorkContent(id),
  restoreWorkContent: (token: string, id: number) => backendFor(token).restoreWorkContent(id),
  deleteWorkContent: (token: string, id: number) => backendFor(token).deleteWorkContent(id),
  resumeHighlights: (token: string, contentId: number, includeArchived = false) => backendFor(token).resumeHighlights(contentId, includeArchived),
  createResumeHighlight: (token: string, contentId: number, payload: ResumeHighlightPayload = {}) => backendFor(token).createResumeHighlight(contentId, payload),
  updateResumeHighlight: (token: string, id: number, payload: ResumeHighlightPatch) => backendFor(token).updateResumeHighlight(id, payload),
  copyResumeHighlight: (token: string, id: number) => backendFor(token).copyResumeHighlight(id),
  archiveResumeHighlight: (token: string, id: number) => backendFor(token).archiveResumeHighlight(id),
  restoreResumeHighlight: (token: string, id: number) => backendFor(token).restoreResumeHighlight(id),
  deleteResumeHighlight: (token: string, id: number) => backendFor(token).deleteResumeHighlight(id),
  resumePlans: (token: string, includeArchived = false) => backendFor(token).resumePlans(includeArchived),
  createResumePlan: (token: string, payload: ResumePlanPayload) => backendFor(token).createResumePlan(payload),
  resumePlan: (token: string, id: number) => backendFor(token).resumePlan(id),
  updateResumePlan: (token: string, id: number, payload: ResumePlanPatch) => backendFor(token).updateResumePlan(id, payload),
  archiveResumePlan: (token: string, id: number) => backendFor(token).archiveResumePlan(id),
  restoreResumePlan: (token: string, id: number) => backendFor(token).restoreResumePlan(id),
  deleteResumePlan: (token: string, id: number) => backendFor(token).deleteResumePlan(id),
  addPlanBlock: (token: string, planId: number, experienceGroupId: number) => backendFor(token).addPlanBlock(planId, experienceGroupId),
  updatePlanBlock: (token: string, planId: number, blockId: number, payload: { show_work_content_titles: boolean }) => backendFor(token).updatePlanBlock(planId, blockId, payload),
  removePlanBlock: (token: string, planId: number, blockId: number) => backendFor(token).removePlanBlock(planId, blockId),
  reorderPlanBlocks: (token: string, planId: number, blockIds: number[]) => backendFor(token).reorderPlanBlocks(planId, blockIds),
  addPlanItem: (token: string, planId: number, payload: { block_id: number; work_content_id: number; resume_description_id?: number }) => backendFor(token).addPlanItem(planId, payload),
  updatePlanItem: (token: string, planId: number, itemId: number, payload: { resume_description_id: number }) => backendFor(token).updatePlanItem(planId, itemId, payload),
  removePlanItem: (token: string, planId: number, itemId: number) => backendFor(token).removePlanItem(planId, itemId),
  reorderPlanItems: (token: string, planId: number, blockId: number, itemIds: number[]) => backendFor(token).reorderPlanItems(planId, blockId, itemIds),
  planCandidates: (token: string, planId: number) => backendFor(token).planCandidates(planId),
  planDocument: (token: string, planId: number) => backendFor(token).planDocument(planId),
  planArchives: (token: string, planId: number) => backendFor(token).planArchives(planId),
  restorePlanArchive: (token: string, planId: number, archiveId: number) => backendFor(token).restorePlanArchive(planId, archiveId),
  /** Fork（界面称「复制简历方案」）：只复制引用，不复制内容与历史 */
  forkResumePlan: (token: string, id: number) => backendFor(token).forkResumePlan(id)
}
