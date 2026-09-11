import { FormEvent, useState } from 'react'
import { Button, Card, Input, Label, ListBox, ListBoxItem, Select } from '@heroui/react'
import { api, Workspace } from '../api'
import type { Session } from '../session'
import { ExperienceGroupsPanel } from './ExperienceGroupsPanel'

type Props = { session: Session; onSessionChange: (session: Session | null) => void }
type View = 'dashboard' | 'experiences' | 'plans'

export function WorkspaceShell({ session, onSessionChange }: Props) {
  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('experiences')
  const current = session.workspaces.find(w => w.id === session.selectedWorkspaceId) ?? session.workspaces[0]

  const createWorkspace = async (event: FormEvent) => {
    event.preventDefault()
    if (!workspaceName.trim()) return
    setBusy(true)
    try {
      const workspace = await api.createWorkspace(session.token, workspaceName.trim())
      onSessionChange({ ...session, workspaces: [...session.workspaces, workspace], selectedWorkspaceId: workspace.id })
      setWorkspaceName('')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const switchWorkspace = (workspace: Workspace) => onSessionChange({ ...session, selectedWorkspaceId: workspace.id })
  const signOut = async () => { await api.logout(session.token).catch(() => undefined); onSessionChange(null) }

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">R</span><div><p className="eyebrow">CONTENT WORKBENCH</p><h1>简历工作台</h1></div></div><div className="header-actions"><span>{session.user.email}</span><Button variant="secondary" onPress={signOut}>退出</Button></div></header>
    <section className="workspace-bar"><div className="field workspace-select"><Label htmlFor="workspace-select">当前工作区</Label><Select id="workspace-select" aria-label="当前工作区" selectedKey={String(current?.id)} onSelectionChange={key => { const workspace = session.workspaces.find(w => String(w.id) === String(key)); if (workspace) switchWorkspace(workspace) }}><Select.Trigger className="workspace-trigger"><Select.Value /><Select.Indicator className="workspace-chevron" /></Select.Trigger><Select.Popover className="workspace-popover"><ListBox className="workspace-options" items={session.workspaces}>{item => <ListBoxItem className="workspace-option" id={String(item.id)} textValue={item.name}><span className="workspace-option-label">{item.name}</span><span className="workspace-option-check" aria-hidden="true">✓</span></ListBoxItem>}</ListBox></Select.Popover></Select></div><form onSubmit={createWorkspace} className="create-form"><div className="field"><Label htmlFor="new-workspace">新工作区名称</Label><Input id="new-workspace" placeholder="新工作区名称" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} /></div><Button className="create-workspace-button" type="submit" variant="primary" isDisabled={busy}>新建工作区</Button></form></section>
    {error && <p className="error">{error}</p>}
    <div className="app-layout"><aside className="app-sidebar"><nav aria-label="模块导航" className="module-nav"><p className="nav-label">内容管理</p><Button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} variant="ghost" onPress={() => setView('dashboard')}>工作台</Button><Button className={`nav-item ${view === 'experiences' ? 'active' : ''}`} variant="ghost" onPress={() => setView('experiences')}>经历内容</Button><Button className={`nav-item ${view === 'plans' ? 'active' : ''}`} variant="ghost" onPress={() => setView('plans')}>简历方案<span className="nav-hint">即将开始</span></Button></nav></aside><section className="app-main"><div className="page-heading"><div><p className="eyebrow">当前工作区</p><h2 className="workspace-title">{current?.name}</h2></div><p className="page-context">{view === 'dashboard' ? '查看最近编辑的内容' : view === 'experiences' ? '管理经历分组与具体工作内容' : '组合目标岗位的简历内容'}</p></div>{view === 'experiences' && <ExperienceGroupsPanel session={session} />}{view === 'dashboard' && <Card className="dashboard-empty"><Card.Header><Card.Title>继续整理你的职业经历</Card.Title><Card.Description>从经历内容开始，沉淀可复用的具体工作内容。</Card.Description></Card.Header><Card.Content><div className="dashboard-grid"><button className="dashboard-entry" onClick={() => setView('experiences')}><span className="entry-kicker">内容资产</span><strong>经历内容</strong><p>创建实习或项目经历，记录工作贡献。</p><span className="entry-action">进入经历内容 →</span></button><button className="dashboard-entry muted-entry" onClick={() => setView('plans')}><span className="entry-kicker">组合输出</span><strong>简历方案</strong><p>后续可按目标岗位组合简历描述。</p><span className="entry-action">即将开始</span></button></div></Card.Content></Card>}{view === 'plans' && <Card className="dashboard-empty"><Card.Header><Card.Title>简历方案</Card.Title><Card.Description>简历方案将在经历描述模块完成后开放。</Card.Description></Card.Header></Card>}</section></div>
  </main>
}
