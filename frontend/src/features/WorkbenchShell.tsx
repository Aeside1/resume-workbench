import { useState } from 'react'
import { Button, Card } from '@heroui/react'
import { ArrowRight, FileText, LayoutGrid, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ExperienceGroup } from '../api'
import type { Session } from '../session'
import { AppShell, AppShellMode } from './AppShell'
import { ExperienceHubPanel } from './hub/ExperienceHubPanel'
import { FocusCanvasContainer } from './canvas/FocusCanvasContainer'
import { ToastProvider } from '../components/ui/Toast'

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
        variant={view === 'dashboard' ? 'secondary' : 'ghost'}
        fullWidth
        onPress={() => handleNavClick('dashboard')}
      >
        <LayoutGrid size={18} aria-hidden="true" />
        <span>工作台概览</span>
      </Button>
      <Button
        variant={view === 'experiences' ? 'secondary' : 'ghost'}
        fullWidth
        onPress={() => handleNavClick('experiences')}
      >
        <Layers size={18} aria-hidden="true" />
        <span>经历内容</span>
      </Button>
      <Button
        variant={view === 'plans' ? 'secondary' : 'ghost'}
        fullWidth
        onPress={() => handleNavClick('plans')}
      >
        <FileText size={18} aria-hidden="true" />
        <span>简历方案</span>
      </Button>
    </>
  )

  const isFocus = mode === 'focus-canvas' || mode === 'focus'

  return (
    <ToastProvider>
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
              <Card>
                <Card.Header>
                  <Card.Title>继续整理你的职业经历</Card.Title>
                  <Card.Description>从经历内容开始，沉淀可复用的具体工作内容。</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="dashboard-grid">
                    <Button
                      variant="secondary"
                      className="dashboard-entry"
                      onPress={() => handleNavClick('experiences')}
                    >
                      <span className="entry-kicker">内容资产</span>
                      <strong>经历内容</strong>
                      <span className="entry-copy">创建实习或项目经历，记录工作贡献。</span>
                      <span className="entry-action">
                        进入经历内容
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </Button>
                    <Button
                      variant="tertiary"
                      className="dashboard-entry dashboard-entry--muted"
                      onPress={() => handleNavClick('plans')}
                    >
                      <span className="entry-kicker">组合输出</span>
                      <strong>简历方案</strong>
                      <span className="entry-copy">后续可按目标岗位组合简历描述。</span>
                      <span className="entry-action">即将开始</span>
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            </>
          )}

          {view === 'plans' && (
            <Card>
              <Card.Header>
                <Card.Title>简历方案</Card.Title>
                <Card.Description>简历方案将在经历描述模块完成后开放。</Card.Description>
              </Card.Header>
            </Card>
          )}
        </motion.div>
      </AppShell>
    </ToastProvider>
  )
}
