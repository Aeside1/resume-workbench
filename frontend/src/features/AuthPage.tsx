import { FormEvent, useState } from 'react'
import { Button, Card, Chip, Input, Label } from '@heroui/react'
import { ChevronDown, FileText, FolderKanban, ListChecks, NotebookPen, ShieldCheck, Sparkles } from 'lucide-react'
import { api, AuthResponse } from '../api'

type Props = { onAuthenticated: (response: AuthResponse) => void }

/**
 * 左栏介绍区的「使用路径」。
 *
 * 四步沿用 `docs/CONTEXT.md` 的领域术语（经历分组 → 具体工作内容 → 简历亮点 → 简历方案）：
 * 未注册用户落地时先看到这条链路，才知道这个工具沉淀的是「内容」而不是排版模板。
 */
const introSteps = [
  {
    icon: FolderKanban,
    title: '建立经历分组',
    detail: '一段实习或一个项目，写下组织、时间范围与整体背景。'
  },
  {
    icon: ListChecks,
    title: '沉淀具体工作内容',
    detail: '把一项项具体贡献记进长画布：详细记录、技术材料、结果数据。'
  },
  {
    icon: Sparkles,
    title: '维护多条简历亮点',
    detail: '同一项工作可保留多条写法：技术细节、结果强调、极简表达。'
  },
  {
    icon: FileText,
    title: '组合成简历方案',
    detail: '按岗位挑选亮点、调整顺序，装配成通用 Markdown 文稿。'
  }
]

export function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = mode === 'login' ? await api.login(email, password) : await api.register(email, password)
      onAuthenticated(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <div className="auth-brand">
            <span className="auth-icon-tile" aria-hidden="true">
              <NotebookPen size={20} />
            </span>
            <span className="auth-brand-name">简历工作台</span>
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>v0.1 预览版</Chip.Label>
            </Chip>
          </div>

          <div className="auth-intro-copy">
            <h1 className="auth-intro-title" id="auth-intro-title">
              先沉淀经历，
              <br />
              再组装简历。
            </h1>
            <p className="auth-intro-lede">
              {/* 两个整句各自成行：CJK 逐字断行不受控，交给浏览器折行会断在词中间 */}
              <span>这里保存的不是排版模板，而是你长期积累的工作内容。</span>
              <span>同一件事留下多种简历写法，投不同岗位时挑一条即可。</span>
            </p>
          </div>

          <Card className="auth-flow-panel">
            <h2 className="auth-flow-title">你会这样用它</h2>
            <ol className="auth-flow">
              {introSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <li className="auth-flow-step" key={step.title}>
                    <span className="auth-icon-tile" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div className="auth-flow-text">
                      <span className="auth-flow-step-title">{step.title}</span>
                      <span className="auth-flow-step-detail">{step.detail}</span>
                    </div>
                    {index < introSteps.length - 1 && (
                      <span className="auth-flow-link" aria-hidden="true">
                        <ChevronDown size={14} />
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </Card>

          <p className="auth-intro-note">
            <ShieldCheck className="auth-intro-note-icon" size={16} aria-hidden="true" />
            <span>账号即工作台：经历资产与简历方案仅你可见。</span>
          </p>
        </section>

        <section className="auth-form-side" aria-labelledby="auth-form-title">
          <Card className="auth-card">
            <Card.Header>
              <Card.Title id="auth-form-title">{isLogin ? '登录工作台' : '创建你的工作台'}</Card.Title>
              <Card.Description className="auth-card-description">
                {isLogin ? '登录后回到你的经历资产与简历方案。' : '注册后即可开始记录第一段经历，无需其他配置。'}
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <form onSubmit={submit}>
                <div className="field">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" variant="primary" isDisabled={busy}>
                  {busy ? '处理中…' : isLogin ? '登录' : '注册'}
                </Button>
              </form>
            </Card.Content>
            <Card.Footer>
              <Button
                variant="ghost"
                onPress={() => {
                  setMode(isLogin ? 'register' : 'login')
                  setError('')
                }}
              >
                {isLogin ? '还没有账号？注册' : '已有账号？登录'}
              </Button>
            </Card.Footer>
          </Card>
        </section>
      </div>
    </main>
  )
}
