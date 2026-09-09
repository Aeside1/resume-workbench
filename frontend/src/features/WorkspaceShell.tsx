import { FormEvent, useState } from 'react'
import { Button, Card, Input, Label, ListBox, ListBoxItem, Select } from '@heroui/react'
import { api, Workspace } from '../api'
import type { Session } from '../session'

type Props = { session: Session; onSessionChange: (session: Session | null) => void }

export function WorkspaceShell({ session, onSessionChange }: Props) {
  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
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
    <header><div><h1>工作台</h1></div><div className="header-actions"><span>{session.user.email}</span><Button variant="secondary" onPress={signOut}>退出</Button></div></header>
    <section className="workspace-bar">
      <div className="field workspace-select"><Label htmlFor="workspace-select">当前工作区</Label><Select id="workspace-select" aria-label="当前工作区" selectedKey={String(current?.id)} onSelectionChange={key => { const workspace = session.workspaces.find(w => String(w.id) === String(key)); if (workspace) switchWorkspace(workspace) }}><Select.Trigger className="workspace-trigger"><Select.Value /><Select.Indicator className="workspace-chevron" /></Select.Trigger><Select.Popover className="workspace-popover"><ListBox className="workspace-options" items={session.workspaces}>{item => <ListBoxItem className="workspace-option" id={String(item.id)} textValue={item.name}><span className="workspace-option-label">{item.name}</span><span className="workspace-option-check" aria-hidden="true">✓</span></ListBoxItem>}</ListBox></Select.Popover></Select></div>
      <form onSubmit={createWorkspace} className="create-form"><div className="field"><Label htmlFor="new-workspace">新工作区名称</Label><Input id="new-workspace" placeholder="新工作区名称" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} /></div><Button className="create-workspace-button" type="submit" variant="primary" isDisabled={busy}>新建工作区</Button></form>
    </section>
    {error && <p className="error">{error}</p>}
    <Card className="empty-state"><Card.Header><Card.Title>{current?.name}</Card.Title><Card.Description>这是你的基础工作台。接下来可以创建经历分组，逐步沉淀具体工作内容。</Card.Description></Card.Header><Card.Content><div className="entry-grid"><Card variant="secondary"><Card.Content><span>经历分组</span><strong>即将开始</strong><p>整理实习或项目经历</p></Card.Content></Card><Card variant="secondary"><Card.Content><span>简历方案</span><strong>即将开始</strong><p>组合目标岗位的内容</p></Card.Content></Card></div></Card.Content></Card>
  </main>
}
