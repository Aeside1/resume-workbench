import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
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
  return (
    /* reducedMotion="user"：系统开了「减少动态效果」时全局跳过 transform / layout 类动效。
       注：它不管 width 这类值（如伴随栏滑入），那类地方由 usePrefersReducedMotion 显式降级（04m）。 */
    <MotionConfig reducedMotion="user">
      {session ? <WorkbenchShell session={session} onLogout={() => persist(null)} /> : <AuthPage onAuthenticated={authenticated} />}
    </MotionConfig>
  )
}
