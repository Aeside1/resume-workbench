import { useSyncExternalStore } from 'react'

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
 * 系统「减少动态效果」偏好的**实时**值。
 *
 * 不用 framer 的 `useReducedMotion`：后者在**调用组件首次渲染**时把偏好读进 `useState`，
 * 而 `FocusCanvasContainer` 这类长驻组件（展开专注前后都在）会一直用旧值（真实浏览器
 * 复测抓到过：模拟 reduce 后第二次展开仍在播动画）。这里用 `useSyncExternalStore` 订阅
 * 媒体查询，读到的永远是当前值，任何调用点都不会因此踩坑。
 *
 * 注：`MotionConfig reducedMotion="user"` 只跳过 transform / layout 类动画，
 * `width` 这类值仍会补间（例如伴随栏滑入），所以那些地方要显式用本 hook 降级。
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, readReducedMotion, () => false)
}
