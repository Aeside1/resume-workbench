import type { Transition } from 'framer-motion'

/**
 * 共用的缓出曲线 `cubic-bezier(0.16, 1, 0.3, 1)`：起步快、收尾稳，
 * 本项目所有「展开 / 滑入」类动效共用这一条，避免同一屏里几段动画手感不一致
 * （伴随栏开合、展开专注的入场）。
 */
export const EASE_OUT_SMOOTH: Transition['ease'] = [0.16, 1, 0.3, 1]
