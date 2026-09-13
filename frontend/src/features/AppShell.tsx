import { ReactNode } from 'react'
import { Avatar, Button, Card, Chip, IconChevronLeft, SuccessIcon } from '@heroui/react'
import type { Session } from '../session'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export type AppShellMode = 'hub' | 'focus' | 'focus-canvas'

type Props = {
  session: Session
  onLogout: () => void
  children: ReactNode
  mode?: AppShellMode
  breadcrumb?: string
  onExitFocus?: () => void
  saveStatus?: 'idle' | 'saving' | 'saved'
  navigationButtons?: ReactNode
}

export function AppShell({
  session,
  onLogout,
  children,
  mode = 'hub',
  breadcrumb,
  onExitFocus,
  saveStatus,
  navigationButtons
}: Props) {
  const isFocus = mode === 'focus' || mode === 'focus-canvas'
  const workspaceInitial = session.user.email.slice(0, 1).toUpperCase()

  return (
    <div className={`app-shell ${isFocus ? 'app-shell--focus' : 'app-shell--hub'}`}>
      {!isFocus && (
        <aside role="complementary" aria-label="主导航" className="app-sidebar">
          <div className="sidebar-header">
            <Card variant="secondary">
              <Card.Content className="sidebar-user-content">
                <Avatar size="sm" variant="soft" color="default">
                  <Avatar.Fallback>{workspaceInitial}</Avatar.Fallback>
                </Avatar>
                <div className="user-card-info">
                  <span className="user-title">个人职业工作台</span>
                  <span className="user-email">{session.user.email}</span>
                </div>
              </Card.Content>
            </Card>
          </div>

          <nav role="navigation" aria-label="主要模块" className="sidebar-nav">
            {navigationButtons}
          </nav>

          <div className="sidebar-footer">
            <ThemeToggle />
            <Button variant="ghost" fullWidth onPress={onLogout}>
              退出登录
            </Button>
          </div>
        </aside>
      )}

      {isFocus && (
        <nav role="navigation" aria-label="面包屑导航" className="focus-topbar">
          <div className="focus-breadcrumb-group">
            {onExitFocus && (
              <Button
                isIconOnly
                variant="ghost"
                aria-label="返回经历内容"
                onPress={onExitFocus}
              >
                <IconChevronLeft />
              </Button>
            )}
            {breadcrumb && breadcrumb.includes(' / ') ? (
              <div className="focus-breadcrumb-trail">
                <Button variant="ghost" size="sm" onPress={onExitFocus}>
                  {breadcrumb.split(' / ')[0]}
                </Button>
                <span className="focus-breadcrumb-separator" aria-hidden="true">/</span>
                <span className="focus-breadcrumb-current">
                  {breadcrumb.split(' / ').slice(1).join(' / ')}
                </span>
              </div>
            ) : (
              <span className="focus-breadcrumb-text">{breadcrumb || '经历内容'}</span>
            )}
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

          <div className="focus-actions-right" aria-hidden="true" />
        </nav>
      )}

      <main className={`app-main ${isFocus ? 'app-main--focus' : 'app-main--hub'}`}>
        {children}
      </main>
    </div>
  )
}
