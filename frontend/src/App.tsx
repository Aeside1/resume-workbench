import { useEffect, useState } from 'react'
import { api, AuthResponse } from './api'
import { AuthPage } from './features/AuthPage'
import { WorkspaceShell } from './features/WorkspaceShell'
import type { Session } from './session'

export function App() {
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem('resume-session') ?? 'null'))
  const persist = (next: Session | null) => {
    setSession(next)
    if (next) localStorage.setItem('resume-session', JSON.stringify(next))
    else localStorage.removeItem('resume-session')
  }
  const authenticated = (response: AuthResponse) => {
    persist({ ...response, selectedWorkspaceId: response.workspaces[0].id })
  }
  useEffect(() => {
    if (!session) return
    api.workspaces(session.token).then(workspaces => {
      if (workspaces.length) {
        const selectedWorkspaceId = workspaces.some(w => w.id === session.selectedWorkspaceId) ? session.selectedWorkspaceId : workspaces[0].id
        persist({ ...session, workspaces, selectedWorkspaceId })
      }
    }).catch(() => persist(null))
  }, [])
  return session ? <WorkspaceShell session={session} onSessionChange={persist} /> : <AuthPage onAuthenticated={authenticated} />
}
