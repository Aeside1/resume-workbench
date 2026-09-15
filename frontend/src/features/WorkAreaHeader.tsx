import type { ReactNode } from 'react'
import { Button, Chip, IconChevronLeft, SuccessIcon } from '@heroui/react'
import type { SaveStatus } from './useTransientSaveStatus'

export type WorkAreaHeaderProps = {
  /** 返回上一级的可访问名，同时作为按钮文字（如「返回经历内容」） */
  backLabel: string
  onBack: () => void
  title?: string
  subtitle?: string
  saveStatus?: SaveStatus
  /** 右侧动作区（如「预览」「下载简历文稿」） */
  actions?: ReactNode
}

/**
 * 内容区自带页头（04g）。
 *
 * 非 Zen 视图不再接管整屏，因此「返回 / 标题 / 保存态 / 动作」从全局顶栏
 * 下移到内容区自己的一行里；全局顶栏只服务 Zen 的整屏接管。
 */
export function WorkAreaHeader({
  backLabel,
  onBack,
  title,
  subtitle,
  saveStatus,
  actions
}: WorkAreaHeaderProps) {
  return (
    <div className="work-area-header">
      <div className="work-area-header-main">
        <Button size="sm" variant="ghost" aria-label={backLabel} onPress={onBack}>
          <IconChevronLeft />
          {backLabel}
        </Button>

        {(title || subtitle) && (
          <div className="work-area-heading">
            {title && <h2 className="work-area-title">{title}</h2>}
            {subtitle && <p className="work-area-subtitle">{subtitle}</p>}
          </div>
        )}

        {saveStatus && saveStatus !== 'idle' && (
          <Chip
            role="status"
            aria-label="保存状态"
            size="sm"
            variant="soft"
            color={saveStatus === 'saved' ? 'default' : 'warning'}
          >
            {saveStatus === 'saved' && <SuccessIcon />}
            <Chip.Label>{saveStatus === 'saving' ? '保存中...' : '所有修改已保存'}</Chip.Label>
          </Chip>
        )}
      </div>

      {actions && <div className="work-area-actions">{actions}</div>}
    </div>
  )
}
