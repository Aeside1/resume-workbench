export type SessionUser = { id: number; email: string }

/** 前端持有的会话：已登录时是服务端签发的令牌，游客态是本地令牌（见 ADR 008） */
export type Session = { token: string; user: SessionUser }

/**
 * 游客态的本地令牌。
 *
 * 它不会被发送到服务端：`api` 见到它就改用浏览器本地草稿后端（ADR 008 §2.5）。
 * 之所以复用 `Session` 形状，是为了让画布 / 抽屉 / 列表等既有工作面拿到同一套签名，
 * 不必为游客态复制一份组件。
 */
export const GUEST_TOKEN = 'guest-local-draft'

/** 游客工作台的展示身份：不是 User，也没有 user_id，只用于外壳层的文案与门禁 */
export const GUEST_SESSION: Session = { token: GUEST_TOKEN, user: { id: 0, email: '游客模式' } }

export function isGuestToken(token: string): boolean {
  return token === GUEST_TOKEN
}

export function isGuestSession(session: Session): boolean {
  return isGuestToken(session.token)
}
