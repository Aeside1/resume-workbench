import type { ReactNode } from 'react'
import { Breadcrumbs, Button, IconChevronLeft } from '@heroui/react'
import { motion } from 'framer-motion'
import type { SaveStatus } from './useTransientSaveStatus'
import { SaveStatusChip } from './SaveStatusChip'
import { useFocusEnterMotion } from './useFocusEnterMotion'

/**
 * 页头面包屑的一级（ADR 004 §2.2）。
 * 末级是当前位置（不可点），其余级由 `onPress` 决定去向。
 */
export type FocusBreadcrumbLevel = { label: string; onPress?: () => void }

type Props = {
  /** 层级路径：经历内容 / <分组名> / <工作项标题>；末级随就地编辑实时更新 */
  trail: FocusBreadcrumbLevel[]
  /** 返回按钮的可访问名（专注态是「返回画布」） */
  backLabel: string
  /** 返回按钮的去向：与面包屑上一级相同，都走 Zen 自身的 flush 关闭路径（ADR 004 §2.4） */
  onBack?: () => void
  saveStatus?: SaveStatus
  /** 右侧动作插槽：专注态放 Esc 提示与伴随栏开关 */
  actions?: ReactNode
}

/**
 * 专注写作区的内容区页头（04k）。
 *
 * 专注不再整屏接管，因此这条页头从 AppShell 顶栏搬进内容区（与分组画布 /
 * 简历方案编辑器一样由内容区自带页头），但排版契约不变：
 * 面包屑组可收缩、末级单行省略、中间的保存态 Chip 永不被顶掉（ADR 004 §2.3），
 * 且各级按**位置**（而非文案）绑定去向（工作项标题可能重名）。
 *
 * 页头与写作区用同一份入场参数（ `useFocusEnterMotion`）一起入场（04l）。
 */
export function FocusTopbar({ trail, backLabel, onBack, saveStatus, actions }: Props) {
  const focusEnterMotion = useFocusEnterMotion()

  return (
    <motion.nav role="navigation" aria-label="面包屑导航" className="focus-topbar" {...focusEnterMotion}>
      <div className="focus-breadcrumb-group">
        {onBack && (
          <Button isIconOnly variant="ghost" aria-label={backLabel} onPress={onBack}>
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
        <SaveStatusChip saveStatus={saveStatus} />
      </div>

      <div className="focus-actions-right" aria-hidden={actions ? undefined : 'true'}>
        {actions}
      </div>
    </motion.nav>
  )
}
