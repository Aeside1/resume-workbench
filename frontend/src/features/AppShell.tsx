import { ReactNode } from 'react'
import { Button } from '@heroui/react'
import type { Session } from '../session'

type Props = {
  session: Session
  onSessionChange: (session: Session) => void
  onLogout: () => void
  children: ReactNode
  mode?: 'hub' | 'focus'
  breadcrumb?: string
  onExitFocus?: () => void
  saveStatus?: 'idle' | 'saving' | 'saved'
  navigationButtons?: ReactNode
}

export function AppShell({
  session,
  onSessionChange,
  onLogout,
  children,
  mode = 'hub',
  breadcrumb,
  onExitFocus,
  saveStatus,
  navigationButtons
}: Props) {
  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value)
    onSessionChange({ ...session, selectedWorkspaceId: selectedId })
  }

  return (
    <div className="app-shell">
      {mode === 'hub' && (
        <aside role="complementary" aria-label="主导航" className="app-sidebar">
          <div className="sidebar-header">
            <select
              aria-label="当前工作区"
              value={session.selectedWorkspaceId}
              onChange={handleWorkspaceChange}
            >
              {session.workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <nav role="navigation" aria-label="主要模块" className="sidebar-nav">
            {navigationButtons}
          </nav>

          <div className="sidebar-footer">
            <span>{session.user.email}</span>
            <Button onClick={onLogout}>退出登录</Button>
          </div>
        </aside>
      )}

      {mode === 'focus' && (
        <nav role="navigation" aria-label="面包屑导航" className="focus-topbar">
          {breadcrumb && <span>{breadcrumb}</span>}
          {onExitFocus && <Button onClick={onExitFocus}>退出专注模式</Button>}
          {saveStatus && (
            <span role="status" aria-label="保存状态">
              {saveStatus === 'saving' && '保存中...'}
              {saveStatus === 'saved' && '已保存'}
              {saveStatus === 'idle' && ''}
            </span>
          )}
        </nav>
      )}

      <main className="app-main">{children}</main>
    </div>
  )
}
