import { useCallback, useRef, useState } from 'react'
import { Button, Card, Kbd } from '@heroui/react'
import { ArrowRight, FileText, LayoutGrid, Layers, PanelRight, PanelRightClose } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ExperienceGroup, ResumePlan } from '../api'
import { isGuestSession, type Session } from '../session'
import { AppShell, type AppShellMode } from './AppShell'
import { FocusTopbar, type FocusBreadcrumbLevel } from './FocusTopbar'
import { GuestBanner } from './GuestBanner'
import { WorkAreaHeader } from './WorkAreaHeader'
import { ExperienceHubPanel } from './hub/ExperienceHubPanel'
import { GuestPlanGate } from './plans/GuestPlanGate'
import { PlanEditor } from './plans/PlanEditor'
import { PlanHubPanel } from './plans/PlanHubPanel'
import { FocusCanvasContainer, type ZenTopbarState } from './canvas/FocusCanvasContainer'
import type { SaveStatus } from './useTransientSaveStatus'
import { CONTENT_SETTLE_FROM, CONTENT_SETTLE_TO, CONTENT_SETTLE_TRANSITION } from './motion'
import { ToastProvider } from '../components/ui/Toast'

type Props = { session: Session; onLogout?: () => void; onRequestAuth?: () => void }
type View = 'dashboard' | 'experiences' | 'plans'
/** 侧栏折叠状态的持久化键（04h） */
const SIDEBAR_COLLAPSED_KEY = 'resume-sidebar-collapsed'

/** 内容区是否展开了某个对象（分组画布 / 简历方案编辑器）；外壳形态由它推导（04g） */
type WorkbenchStage = 'hub' | 'expanded'

export function WorkbenchShell({ session, onLogout, onRequestAuth }: Props) {
  const isGuest = isGuestSession(session)
  const [view, setView] = useState<View>('experiences')
  const [stage, setStage] = useState<WorkbenchStage>('hub')
  // 侧栏折叠：刷新后保持（04h）
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  )
  const [activeExperience, setActiveExperience] = useState<ExperienceGroup | null>(null)
  const [activePlan, setActivePlan] = useState<ResumePlan | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isCanvasDirty, setIsCanvasDirty] = useState(false)
  // 展开专注后页头由内容区自己渲染（FocusTopbar，04k）：
  // 工作项实时标题、伴随栏开合、关闭命令（计数下行）均由外壳持有。
  const [zen, setZen] = useState<ZenTopbarState>({ isOpen: false, title: '' })
  const [isCompanionOpen, setIsCompanionOpen] = useState(true)
  const [zenExitSignal, setZenExitSignal] = useState(0)
  // 退出动画进行中（04m）：页头跟着写作区一起淡出，动画结束由容器提交关闭
  const [isFocusExiting, setIsFocusExiting] = useState(false)
  // 「从关到开」那一次才重置伴随栏；否则标题每敲一个字都会调用 onZenChange
  // 并把用户刚收起的伴随栏重新展开。
  const zenOpenRef = useRef(false)

  // 脏判据修正（issue 12 D1）：所有离开路径都要读「当前」值，而 setState 是异步的，
  // 因此同时写入 ref，避免用陈旧闭包值误弹「放弃修改」确认框。
  const canvasDirtyRef = useRef(false)
  const updateCanvasDirty = useCallback((dirty: boolean) => {
    canvasDirtyRef.current = dirty
    setIsCanvasDirty(dirty)
  }, [])

  const resetZenState = useCallback(() => {
    setZen({ isOpen: false, title: '' })
    setIsFocusExiting(false)
    // 这两条离开路径直接卸载画布，不会下发 isOpen:false，所以开合跟踪要在这里显式归零，
    // 否则下次展开专注时伴随栏不会按「新会话」的约定重新展开。
    zenOpenRef.current = false
    updateCanvasDirty(false)
  }, [updateCanvasDirty])

  const handleSelectExperience = (group: ExperienceGroup) => {
    setActiveExperience(group)
    setStage('expanded')
    updateCanvasDirty(false)
  }

  const handleExitFocus = () => {
    if (canvasDirtyRef.current) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并退出吗？')
      if (!confirmed) return
    }
    setStage('hub')
    setActiveExperience(null)
    resetZenState()
  }

  // 简历方案编辑器同样进入专注场景（ADR 005 §2.5）：隐藏侧栏、顶栏换面包屑，
  // 让中间那一栏（简历编排主工作面）拿到全部宽度。方案的结构性变更即时落库，
  // 因此不需要「未保存就离开」的确认。
  const handleSelectPlan = (plan: ResumePlan) => {
    setActivePlan(plan)
    setStage('expanded')
    resetZenState()
  }

  const handleExitPlan = () => {
    setStage('hub')
    setActivePlan(null)
    resetZenState()
  }

  const handleNavClick = (nextView: View) => {
    if (canvasDirtyRef.current) {
      const confirmed = window.confirm('当前有未保存的工作内容编辑，确定要放弃修改并离开吗？')
      if (!confirmed) return
    }
    setView(nextView)
    setStage('hub')
    setActiveExperience(null)
    setActivePlan(null)
    resetZenState()
  }

  // FocusCanvasContainer 上报专注展开状态与（就地编辑中的）工作项实时标题
  const handleZenChange = useCallback(({ isOpen, title }: ZenTopbarState) => {
    if (isOpen && !zenOpenRef.current) setIsCompanionOpen(true)
    if (!isOpen) setIsFocusExiting(false)
    zenOpenRef.current = isOpen
    setZen({ isOpen, title })
  }, [])

  // 退出动画开始（容器上报）：页头与写作区一起淡出（04m）。
  // 直接离开画布的路径（面包屑第 1 级 / 侧栏导航）不触发它——那块交给外壳自己的视图切换动画。
  const handleZenCloseStart = useCallback(() => setIsFocusExiting(true), [])

  // 面包屑中间级 / 顶栏返回按钮 = 从 Zen 回到画布。
  // 关闭命令下发给 Zen 自身（与 Esc 同一条 handleExit 路径，先 flush 再关），
  // 而不是由外壳直接卸载，否则会绕过 flush 保存（ADR 004 §2.4）。
  const handleBackToCanvas = useCallback(() => setZenExitSignal((n) => n + 1), [])


  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const navigationButtons = (collapsed: boolean) => (
    <>
      {/* HeroUI Button 不接受 title，折叠态的悬停提示放在包裹层上 */}
      <div className="sidebar-nav-item" title={collapsed ? '工作台概览' : undefined}>
        <Button
          variant={view === 'dashboard' ? 'secondary' : 'ghost'}
          fullWidth
          isIconOnly={collapsed}
          aria-label="工作台概览"
          onPress={() => handleNavClick('dashboard')}
        >
          <LayoutGrid size={18} aria-hidden="true" />
          {!collapsed && <span>工作台概览</span>}
        </Button>
      </div>
      <div className="sidebar-nav-item" title={collapsed ? '经历内容' : undefined}>
        <Button
          variant={view === 'experiences' ? 'secondary' : 'ghost'}
          fullWidth
          isIconOnly={collapsed}
          aria-label="经历内容"
          onPress={() => handleNavClick('experiences')}
        >
          <Layers size={18} aria-hidden="true" />
          {!collapsed && <span>经历内容</span>}
        </Button>
      </div>
      <div className="sidebar-nav-item" title={collapsed ? '简历方案' : undefined}>
        <Button
          variant={view === 'plans' ? 'secondary' : 'ghost'}
          fullWidth
          isIconOnly={collapsed}
          aria-label="简历方案"
          onPress={() => handleNavClick('plans')}
        >
          <FileText size={18} aria-hidden="true" />
          {!collapsed && <span>简历方案</span>}
        </Button>
      </div>
    </>
  )

  const isFocusOpen = stage === 'expanded' && zen.isOpen
  // 画布 / 方案编辑器 / 展开专注都在壳内展开（侧栏常驻），页面里只有两种外壳形态（04k）
  const isWorkspaceOpen = stage === 'expanded'
  const shellMode: AppShellMode = stage === 'hub' ? 'hub' : 'workspace'

  // 专注页头（内容区自带）的面包屑：经历内容 / <分组名> / <工作项标题>；末级不可点且实时更新。
  const focusTrail: FocusBreadcrumbLevel[] = activeExperience
    ? [
        { label: '经历内容', onPress: handleExitFocus },
        { label: activeExperience.name, onPress: handleBackToCanvas },
        { label: zen.title.trim() || '未命名工作项' }
      ]
    : [{ label: '经历内容' }]

  const focusActions = isFocusOpen ? (
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
        onRequestAuth={onRequestAuth}
        navigationButtons={navigationButtons}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        mode={shellMode}
        isFocusOpen={isFocusOpen}
      >
        {isGuest && <GuestBanner onRequestAuth={onRequestAuth} />}
        <motion.div
          key={
            view === 'experiences'
              ? isWorkspaceOpen && activeExperience
                ? `canvas-${activeExperience.id}`
                : 'hub-experiences'
              : view === 'plans' && activePlan
                ? `plan-${activePlan.id}`
                : view
          }
          initial={CONTENT_SETTLE_FROM}
          animate={CONTENT_SETTLE_TO}
          transition={CONTENT_SETTLE_TRANSITION}
          className="workbench-view-container"
        >
          {view === 'experiences' && (
            isWorkspaceOpen && activeExperience ? (
              <>
                {/* 展开专注时页头换成专注页头（面包屑 + 保存态 + 场景动作），
                    与画布页头是「二选一」而不是叠加——一屏只有一条页头（04k） */}
                {isFocusOpen ? (
                  <FocusTopbar
                    trail={focusTrail}
                    backLabel="返回画布"
                    onBack={handleBackToCanvas}
                    saveStatus={saveStatus}
                    actions={focusActions}
                    isExiting={isFocusExiting}
                  />
                ) : (
                  <WorkAreaHeader
                    backLabel="返回经历内容"
                    onBack={handleExitFocus}
                    saveStatus={saveStatus}
                  />
                )}
                <FocusCanvasContainer
                  session={session}
                  group={activeExperience}
                  readOnly={isGuest}
                  onSaveStatusChange={setSaveStatus}
                  onDirtyChange={updateCanvasDirty}
                  onUpdateGroup={setActiveExperience}
                  onZenChange={handleZenChange}
                  isCompanionOpen={isCompanionOpen}
                  zenExitSignal={zenExitSignal}
                  onZenCloseStart={handleZenCloseStart}
                />
              </>
            ) : (
              <ExperienceHubPanel
                session={session}
                readOnly={isGuest}
                onSelectExperience={handleSelectExperience}
              />
            )
          )}

          {view === 'dashboard' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">个人职业工作台</p>
                  <h2 className="workbench-title">{isGuest ? '游客工作台' : session.user.email}</h2>
                </div>
                <p className="page-context">{isGuest ? '未登录 · 示例只读' : '查看最近编辑的内容'}</p>
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
                      <span className="entry-copy">后续可按目标岗位组合简历亮点。</span>
                      <span className="entry-action">即将开始</span>
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            </>
          )}

          {view === 'plans' && (
            isGuest ? (
              /* 游客态只给简历方案入口与登录引导 */
              <GuestPlanGate onRequestAuth={onRequestAuth} />
            ) : activePlan ? (
              <PlanEditor
                session={session}
                plan={activePlan}
                saveStatus={saveStatus}
                onSaveStatusChange={setSaveStatus}
                onExit={handleExitPlan}
              />
            ) : (
              <PlanHubPanel session={session} onSelectPlan={handleSelectPlan} />
            )
          )}
        </motion.div>
      </AppShell>
    </ToastProvider>
  )
}
