import { useCallback, useEffect, useRef, useState } from 'react'
import type { SaveStatus } from './useTransientSaveStatus'

/** 输入停顿多久才把草稿交给队列（与旧的 800ms 防抖口径一致） */
export const DEFAULT_SAVE_DEBOUNCE_MS = 800

type Options<T> = {
  /** 判重用的草稿签名：两笔内容签名相同即视为同一份内容 */
  getSignature: (value: T) => string
  /** 真正落盘。抛出即视为失败 */
  persist: (value: T) => Promise<void> | void
  /** 这份内容值不值得落盘（例如标题为空就不发）。返回 false 时按「无待保存内容」处理 */
  isSavable?: (value: T) => boolean
  /** 队列状态上报给外壳；卸载后仍会收到在途请求的最终状态 */
  onStatusChange?: (status: SaveStatus) => void
  debounceMs?: number
}

/**
 * 保存队列：把「在途就丢弃」改成「在途就记下最新草稿，回来补发一笔」。
 *
 * 不变式只有一条：
 *
 * > 最新草稿签名 !== 已落盘签名 ⟹ 必须还有一笔请求要发。
 *
 * 实现即它的直接展开——发 → 成功则记下已落盘签名 → 若期间又来了新草稿就**合并成一次**
 * 再发 → 直到相等。因此任何时刻最多 **1 笔在途 + 1 笔待发**，不会滚雪球。
 *
 * 队列不关心草稿长什么样，也不碰编辑器：缝开在调用方交出完整草稿的那一刻
 * （卡片与 Zen 都是 `onChange(fullMarkdown)`）。
 *
 * @param options.getSignature 草稿签名，用于判重
 * @param options.persist 落盘动作
 * @param options.isSavable 该不该落盘
 * @param options.onStatusChange 保存态上报给仍存活的外壳；队列卸载后也会继续上报在途结果
 * @param options.debounceMs 输入停顿时长，默认 {@link DEFAULT_SAVE_DEBOUNCE_MS}
 * @returns `request`（防抖请求）、`flush`（立刻请求，不等结果）、`resetBaseline`（把某份内容认定为已落盘，例如外部路径回写）、`status`
 */
export function useSaveQueue<T>({
  getSignature,
  persist,
  isSavable,
  onStatusChange,
  debounceMs = DEFAULT_SAVE_DEBOUNCE_MS
}: Options<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const statusRef = useRef<SaveStatus>('idle')

  // 逐帧换新的入参一律用 ref 保鲜，回调自身保持稳定（调用方的 effect 依赖才不会被拖着重跑）
  const getSignatureRef = useRef(getSignature)
  const persistRef = useRef(persist)
  const isSavableRef = useRef(isSavable)
  const onStatusChangeRef = useRef(onStatusChange)
  getSignatureRef.current = getSignature
  persistRef.current = persist
  isSavableRef.current = isSavable
  onStatusChangeRef.current = onStatusChange

  /** 最新草稿——它就是「1 笔在途 + 1 笔待发」里的那个待发位（单一槽位，永远只留最新那份） */
  const latestRef = useRef<T | null>(null)
  /** 已落盘签名 */
  const savedSignatureRef = useRef('')
  /** 在途那笔的签名，`null` 表示当前没有请求在路上 */
  const inFlightSignatureRef = useRef<string | null>(null)
  const isDrainingRef = useRef(false)
  /** 上一次失败的签名：卸载兜底只补发「从没发出去过」的内容，不拿它去重试 */
  const failedSignatureRef = useRef('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const clearTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const isSavableNow = useCallback((value: T) => {
    return isSavableRef.current ? isSavableRef.current(value) : true
  }, [])

  /** 还有没有内容欠着一次落盘 */
  const hasPendingWork = useCallback(() => {
    const value = latestRef.current
    if (value === null) return false
    if (!isSavableNow(value)) return false
    return getSignatureRef.current(value) !== savedSignatureRef.current
  }, [isSavableNow])

  const computeStatus = useCallback((): SaveStatus => {
    if (inFlightSignatureRef.current !== null) return 'saving'
    const value = latestRef.current
    if (value === null || !isSavableNow(value)) return 'idle'
    return getSignatureRef.current(value) === savedSignatureRef.current ? 'saved' : 'unsaved'
  }, [isSavableNow])

  const publish = useCallback((next: SaveStatus) => {
    statusRef.current = next
    // 卸载后不再写本地 state；但外壳仍需知道 detached 请求最终是 saved 还是 unsaved。
    if (isMountedRef.current) setStatus(next)
    onStatusChangeRef.current?.(next)
  }, [])

  /**
   * 排水。用 while 而不是「发完再递归调自己」：递归在慢网下会沿着微任务链把栈拉长，
   * 而且失败重入的出口更难看清。这里的退出条件就是上面那条不变式。
   */
  /** 还有没有「从没发出去过」的内容——卸载兜底只认这种，不自动重试失败过的签名 */
  const hasUnattemptedWork = useCallback(() => {
    if (!hasPendingWork()) return false
    const value = latestRef.current
    if (value === null) return false
    return getSignatureRef.current(value) !== failedSignatureRef.current
  }, [hasPendingWork])

  const startDrain = useCallback(() => {
    if (isDrainingRef.current) return
    // 没欠帐就别动状态：否则退出路径（内容根本没改）会空亮一次「已保存」
    if (!hasPendingWork()) return
    isDrainingRef.current = true

    void (async () => {
      try {
        while (true) {
          const value = latestRef.current
          if (value === null || !hasPendingWork()) break

          const signature = getSignatureRef.current(value)
          inFlightSignatureRef.current = signature
          publish('saving')

          let isPersisted = true
          try {
            await persistRef.current(value)
          } catch {
            isPersisted = false
          }

          inFlightSignatureRef.current = null
          if (!isPersisted) {
            failedSignatureRef.current = signature
            // 当前签名失败不自动重试；但如果在途期间已有更新草稿，不能让它
            // 因为它自己的 debounce 已经消耗而无人承接，下一轮直接排水最新槽位。
            const latestSignature = latestRef.current === null
              ? null
              : getSignatureRef.current(latestRef.current)
            if (latestSignature !== null && latestSignature !== signature && hasPendingWork()) {
              continue
            }
            break
          }
          savedSignatureRef.current = signature
        }
      } finally {
        isDrainingRef.current = false
        publish(computeStatus())
      }
    })()
  }, [hasPendingWork, publish, computeStatus])

  /** 输入停顿后请求落盘。在途时只是把草稿留在待发位，不会被丢弃 */
  const request = useCallback(
    (value: T) => {
      latestRef.current = value
      // 用户又有新动作了：解除「上次失败不重试」的锁
      failedSignatureRef.current = ''
      clearTimer()
      if (getSignatureRef.current(value) === savedSignatureRef.current) {
        // 改回已落盘内容时清掉之前的 unsaved；初始 baseline 仍保持 idle，
        // 在途请求则继续显示 saving。
        if (statusRef.current === 'unsaved') {
          publish(inFlightSignatureRef.current === null ? 'idle' : 'saving')
        }
        return
      }
      // 草稿一交进来就已经与已落盘内容不同：防抖等待期间也不能把界面说成「没事」。
      // 若已有请求在途，则继续显示 saving；请求结束后会立刻排水最新待发位。
      if (inFlightSignatureRef.current === null) publish('unsaved')
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        startDrain()
      }, debounceMs)
    },
    [clearTimer, startDrain, publish, computeStatus, debounceMs]
  )

  /** 退出路径用：取消防抖，立刻把最新草稿交给队列（不等结果，调用方该收界面就收界面） */
  const flush = useCallback(
    (value: T) => {
      latestRef.current = value
      failedSignatureRef.current = ''
      clearTimer()
      startDrain()
    },
    [clearTimer, startDrain]
  )

  /** 把一份内容认定为「已在服务端」：外部路径回写、换绑到另一条内容时用 */
  const resetBaseline = useCallback(
    (value: T) => {
      latestRef.current = value
      savedSignatureRef.current = getSignatureRef.current(value)
      clearTimer()
      publish('idle')
    },
    [clearTimer, publish]
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearTimer()
      // 卸载兜底：防抖还没到点就走人（面包屑上一级、侧栏导航、收起写作区）时补发一笔。
      // 有请求在途时这里无事可做——在途那笔跑完后会自己把待发位上的最新草稿发出去。
      // 只补发从没尝试过的内容：刚失败过的签名不在这里重试（那会把已删除记录再 PATCH 一次）。
      if (hasUnattemptedWork()) startDrain()
    }
  }, [clearTimer, hasUnattemptedWork, startDrain])

  return { request, flush, resetBaseline, status }
}
