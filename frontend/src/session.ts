export type SessionUser = { id: number; email: string }

/** 会话：token + 展示身份 */
export type Session = { token: string; user: SessionUser }

/** 游客令牌：`api` 见到它改用只读示例数据源，不会发往服务端 */
export const GUEST_TOKEN = 'guest-local-draft'

/** 游客展示身份：只用于外壳文案与门禁，不是服务端用户 */
export const GUEST_SESSION: Session = { token: GUEST_TOKEN, user: { id: 0, email: '游客模式' } }

export function isGuestToken(token: string): boolean {
  return token === GUEST_TOKEN
}

export function isGuestSession(session: Session): boolean {
  return isGuestToken(session.token)
}
