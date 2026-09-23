import type { TargetAndTransition, Transition } from 'framer-motion'

/**
 * 共用的缓出曲线 `cubic-bezier(0.16, 1, 0.3, 1)`：起步快、收尾稳。
 * 专注页的入场 / 退场与伴随栏开合共用这一条，避免同一屏里几段动画手感不一致。
 */
export const EASE_OUT_SMOOTH: Transition['ease'] = [0.16, 1, 0.3, 1]

/** 降级用：零时长（保留 transition 通道，但不补间） */
export const INSTANT_TRANSITION: Transition = { duration: 0 }

/**
 * 专注入场（内容区页头 + 写作区一起入场）：
 * 0.22s、自下方 10px 升起并淡入。位移小到只提供「落位感」而不像页面跳动。
 */
export const FOCUS_ENTER_TRANSITION: Transition = { duration: 0.22, ease: EASE_OUT_SMOOTH }
export const FOCUS_ENTER_FROM: TargetAndTransition = { opacity: 0, y: 10 }
export const FOCUS_ENTER_TO: TargetAndTransition = { opacity: 1, y: 0 }

/**
 * 专注退场：0.16s、向上 8px 淡出。
 *
 * 退场**动完才提交关闭**（卸载写作区、解锁视口、页头换回），见 ADR 007 §2.6：
 * 反过来（先提交再播退场）会让退场层失去专注形态的原点，位置会跳。
 */
export const FOCUS_EXIT_TRANSITION: Transition = { duration: 0.16, ease: EASE_OUT_SMOOTH }
export const FOCUS_EXIT_TO: TargetAndTransition = { opacity: 0, y: -8 }

/**
 * 内容区的「落位」参数（工作台视图切换、专注退出后画布重新入场）：
 * 0.18s、自下方 6px 升起，让换内容这件事有节拍而不是硬蹦。
 * 曲线用中性的 `easeOut`（与专注页的 `EASE_OUT_SMOOTH` 不同：那条更「快起稳收」，
 * 适合整块页面进出，不适合内容落位）。
 */
export const CONTENT_SETTLE_TRANSITION: Transition = { duration: 0.18, ease: 'easeOut' }
export const CONTENT_SETTLE_FROM: TargetAndTransition = { opacity: 0, y: 6 }
export const CONTENT_SETTLE_TO: TargetAndTransition = { opacity: 1, y: 0 }
