import { ReactNode } from 'react'
import { Button } from '@heroui/react'
import type { Session } from '../session'

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

  return (
    <div className={`app-shell ${isFocus ? 'app-shell--focus' : 'app-shell--hub'}`}>
      {!isFocus && (
        <aside role="complementary" aria-label="主导航" className="app-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-user-card">
              <div className="user-card-avatar" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="user-card-info">
                <span className="user-title">个人职业工作台</span>
                <span className="user-email">{session.user.email}</span>
              </div>
            </div>
          </div>

          <nav role="navigation" aria-label="主要模块" className="sidebar-nav">
            {navigationButtons}
          </nav>

          <div className="sidebar-footer">
            <Button
              variant="ghost"
              className="sidebar-logout-btn"
              onPress={onLogout}
            >
              退出登录
            </Button>
          </div>
        </aside>
      )}

      {isFocus && (
        <nav role="navigation" aria-label="面包屑导航" className="focus-topbar">
          <div className="focus-breadcrumb-group">
            {onExitFocus && (
              <button
                type="button"
                className="focus-back-btn"
                aria-label="返回经历内容"
                onClick={onExitFocus}
              >
                <span aria-hidden="true">←</span>
              </button>
            )}
            <span className="focus-breadcrumb-text">{breadcrumb || '经历内容'}</span>
          </div>

          <div className="focus-status-center">
            {saveStatus && saveStatus !== 'idle' && (
              <span role="status" aria-label="保存状态" className={`focus-status-pill ${saveStatus}`}>
                {saveStatus === 'saving' && '保存中...'}
                {saveStatus === 'saved' && '✓ 所有修改已保存'}
              </span>
            )}
          </div>

          <div className="focus-actions-right">
            {onExitFocus && (
              <Button
                variant="outline"
                className="focus-exit-btn"
                onPress={onExitFocus}
              >
                退出专注模式
              </Button>
            )}
          </div>
        </nav>
      )}

      <main className={`app-main ${isFocus ? 'app-main--focus' : 'app-main--hub'}`}>
        {children}
      </main>
    </div>
  )
}
