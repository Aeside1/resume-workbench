import { useEffect, useState } from 'react'
import { api, AuthResponse } from './api'
import { AuthPage } from './features/AuthPage'
import { WorkbenchShell } from './features/WorkbenchShell'
import type { Session } from './session'

export function App() {
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem('resume-session') ?? 'null'))
  const persist = (next: Session | null) => {
    setSession(next)
    if (next) localStorage.setItem('resume-session', JSON.stringify(next))
    else localStorage.removeItem('resume-session')
  }
  const authenticated = (response: AuthResponse) => {
    persist(response)
  }
  useEffect(() => {
    if (!session) return
    api.me(session.token).catch(() => persist(null))
  }, [])
  return session ? <WorkbenchShell session={session} onSessionChange={persist} /> : <AuthPage onAuthenticated={authenticated} />
}
