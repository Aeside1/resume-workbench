import { Chip, SuccessIcon } from '@heroui/react'
import type { SaveStatus } from './useTransientSaveStatus'

type Props = {
  saveStatus?: SaveStatus
}

/**
 * 场景级保存态微指示器（内容区页头共用）。
 *
 * 归零口径由 `useTransientSaveStatus` 统一承担（保存成功后 2.5s 回落 `idle`），
 * 这里只负责「保存中... / 所有修改已保存」两种可见文案、状态角色与图标；
 * `idle` 时不渲染任何东西。
 */
export function SaveStatusChip({ saveStatus }: Props) {
  if (!saveStatus || saveStatus === 'idle') return null

  return (
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
  )
}
