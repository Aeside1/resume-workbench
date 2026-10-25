import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Avatar, Button, Card, CloseIcon } from '@heroui/react'
import { LogIn, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { isGuestSession, type Session } from '../session'
import { ThemeToggle } from '../components/ui/ThemeToggle'

/**
 * 外壳形态（04k 收窄后只剩两种）：
 * - `hub`：侧栏 + 内容区（工作台概览 / 经历内容列表 / 简历方案列表）
 * - `workspace`：侧栏 + 内容区，内容区里展开某一分组画布、某个简历方案编辑器，
 *   或「展开专注」的写作区（04k：专注也不再整屏接管，页面里没有第三种形态）
 */
export type AppShellMode = 'hub' | 'workspace'

/**
 * 窄屏分界（全站只有 640 / 1024 / 1280 三条线，见 docs/adr/010-responsive-and-flexible-layout.md）：
 * - `(max-width: 1279px)`：窗口不足 1280，侧栏自动收成图标条；
 * - `(max-width: 767px)`：窗口不足 768（内容区已不足 640），侧栏不再占位，改为顶部条 + 滑出面板。
 *
 * 侧栏是内容区的兄弟节点，量不到「内容区还剩多少」，只能按窗口宽度判断；
 * 内容区内部的栏位让位改用容器查询（`.app-main` 是名为 `workspace` 的查询容器）。
 */
const RAIL_MEDIA_QUERY = '(max-width: 1279px)'
const PANEL_MEDIA_QUERY = '(max-width: 767px)'

/** 订阅一条媒体查询；jsdom 里由 test/matchMedia.ts 的替身驱动 */
function useMediaQuery(query: string): boolean {
  const read = () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches)
  const [matches, setMatches] = useState(read)

  useEffect(() => {
    const list = window.matchMedia(query)
    // 替身的 change 事件不带 matches，统一回读 list.matches（真实浏览器里同样成立）
    const sync = () => setMatches(list.matches)
    sync()
    list.addEventListener('change', sync)
    return () => list.removeEventListener('change', sync)
  }, [query])

  return matches
}

type Props = {
  session: Session
  /** 已登录态退出登录；游客态不传 */
  onLogout?: () => void
  /** 游客态的登录入口 */
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
  // 游客态没有邮箱，用「游」作为名片标识
  const workspaceInitial = isGuest ? '游' : session.user.email.slice(0, 1).toUpperCase()
  const identityTitle = isGuest ? '游客工作台' : '个人职业工作台'
  const identityDetail = isGuest ? '未登录 · 示例只读' : session.user.email

  const isIconRail = useMediaQuery(RAIL_MEDIA_QUERY)
  const isPanelNav = useMediaQuery(PANEL_MEDIA_QUERY)
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false)
  const closeNavPanel = useCallback(() => setIsNavPanelOpen(false), [])
  // 面板里必须看得到文字（它就是给窄屏补导航的），所以「收成图标条」只管非面板态
  const isCollapsed = !isPanelNav && (isSidebarCollapsed || isIconRail)
  const isPanelOpen = isPanelNav && isNavPanelOpen

  // 窗口变宽回到图标态时自动收掉面板，避免留一个看不见却仍可聚焦的浮层
  useEffect(() => {
    if (!isPanelNav) setIsNavPanelOpen(false)
  }, [isPanelNav])

  // Esc 关闭面板（焦点陷阱由浏览器原生 tab 顺序承担，面板不抄 HeroUI Drawer 的模态行为）
  useEffect(() => {
    if (!isPanelOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNavPanelOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPanelOpen])

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
    <div
      className={['app-shell', shellLayoutClass, isPanelNav ? 'app-shell--panel-nav' : ''].filter(Boolean).join(' ')}
    >
      {/* 窄屏顶部条（issue 19）：只在窗口 < 768 出现，承载菜单按钮与身份一行 */}
      {isPanelNav && (
        <header className="app-topbar">
          <Button
            isIconOnly
            variant="ghost"
            aria-label="打开导航菜单"
            aria-expanded={isPanelOpen}
            aria-controls="app-navigation"
            onPress={() => setIsNavPanelOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </Button>
          <span className="app-topbar-title">{identityTitle}</span>
        </header>
      )}

      {isPanelOpen && (
        <div className="app-nav-scrim" aria-hidden="true" onClick={closeNavPanel} />
      )}

      <aside
        id="app-navigation"
        role="complementary"
        aria-label="主导航"
        aria-hidden={isPanelNav && !isPanelOpen ? true : undefined}
        inert={isPanelNav && !isPanelOpen ? true : undefined}
        className={[
          'app-sidebar',
          isCollapsed ? 'app-sidebar--collapsed' : '',
          isPanelNav ? 'app-sidebar--panel' : '',
          isPanelOpen ? 'app-sidebar--panel-open' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="sidebar-header">
          <div className="sidebar-header-row">
            <Card variant="secondary" className="sidebar-user-card">
              <Card.Content
                className="sidebar-user-content"
                title={isGuest ? '游客模式：示例内容只读' : session.user.email}
              >
                <Avatar size="sm" variant="soft" color="default">
                  <Avatar.Fallback>{workspaceInitial}</Avatar.Fallback>
                </Avatar>
                {/* 折叠时只留头像：文本不渲染（而不是被隐藏），保证可访问名不依赖被藏文本 */}
                {!isCollapsed && (
                  <div className="user-card-info">
                    <span className="user-title">{identityTitle}</span>
                    <span className="user-email">{identityDetail}</span>
                  </div>
                )}
              </Card.Content>
            </Card>

            {isPanelNav ? (
              <Button isIconOnly size="sm" variant="ghost" aria-label="关闭导航菜单" onPress={closeNavPanel}>
                <CloseIcon width={16} height={16} aria-hidden="true" />
              </Button>
            ) : onToggleSidebar ? (
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
            ) : null}
          </div>
        </div>

        {/* 面板态点完导航项就收起来（窄屏没有“侧栏常驻”这回事） */}
        <nav
          role="navigation"
          aria-label="主要模块"
          className="sidebar-nav"
          onClick={isPanelNav ? closeNavPanel : undefined}
        >
          {navigationButtons}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle showLabel={!isCollapsed} />
          {isGuest ? (
            /* 游客态：登录入口取代退出登录 */
            <div className="sidebar-footer-item" title={isCollapsed ? '登录 / 注册' : undefined}>
              <Button
                variant="ghost"
                fullWidth
                isIconOnly={isCollapsed}
                aria-label="登录 / 注册"
                onPress={onRequestAuth}
              >
                {isCollapsed ? <LogIn size={18} aria-hidden="true" /> : '登录 / 注册'}
              </Button>
            </div>
          ) : (
            /* HeroUI Button 不接受 title，悬停提示放在包裹层上 */
            <div className="sidebar-footer-item" title={isCollapsed ? '退出登录' : undefined}>
              <Button
                variant="ghost"
                fullWidth
                isIconOnly={isCollapsed}
                aria-label="退出登录"
                onPress={onLogout}
              >
                {isCollapsed ? <LogOut size={18} aria-hidden="true" /> : '退出登录'}
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className={`app-main ${mainClass}`}>{children}</main>
    </div>
  )
}
