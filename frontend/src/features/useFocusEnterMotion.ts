import { useSyncExternalStore } from 'react'
import type { TargetAndTransition, Transition } from 'framer-motion'
import { EASE_OUT_SMOOTH } from './motion'

/** 展开专注时的入场时长与缓动（与伴随栏开合共用同一条缓出曲线） */
const ENTER_TRANSITION: Transition = { duration: 0.22, ease: EASE_OUT_SMOOTH }
/** 从下方 10px 处升起：整块内容一起入场，位移小到只提供「落位感」而不像页面跳动 */
const ENTER_FROM: TargetAndTransition = { opacity: 0, y: 10 }
const ENTER_TO: TargetAndTransition = { opacity: 1, y: 0 }

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function readReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * 「展开专注」的入场动画参数（内容区页头 + 写作区共用一份，两截必须同参数才不会错位）。
 *
 * **只做入场**：退出要「先 flush 保存再关，再恢复原卡片滚动位置」（ADR 004 §2.4、
 * ADR 007 §2.5），让写作区为动画多挂 200ms 会和这两件事抢时间，因此退出保持瞬时。
 *
 * 系统「减少动态效果」偏好下不播动画，直接落位。这里直接读媒体查询而不是用 framer 的
 * `useReducedMotion`：后者在**调用组件首次渲染**时把偏好读进 `useState`，而
 * `FocusCanvasContainer` 是长驻组件（展开专注前后都在），系统偏好中途改变后它会一直用
 * 旧值（真实浏览器实测：模拟 reduce 后第二次展开仍在播动画）。用 `useSyncExternalStore`
 * 读的永远是当前值。
 */
export function useFocusEnterMotion() {
  const shouldReduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    () => false
  )

  if (shouldReduceMotion) return { initial: false as const }

  return { initial: ENTER_FROM, animate: ENTER_TO, transition: ENTER_TRANSITION }
}
