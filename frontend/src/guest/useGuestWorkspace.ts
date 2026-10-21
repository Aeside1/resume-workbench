import { useCallback, useEffect, useState } from 'react'
import {
  GUEST_WORKSPACE_EVENT,
  clearGuestWorkspace,
  isGuestWorkspaceEmpty,
  loadSampleWorkspace
} from './workspace'

export type GuestWorkspaceControls = {
  /** 本地是否已有草稿：决定横幅上是否给「清空本地草稿」 */
  hasDrafts: boolean
  /** 数据被整体替换（载入示例 / 清空）后递增，外壳用它重挂列表 */
  revision: number
  loadSample: () => void
  clear: () => void
}

/**
 * 游客工作台的本地草稿状态（ADR 008 §2.6 / §2.7）。
 *
 * 只服务游客态：已登录时不做任何读写。草稿是否为空不靠调用方手算，
 * 而是订阅 `GUEST_WORKSPACE_EVENT`——游客在列表里新建了第一个分组，
 * 横幅上的「清空草稿」必须立刻可用，而不是等刷新。
 */
export function useGuestWorkspace(isGuest: boolean, onDataReplaced: () => void): GuestWorkspaceControls {
  const [hasDrafts, setHasDrafts] = useState(() => !isGuestWorkspaceEmpty())
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!isGuest) return
    const sync = () => setHasDrafts(!isGuestWorkspaceEmpty())
    // 挂载时补算一次：应用可能是在已有本地草稿的浏览器里被打开的
    sync()
    window.addEventListener(GUEST_WORKSPACE_EVENT, sync)
    return () => window.removeEventListener(GUEST_WORKSPACE_EVENT, sync)
  }, [isGuest])

  const refresh = useCallback(() => {
    setHasDrafts(!isGuestWorkspaceEmpty())
    setRevision((current) => current + 1)
    onDataReplaced()
  }, [onDataReplaced])

  const loadSample = useCallback(() => {
    if (hasDrafts && !window.confirm('载入示例内容会覆盖当前的本地草稿，确定继续吗？')) return
    loadSampleWorkspace()
    refresh()
  }, [hasDrafts, refresh])

  const clear = useCallback(() => {
    if (!window.confirm('清空这台浏览器里的本地草稿？该操作不可撤销。')) return
    clearGuestWorkspace()
    refresh()
  }, [refresh])

  return { hasDrafts, revision, loadSample, clear }
}
