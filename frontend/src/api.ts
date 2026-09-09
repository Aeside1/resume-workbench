export type Workspace = { id: number; name: string; created_at: string; updated_at: string }
export type AuthResponse = { token: string; user: { id: number; email: string }; workspaces: Workspace[] }

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
  workspaces: (token: string) => request<Workspace[]>('/api/workspaces', {}, token),
  createWorkspace: (token: string, name: string) => request<Workspace>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, token),
}
