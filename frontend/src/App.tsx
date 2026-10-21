import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { api, AuthResponse } from './api'
import { AuthPage } from './features/AuthPage'
import { WorkbenchShell } from './features/WorkbenchShell'
import { GUEST_SESSION, isGuestSession, type Session } from './session'

const SESSION_KEY = 'resume-session'

/** 读取已登录会话：坏数据当作未登录，避免一次写坏的 localStorage 卡死入口 */
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
  /** 认证页是按需路由（ADR 008 §2.1）：默认落地态是游客工作台 */
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
    // 游客态的令牌不是服务端签发的，不该拿它去问 /api/auth/me
    if (!session || isGuestSession(session)) return
    api.me(session.token).catch(() => persist(null))
  }, [])

  const requestAuth = () => setIsAuthOpen(true)

  // 退出登录回到游客工作台，而不是回到登录页（ADR 008 §2.1）
  const signOut = () => {
    persist(null)
    setIsAuthOpen(false)
  }

  let content
  if (session) {
    // key 挂会话令牌：登录 / 退出时整壳重挂，避免把一个身份的工作台状态（当前展开的分组、画布里的对象）
    // 带进另一个身份——游客态尤其不能读到账号里的对象（ADR 008 §2.4）。
    content = <WorkbenchShell key={session.token} session={session} onLogout={signOut} onRequestAuth={requestAuth} />
  } else if (isAuthOpen) {
    content = <AuthPage onAuthenticated={authenticated} onContinueAsGuest={() => setIsAuthOpen(false)} />
  } else {
    content = <WorkbenchShell key={GUEST_SESSION.token} session={GUEST_SESSION} onRequestAuth={requestAuth} />
  }

  return (
    /* reducedMotion="user"：系统开了「减少动态效果」时全局跳过 transform / layout 类动效。
       注：它不管 width 这类值（如伴随栏滑入），那类地方由 usePrefersReducedMotion 显式降级（04m）。 */
    <MotionConfig reducedMotion="user">{content}</MotionConfig>
  )
}
