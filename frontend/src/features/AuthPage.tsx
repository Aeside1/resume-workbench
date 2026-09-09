import { FormEvent, useState } from 'react'
import { api, AuthResponse } from '../api'
import { Button, Card, Input, Label } from '@heroui/react'

type Props = { onAuthenticated: (response: AuthResponse) => void }

export function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const result = mode === 'login' ? await api.login(email, password) : await api.register(email, password); onAuthenticated(result) } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  return <main className="auth-page"><Card className="auth-card"><Card.Header><Card.Title>{mode === 'login' ? '登录工作台' : '创建你的工作台'}</Card.Title><Card.Description>按工作区隔离你的经历分组、简历方案和导出快照。</Card.Description></Card.Header><Card.Content><form onSubmit={submit}><div className="field"><Label htmlFor="email">邮箱</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div><div className="field"><Label htmlFor="password">密码</Label><Input id="password" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></div>{error && <p className="error">{error}</p>}<Button type="submit" variant="primary" isDisabled={busy}>{busy ? '处理中…' : mode === 'login' ? '登录' : '注册'}</Button></form></Card.Content><Card.Footer><Button className="link" variant="ghost" onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? '还没有账号？注册' : '已有账号？登录'}</Button></Card.Footer></Card></main>
}
