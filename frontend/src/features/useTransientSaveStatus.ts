import { useCallback, useEffect, useRef } from 'react'

/**
 * 保存态三态。同一个语义服务两处反馈：
 * - 场景级：顶栏那条 Chip（`AppShell` 的 `focus-status-center`，ADR 004 §2.2）；
 * - 卡片级：画布就地编辑表单头部的内联徽章（`WorkContentBlock`，issue 13）。
 * 两者作用域不同（这张卡片存了没 / 这个场景存了没），因此共用同一套口径与停留时长。
 */
export type SaveStatus = 'idle' | 'saving' | 'saved'

/** 「已保存」反馈的停留时长——顶栏 Chip 与卡片内联徽章同口径，避免同屏两处反馈时间线打架 */
export const SAVED_STATUS_VISIBLE_MS = 2500

/**
 * 把保存态收敛成「跃迁 + 定时归零」：`saved` 停留 {@link SAVED_STATUS_VISIBLE_MS} 后自动回落 `idle`，
 * 且每次状态变更都重置同一个归零定时器。
 *
 * 为什么必须是同一个定时器：旧写法每次保存完各自挂一个 `setTimeout(2500)`，
 * 连续保存时上一轮的陈旧定时器会把新一轮的「保存中…」提前清掉（issue 12 §3.1 在顶栏上修过）。
 *
 * @param publish 状态落地方式：顶栏走 `onSaveStatusChange` 上行，卡片徽章直接写本地 state。
 *   `publish` 可以每帧换新（不要求稳定）：内部用 ref 保鲜，`applySaveStatus` 自身恒稳定。
 * @returns 供调用方替换 `setState` 使用的 `applySaveStatus`（含归零与卸载清理）
 */
export function useTransientSaveStatus(publish: (status: SaveStatus) => void) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const publishRef = useRef(publish)
  publishRef.current = publish

  const applySaveStatus = useCallback((status: SaveStatus) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    publishRef.current(status)
    if (status === 'saved') {
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null
        publishRef.current('idle')
      }, SAVED_STATUS_VISIBLE_MS)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  return applySaveStatus
}
