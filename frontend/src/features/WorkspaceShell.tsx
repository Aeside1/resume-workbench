import { useState } from 'react'
import { Button, Card } from '@heroui/react'
import type { Session } from '../session'
import { ExperienceGroupsPanel } from './ExperienceGroupsPanel'
import { AppShell } from './AppShell'

type Props = { session: Session; onSessionChange: (session: Session | null) => void }
type View = 'dashboard' | 'experiences' | 'plans'

export function WorkspaceShell({ session, onSessionChange }: Props) {
  const [view, setView] = useState<View>('experiences')
  const current = session.workspaces.find(w => w.id === session.selectedWorkspaceId) ?? session.workspaces[0]

  const signOut = async () => { onSessionChange(null) }

  const navigationButtons = (
    <>
      <Button
        variant="ghost"
        onPress={() => setView('dashboard')}
        className={view === 'dashboard' ? 'active' : ''}
      >
        工作台概览
      </Button>
      <Button
        variant="ghost"
        onPress={() => setView('experiences')}
        className={view === 'experiences' ? 'active' : ''}
      >
        经历内容
      </Button>
      <Button
        variant="ghost"
        onPress={() => setView('plans')}
        className={view === 'plans' ? 'active' : ''}
      >
        简历方案
      </Button>
    </>
  )

  return (
    <AppShell
      session={session}
      onSessionChange={onSessionChange}
      onLogout={signOut}
      navigationButtons={navigationButtons}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">当前工作区</p>
          <h2 className="workspace-title">{current?.name}</h2>
        </div>
        <p className="page-context">
          {view === 'dashboard' ? '查看最近编辑的内容' : view === 'experiences' ? '管理经历分组与具体工作内容' : '组合目标岗位的简历内容'}
        </p>
      </div>
      {view === 'experiences' && <ExperienceGroupsPanel session={session} />}
      {view === 'dashboard' && (
        <Card className="dashboard-empty">
          <Card.Header>
            <Card.Title>继续整理你的职业经历</Card.Title>
            <Card.Description>从经历内容开始，沉淀可复用的具体工作内容。</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="dashboard-grid">
              <button className="dashboard-entry" onClick={() => setView('experiences')}>
                <span className="entry-kicker">内容资产</span>
                <strong>经历内容</strong>
                <p>创建实习或项目经历，记录工作贡献。</p>
                <span className="entry-action">进入经历内容 →</span>
              </button>
              <button className="dashboard-entry muted-entry" onClick={() => setView('plans')}>
                <span className="entry-kicker">组合输出</span>
                <strong>简历方案</strong>
                <p>后续可按目标岗位组合简历描述。</p>
                <span className="entry-action">即将开始</span>
              </button>
            </div>
          </Card.Content>
        </Card>
      )}
      {view === 'plans' && (
        <Card className="dashboard-empty">
          <Card.Header>
            <Card.Title>简历方案</Card.Title>
            <Card.Description>简历方案将在经历描述模块完成后开放。</Card.Description>
          </Card.Header>
        </Card>
      )}
    </AppShell>
  )
}
