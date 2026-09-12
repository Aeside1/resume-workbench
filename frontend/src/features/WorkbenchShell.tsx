import { useState } from 'react'
import { Button, Card } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ExperienceGroup } from '../api'
import type { Session } from '../session'
import { AppShell, AppShellMode } from './AppShell'
import { ExperienceHubPanel } from './hub/ExperienceHubPanel'
import { FocusCanvasContainer } from './canvas/FocusCanvasContainer'

type Props = { session: Session; onLogout: () => void }
type View = 'dashboard' | 'experiences' | 'plans'

export function WorkbenchShell({ session, onLogout }: Props) {
  const [view, setView] = useState<View>('experiences')
  const [mode, setMode] = useState<AppShellMode>('hub')
  const [activeExperience, setActiveExperience] = useState<ExperienceGroup | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isCanvasDirty, setIsCanvasDirty] = useState(false)

  const handleSelectExperience = (group: ExperienceGroup) => {
    setActiveExperience(group)
    setMode('focus-canvas')
    setIsCanvasDirty(false)
  }

  const handleExitFocus = () => {
    if (isCanvasDirty) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并退出吗？')
      if (!confirmed) return
    }
    setMode('hub')
    setActiveExperience(null)
    setIsCanvasDirty(false)
  }

  const handleNavClick = (nextView: View) => {
    if (isCanvasDirty) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并离开吗？')
      if (!confirmed) return
    }
    setView(nextView)
    setMode('hub')
    setActiveExperience(null)
    setIsCanvasDirty(false)
  }

  const navigationButtons = (
    <>
      <Button
        variant="ghost"
        onPress={() => handleNavClick('dashboard')}
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
        onPress={() => handleNavClick('experiences')}
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
        onPress={() => handleNavClick('plans')}
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

  const isFocus = mode === 'focus-canvas' || mode === 'focus'

  return (
    <AppShell
      session={session}
      onLogout={onLogout}
      navigationButtons={navigationButtons}
      mode={mode}
      breadcrumb={activeExperience ? `经历内容 / ${activeExperience.name}` : '经历内容'}
      onExitFocus={handleExitFocus}
      saveStatus={saveStatus}
    >
      <motion.div
        key={
          view === 'experiences'
            ? isFocus && activeExperience
              ? `focus-${activeExperience.id}`
              : 'hub-experiences'
            : view
        }
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="workbench-view-container"
      >
        {view === 'experiences' && (
          isFocus && activeExperience ? (
            <FocusCanvasContainer
              session={session}
              group={activeExperience}
              onExitFocus={handleExitFocus}
              onSaveStatusChange={setSaveStatus}
              onDirtyChange={setIsCanvasDirty}
              onUpdateGroup={setActiveExperience}
            />
          ) : (
            <ExperienceHubPanel
              session={session}
              onSelectExperience={handleSelectExperience}
            />
          )
        )}

        {view === 'dashboard' && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">个人职业工作台</p>
                <h2 className="workbench-title">{session.user.email}</h2>
              </div>
              <p className="page-context">查看最近编辑的内容</p>
            </div>
            <Card className="dashboard-empty">
              <Card.Header>
                <Card.Title>继续整理你的职业经历</Card.Title>
                <Card.Description>从经历内容开始，沉淀可复用的具体工作内容。</Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="dashboard-grid">
                  <button className="dashboard-entry" onClick={() => handleNavClick('experiences')}>
                    <span className="entry-kicker">内容资产</span>
                    <strong>经历内容</strong>
                    <p>创建实习或项目经历，记录工作贡献。</p>
                    <span className="entry-action">进入经历内容 →</span>
                  </button>
                  <button className="dashboard-entry muted-entry" onClick={() => handleNavClick('plans')}>
                    <span className="entry-kicker">组合输出</span>
                    <strong>简历方案</strong>
                    <p>后续可按目标岗位组合简历描述。</p>
                    <span className="entry-action">即将开始</span>
                  </button>
                </div>
              </Card.Content>
            </Card>
          </>
        )}

        {view === 'plans' && (
          <Card className="dashboard-empty">
            <Card.Header>
              <Card.Title>简历方案</Card.Title>
              <Card.Description>简历方案将在经历描述模块完成后开放。</Card.Description>
            </Card.Header>
          </Card>
        )}
      </motion.div>
    </AppShell>
  )
}
