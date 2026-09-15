import { ReactNode } from 'react'
import { Avatar, Breadcrumbs, Button, Card, Chip, IconChevronLeft, SuccessIcon } from '@heroui/react'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { Session } from '../session'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import type { SaveStatus } from './useTransientSaveStatus'

/**
 * 外壳形态（04g 收窄后）：
 * - `hub`：侧栏 + 内容区（工作台概览 / 经历内容列表 / 简历方案列表）
 * - `workspace`：侧栏 + 内容区，内容区里展开某一分组画布或某个简历方案编辑器
 * - `zen`：唯一的整屏接管（具体工作内容的「展开专注」），隐藏侧栏、顶栏换成面包屑
 */
export type AppShellMode = 'hub' | 'workspace' | 'zen'

/** 只有「展开专注」隐藏侧栏并整屏接管 */
export function isFocusMode(mode: AppShellMode): boolean {
  return mode === 'zen'
}

/**
 * 顶栏面包屑的一级（ADR 004 §2.2）。仅在 Zen 接管时出现。
 * 末级是当前位置（不可点），其余级由 `onPress` 决定去向。
 */
export type FocusBreadcrumbLevel = { label: string; onPress?: () => void }

type Props = {
  session: Session
  onLogout: () => void
  children: ReactNode
  mode?: AppShellMode
  /** Zen 接管时的多级面包屑；非 Zen 形态下由内容区自带的页头承担去向 */
  breadcrumbTrail?: FocusBreadcrumbLevel[]
  /** 顶栏右侧插槽：Zen 展开时放 Esc 提示与「收起伴随栏」 */
  focusActions?: ReactNode
  onExitFocus?: () => void
  /** 顶栏返回按钮的可访问名；Zen 下随语义变化（返回画布 / 返回经历内容） */
  backLabel?: string
  saveStatus?: SaveStatus
  navigationButtons?: ReactNode
  /** 侧栏折叠为图标态（04h）；状态由调用方持有并持久化 */
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function AppShell({
  session,
  onLogout,
  children,
  mode = 'hub',
  breadcrumbTrail,
  focusActions,
  onExitFocus,
  backLabel = '返回经历内容',
  saveStatus,
  navigationButtons,
  isSidebarCollapsed = false,
  onToggleSidebar
}: Props) {
  const isZen = mode === 'zen'
  // 侧边栏用户名片首字母（Zen 接管时侧栏隐藏，不渲染）
  const workspaceInitial = session.user.email.slice(0, 1).toUpperCase()

  // 返回按钮 = 面包屑的上一级：Zen 下回画布。
  // 末级永远不可点，因此上一级就是倒数第二级。
  const trail: FocusBreadcrumbLevel[] = breadcrumbTrail?.length
    ? breadcrumbTrail
    : [{ label: '经历内容' }]
  const parentLevel = trail.length > 1 ? trail[trail.length - 2] : undefined
  const handleBack = parentLevel?.onPress ?? (trail.length > 1 ? undefined : onExitFocus)

  const shellLayoutClass =
    mode === 'zen' ? 'app-shell--zen' : mode === 'workspace' ? 'app-shell--workspace' : 'app-shell--hub'
  const mainClass = mode === 'zen' ? 'app-main--zen' : mode === 'workspace' ? 'app-main--workspace' : 'app-main--hub'

  return (
    <div className={['app-shell', shellLayoutClass].filter(Boolean).join(' ')}>
      {!isZen && (
        <aside
          role="complementary"
          aria-label="主导航"
          className={['app-sidebar', isSidebarCollapsed ? 'app-sidebar--collapsed' : ''].filter(Boolean).join(' ')}
        >
          <div className="sidebar-header">
            <div className="sidebar-header-row">
              <Card variant="secondary" className="sidebar-user-card">
                <Card.Content className="sidebar-user-content" title={session.user.email}>
                  <Avatar size="sm" variant="soft" color="default">
                    <Avatar.Fallback>{workspaceInitial}</Avatar.Fallback>
                  </Avatar>
                  {/* 折叠时只留头像：文本不渲染（而不是被隐藏），保证可访问名不依赖被藏文本 */}
                  {!isSidebarCollapsed && (
                    <div className="user-card-info">
                      <span className="user-title">个人职业工作台</span>
                      <span className="user-email">{session.user.email}</span>
                    </div>
                  )}
                </Card.Content>
              </Card>

              {onToggleSidebar && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
                  onPress={onToggleSidebar}
                >
                  {isSidebarCollapsed
                    ? <PanelLeftOpen size={16} aria-hidden="true" />
                    : <PanelLeftClose size={16} aria-hidden="true" />}
                </Button>
              )}
            </div>
          </div>

          <nav role="navigation" aria-label="主要模块" className="sidebar-nav">
            {navigationButtons}
          </nav>

          <div className="sidebar-footer">
            <ThemeToggle showLabel={!isSidebarCollapsed} />
            {/* HeroUI Button 不接受 title，悬停提示放在包裹层上 */}
            <div className="sidebar-footer-item" title={isSidebarCollapsed ? '退出登录' : undefined}>
              <Button
                variant="ghost"
                fullWidth
                isIconOnly={isSidebarCollapsed}
                aria-label="退出登录"
                onPress={onLogout}
              >
                {isSidebarCollapsed ? <LogOut size={18} aria-hidden="true" /> : '退出登录'}
              </Button>
            </div>
          </div>
        </aside>
      )}

      {isZen && (
        <nav role="navigation" aria-label="面包屑导航" className="focus-topbar">
          <div className="focus-breadcrumb-group">
            {handleBack && (
              <Button
                isIconOnly
                variant="ghost"
                aria-label={backLabel}
                onPress={handleBack}
              >
                <IconChevronLeft />
              </Button>
            )}
            <Breadcrumbs
              aria-label="层级路径"
              className="focus-breadcrumbs"
              onAction={(key) => trail[Number(key)]?.onPress?.()}
            >
              {trail.map((level, index) => {
                const isCurrent = index === trail.length - 1
                return (
                  <Breadcrumbs.Item
                    key={`${level.label}-${index}`}
                    /* 用下标做集合 key 与去向索引：工作项标题可能重名，label 不是唯一标识 */
                    id={String(index)}
                    isDisabled={isCurrent}
                    className={isCurrent ? 'focus-breadcrumb-current' : undefined}
                  >
                    {level.label}
                  </Breadcrumbs.Item>
                )
              })}
            </Breadcrumbs>
          </div>

          <div className="focus-status-center">
            {saveStatus && saveStatus !== 'idle' && (
              <Chip
                role="status"
                aria-label="保存状态"
                size="sm"
                variant="soft"
                color={saveStatus === 'saved' ? 'default' : 'warning'}
              >
                {saveStatus === 'saved' && <SuccessIcon />}
                <Chip.Label>
                  {saveStatus === 'saving' ? '保存中...' : '所有修改已保存'}
                </Chip.Label>
              </Chip>
            )}
          </div>

          <div className="focus-actions-right" aria-hidden={focusActions ? undefined : 'true'}>
            {focusActions}
          </div>
        </nav>
      )}

      <main className={`app-main ${mainClass}`}>{children}</main>
    </div>
  )
}
