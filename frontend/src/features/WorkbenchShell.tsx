import { useState } from 'react'
import { Button, Card } from '@heroui/react'
import type { Session } from '../session'
import { ExperienceGroupsPanel } from './ExperienceGroupsPanel'
import { AppShell } from './AppShell'

type Props = { session: Session; onSessionChange: (session: Session | null) => void }
type View = 'dashboard' | 'experiences' | 'plans'

export function WorkbenchShell({ session, onSessionChange }: Props) {
  const [view, setView] = useState<View>('experiences')

  const signOut = async () => { onSessionChange(null) }

  const navigationButtons = (
    <>
      <Button
        variant="ghost"
        onPress={() => setView('dashboard')}
        className={`sidebar-nav-item ${view === 'dashboard' ? 'active' : ''}`}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
        <span>工作台概览</span>
      </Button>
      <Button
        variant="ghost"
        onPress={() => setView('experiences')}
        className={`sidebar-nav-item ${view === 'experiences' ? 'active' : ''}`}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span>经历内容</span>
      </Button>
      <Button
        variant="ghost"
        onPress={() => setView('plans')}
        className={`sidebar-nav-item ${view === 'plans' ? 'active' : ''}`}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
        <span>简历方案</span>
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
          <p className="eyebrow">个人职业工作台</p>
          <h2 className="workbench-title workspace-title">{session.user.email}</h2>
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

export { WorkbenchShell as WorkspaceShell }
