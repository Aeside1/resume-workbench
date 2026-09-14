import { useCallback, useRef, useState } from 'react'
import { Button, Card, Kbd } from '@heroui/react'
import { ArrowRight, FileText, LayoutGrid, Layers, PanelRight, PanelRightClose } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ExperienceGroup } from '../api'
import type { Session } from '../session'
import { AppShell, isFocusMode, type AppShellMode, type FocusBreadcrumbLevel } from './AppShell'
import { ExperienceHubPanel } from './hub/ExperienceHubPanel'
import { FocusCanvasContainer, type ZenTopbarState } from './canvas/FocusCanvasContainer'
import type { SaveStatus } from './useTransientSaveStatus'
import { ToastProvider } from '../components/ui/Toast'

type Props = { session: Session; onLogout: () => void }
type View = 'dashboard' | 'experiences' | 'plans'

export function WorkbenchShell({ session, onLogout }: Props) {
  const [view, setView] = useState<View>('experiences')
  const [mode, setMode] = useState<AppShellMode>('hub')
  const [activeExperience, setActiveExperience] = useState<ExperienceGroup | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isCanvasDirty, setIsCanvasDirty] = useState(false)
  // Zen 展开后顶栏归 AppShell 所有（ADR 004 §2.2/§2.4）：
  // 工作项实时标题、伴随栏开合、关闭命令（计数下行）均由外壳持有。
  const [zen, setZen] = useState<ZenTopbarState>({ isOpen: false, title: '' })
  const [isCompanionOpen, setIsCompanionOpen] = useState(true)
  const [zenExitSignal, setZenExitSignal] = useState(0)

  // 脏判据修正（issue 12 D1）：所有离开路径都要读「当前」值，而 setState 是异步的，
  // 因此同时写入 ref，避免用陈旧闭包值误弹「放弃修改」确认框。
  const canvasDirtyRef = useRef(false)
  const updateCanvasDirty = useCallback((dirty: boolean) => {
    canvasDirtyRef.current = dirty
    setIsCanvasDirty(dirty)
  }, [])

  const resetZenState = useCallback(() => {
    setZen({ isOpen: false, title: '' })
    updateCanvasDirty(false)
  }, [updateCanvasDirty])

  const handleSelectExperience = (group: ExperienceGroup) => {
    setActiveExperience(group)
    setMode('focus-canvas')
    updateCanvasDirty(false)
  }

  const handleExitFocus = () => {
    if (canvasDirtyRef.current) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并退出吗？')
      if (!confirmed) return
    }
    setMode('hub')
    setActiveExperience(null)
    resetZenState()
  }

  const handleNavClick = (nextView: View) => {
    if (canvasDirtyRef.current) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并离开吗？')
      if (!confirmed) return
    }
    setView(nextView)
    setMode('hub')
    setActiveExperience(null)
    resetZenState()
  }

  // FocusCanvasContainer 上报 Zen 展开状态与（就地编辑中的）工作项实时标题
  const handleZenChange = useCallback(({ isOpen, title }: ZenTopbarState) => {
    setZen({ isOpen, title })
    if (isOpen) setIsCompanionOpen(true)
  }, [])

  // 面包屑中间级 / 顶栏返回按钮 = 从 Zen 回到画布。
  // 关闭命令下发给 Zen 自身（与 Esc 同一条 handleExit 路径，先 flush 再关），
  // 而不是由外壳直接卸载，否则会绕过 flush 保存（ADR 004 §2.4）。
  const handleBackToCanvas = useCallback(() => setZenExitSignal((n) => n + 1), [])

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

  const isZen = mode === 'focus-canvas' && zen.isOpen
  const isFocus = isFocusMode(mode)
  const shellMode: AppShellMode = mode === 'hub' ? 'hub' : isZen ? 'focus-zen' : 'focus-canvas'

  // 三级面包屑：经历内容 / <分组名> / <工作项标题>；末级不可点且随大标题实时更新。
  const breadcrumbTrail: FocusBreadcrumbLevel[] = activeExperience
    ? [
        { label: '经历内容', onPress: handleExitFocus },
        {
          label: activeExperience.name,
          onPress: isZen ? handleBackToCanvas : undefined
        },
        ...(isZen ? [{ label: zen.title.trim() || '未命名工作项' }] : [])
      ]
    : [{ label: '经历内容' }]

  const focusActions = isZen ? (
    <>
      <span className="focus-esc-hint">
        <Kbd>Esc</Kbd>
        <span>退出专注</span>
      </span>
      <Button
        size="sm"
        variant={isCompanionOpen ? 'secondary' : 'ghost'}
        aria-label={isCompanionOpen ? '收起伴随栏' : '展开伴随栏'}
        onPress={() => setIsCompanionOpen((prev) => !prev)}
      >
        {isCompanionOpen
          ? <PanelRightClose size={14} aria-hidden="true" />
          : <PanelRight size={14} aria-hidden="true" />}
        <span>{isCompanionOpen ? '收起伴随栏' : '展开伴随栏'}</span>
      </Button>
    </>
  ) : undefined

  return (
    <ToastProvider>
      <AppShell
        session={session}
        onLogout={onLogout}
        navigationButtons={navigationButtons}
        mode={shellMode}
        breadcrumbTrail={breadcrumbTrail}
        focusActions={focusActions}
        backLabel={isZen ? '返回画布' : '返回经历内容'}
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
                onDirtyChange={updateCanvasDirty}
                onUpdateGroup={setActiveExperience}
                onZenChange={handleZenChange}
                isCompanionOpen={isCompanionOpen}
                zenExitSignal={zenExitSignal}
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
                      className="dashboard-entry"
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
