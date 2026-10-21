import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { api, AuthResponse } from './api'
import { AuthPage } from './features/AuthPage'
import { WorkbenchShell } from './features/WorkbenchShell'
import { GUEST_SESSION, isGuestSession, type Session } from './session'

const SESSION_KEY = 'resume-session'

function storedSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session> | null
    if (!parsed || typeof parsed.token !== 'string' || !parsed.user?.email) return null
    return { token: parsed.token, user: { id: parsed.user.id ?? 0, email: parsed.user.email } }
  } catch {
    return null
  }
}

export function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  const persist = (next: Session | null) => {
    setSession(next)
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  }
  const authenticated = (response: AuthResponse) => {
    persist(response)
    setIsAuthOpen(false)
  }

  useEffect(() => {
    if (!session || isGuestSession(session)) return
    api.me(session.token).catch(() => persist(null))
  }, [])

  const requestAuth = () => setIsAuthOpen(true)

  const signOut = () => {
    persist(null)
    setIsAuthOpen(false)
  }

  let content
  if (session) {
    // 切换登录态时整壳重挂，避免把上一个身份的对象带进当前视角
    content = <WorkbenchShell key={session.token} session={session} onLogout={signOut} onRequestAuth={requestAuth} />
  } else if (isAuthOpen) {
    content = <AuthPage onAuthenticated={authenticated} onContinueAsGuest={() => setIsAuthOpen(false)} />
  } else {
    content = <WorkbenchShell key={GUEST_SESSION.token} session={GUEST_SESSION} onRequestAuth={requestAuth} />
  }

  return (
    /* 跟随系统的「减少动态效果」设置 */
    <MotionConfig reducedMotion="user">{content}</MotionConfig>
  )
}
