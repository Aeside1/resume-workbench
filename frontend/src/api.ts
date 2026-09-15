export type AuthResponse = { token: string; user: { id: number; email: string } }
export type ExperienceGroup = { id: number; user_id?: number; name: string; type: 'internship' | 'project'; organization: string | null; start_date: string | null; end_date: string | null; description: string | null; archived: boolean; created_at: string; updated_at: string }
export type WorkContent = { id: number; experience_group_id: number; title: string; detailed_record: string | null; technical_materials: string | null; result_data: string | null; supplementary_notes: string | null; position: number; archived: boolean; created_at: string; updated_at: string }

/**
 * 简历亮点（术语见 CONTEXT.md）：具体工作内容下的一种可直接放进简历的写法。
 * 代码标识符沿用 ResumeDescription，界面与文档统一叫「简历亮点」。
 */
export type ResumeHighlight = { id: number; work_content_id: number; label: string; content: string; position: number; archived: boolean; created_at: string; updated_at: string }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail ?? '请求失败，请稍后重试')
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
}

