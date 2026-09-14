import { ReactNode } from 'react'
import { Avatar, Breadcrumbs, Button, Card, Chip, IconChevronLeft, SuccessIcon } from '@heroui/react'
import type { Session } from '../session'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export type AppShellMode = 'hub' | 'focus' | 'focus-canvas' | 'focus-zen'

/** 专注场景（画布或 Zen 展开）下顶栏可见、侧边栏隐藏 */
export function isFocusMode(mode: AppShellMode): boolean {
  return mode !== 'hub'
}

/**
 * 顶栏面包屑的一级（ADR 004 §2.2）。
 * 末级是当前位置（不可点），其余级由 `onPress` 决定去向。
 */
export type FocusBreadcrumbLevel = { label: string; onPress?: () => void }

type Props = {
  session: Session
  onLogout: () => void
  children: ReactNode
  mode?: AppShellMode
  /** 结构化面包屑；Zen 展开时由外壳扩展为三级「经历内容 / 分组 / 工作项」 */
  breadcrumbTrail?: FocusBreadcrumbLevel[]
  /** 顶栏右侧插槽：由外壳传入当前场景的操作（Zen 展开时放 Esc 提示与「收起伴随栏」） */
  focusActions?: ReactNode
  onExitFocus?: () => void
  /** 顶栏返回按钮的可访问名，随语义变化：画布模式「返回经历内容」，Zen 展开「返回画布」 */
  backLabel?: string
  saveStatus?: 'idle' | 'saving' | 'saved'
  navigationButtons?: ReactNode
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
  navigationButtons
}: Props) {
  const isFocus = isFocusMode(mode)
  const isZen = mode === 'focus-zen'
  // 侧边栏用户名片首字母（仅 hub 模式可见）
  const workspaceInitial = session.user.email.slice(0, 1).toUpperCase()

  // 返回按钮 = 面包屑的上一级：画布模式回经历内容，Zen 展开时回画布。
  // 末级永远不可点，因此上一级就是倒数第二级。
  const trail: FocusBreadcrumbLevel[] = breadcrumbTrail?.length
    ? breadcrumbTrail
    : [{ label: '经历内容' }]
  const parentLevel = trail.length > 1 ? trail[trail.length - 2] : undefined
  const handleBack = parentLevel?.onPress ?? (trail.length > 1 ? undefined : onExitFocus)

  return (
    <div
      className={[
        'app-shell',
        isFocus ? 'app-shell--focus' : 'app-shell--hub',
        isZen ? 'app-shell--zen' : ''
      ].filter(Boolean).join(' ')}
    >
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

      <main className={`app-main ${isFocus ? 'app-main--focus' : 'app-main--hub'}`}>
        {children}
      </main>
    </div>
  )
}
