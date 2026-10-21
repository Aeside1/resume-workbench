import { ReactNode } from 'react'
import { Avatar, Button, Card } from '@heroui/react'
import { LogIn, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { isGuestSession, type Session } from '../session'
import { ThemeToggle } from '../components/ui/ThemeToggle'

/**
 * 外壳形态（04k 收窄后只剩两种）：
 * - `hub`：侧栏 + 内容区（工作台概览 / 经历内容列表 / 简历方案列表）
 * - `workspace`：侧栏 + 内容区，内容区里展开某一分组画布、某个简历方案编辑器，
 *   或「展开专注」的写作区（04k：专注也不再整屏接管，页面里没有第三种形态）
 */
export type AppShellMode = 'hub' | 'workspace'

type Props = {
  session: Session
  /** 已登录态的退出登录；游客态不传 */
  onLogout?: () => void
  /** 游客态的登录入口（ADR 008 §2.6）：底部按钮由「退出登录」换成「登录 / 注册」 */
  onRequestAuth?: () => void
  children: ReactNode
  mode?: AppShellMode
  /**
   * 展开专注（04k）：锁住视口高度，把「内容区页头以下的剩余高度」整块交给写作区，
   * 页面级不滚动、滚动发生在区域内部；侧栏照常可用（用户要更宽就自己折叠）。
   */
  isFocusOpen?: boolean
  navigationButtons?: ReactNode
  /** 侧栏折叠为图标态（04h）；状态由调用方持有并持久化 */
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function AppShell({
  session,
  onLogout,
  onRequestAuth,
  children,
  mode = 'hub',
  isFocusOpen = false,
  navigationButtons,
  isSidebarCollapsed = false,
  onToggleSidebar
}: Props) {
  const isGuest = isGuestSession(session)
  // 侧边栏用户名片首字母；游客态没有邮箱，用「游」作为本地草稿的标识
  const workspaceInitial = isGuest ? '游' : session.user.email.slice(0, 1).toUpperCase()
  const identityTitle = isGuest ? '游客工作台' : '个人职业工作台'
  const identityDetail = isGuest ? '本地草稿 · 未登录' : session.user.email

  const shellLayoutClass = isFocusOpen
    ? 'app-shell--focus'
    : mode === 'workspace'
      ? 'app-shell--workspace'
      : 'app-shell--hub'
  const mainClass = isFocusOpen
    ? 'app-main--focus'
    : mode === 'workspace'
      ? 'app-main--workspace'
      : 'app-main--hub'

  return (
    <div className={['app-shell', shellLayoutClass].filter(Boolean).join(' ')}>
      <aside
        role="complementary"
        aria-label="主导航"
        className={['app-sidebar', isSidebarCollapsed ? 'app-sidebar--collapsed' : ''].filter(Boolean).join(' ')}
      >
        <div className="sidebar-header">
          <div className="sidebar-header-row">
            <Card variant="secondary" className="sidebar-user-card">
              <Card.Content
                className="sidebar-user-content"
                title={isGuest ? '游客模式：数据只保存在这台浏览器' : session.user.email}
              >
                <Avatar size="sm" variant="soft" color="default">
                  <Avatar.Fallback>{workspaceInitial}</Avatar.Fallback>
                </Avatar>
                {/* 折叠时只留头像：文本不渲染（而不是被隐藏），保证可访问名不依赖被藏文本 */}
                {!isSidebarCollapsed && (
                  <div className="user-card-info">
                    <span className="user-title">{identityTitle}</span>
                    <span className="user-email">{identityDetail}</span>
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
          {isGuest ? (
            /* 游客态：登录入口取代退出登录（ADR 008 §2.6） */
            <div className="sidebar-footer-item" title={isSidebarCollapsed ? '登录 / 注册' : undefined}>
              <Button
                variant="ghost"
                fullWidth
                isIconOnly={isSidebarCollapsed}
                aria-label="登录 / 注册"
                onPress={onRequestAuth}
              >
                {isSidebarCollapsed ? <LogIn size={18} aria-hidden="true" /> : '登录 / 注册'}
              </Button>
            </div>
          ) : (
            /* HeroUI Button 不接受 title，悬停提示放在包裹层上 */
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
          )}
        </div>
      </aside>

      <main className={`app-main ${mainClass}`}>{children}</main>
    </div>
  )
}
