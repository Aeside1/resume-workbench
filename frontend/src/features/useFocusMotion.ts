import {
  FOCUS_ENTER_FROM,
  FOCUS_ENTER_TO,
  FOCUS_ENTER_TRANSITION,
  FOCUS_EXIT_TO,
  FOCUS_EXIT_TRANSITION
} from './motion'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** 专注页的动效相位：入场（展开）/ 退场（关闭动画中） */
export type FocusMotionPhase = 'enter' | 'exit'

/**
 * 专注页（内容区页头 + 写作区）的动效参数，两处必须共用同一份，否则两截会错开。
 *
 * - `enter`：0.22s 自下方 10px 升起淡入；
 * - `exit`：0.16s 向上 8px 淡出，**动完才提交关闭**（见 ADR 007 §2.6）；
 * - 系统「减少动态效果」偏好下返回 `{ initial: false }`（不播、直接落位），
 *   调用方需要「不播也不延迟」——关闭请求要走同步提交，不能卡在关闭动画态。
 */
export function useFocusMotion(phase: FocusMotionPhase) {
  const shouldReduceMotion = usePrefersReducedMotion()

  if (shouldReduceMotion) return { initial: false as const }

  return phase === 'exit'
    ? { initial: false as const, animate: FOCUS_EXIT_TO, transition: FOCUS_EXIT_TRANSITION }
    : { initial: FOCUS_ENTER_FROM, animate: FOCUS_ENTER_TO, transition: FOCUS_ENTER_TRANSITION }
}
