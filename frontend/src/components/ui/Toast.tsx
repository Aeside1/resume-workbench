import React, { createContext, useContext } from 'react'
import { Toast } from '@heroui/react'

export type ToastOptions = {
  /** 可选操作按钮（如「撤销」） */
  action?: { label: string; onClick: () => void }
  /** 展示时长（毫秒）；显式传 0 表示不自动关闭 */
  timeout?: number
}

const HasToastContext = createContext(false)

/** 测试环境下延长展示时间，避免用例断言前自动消失 */
const DEFAULT_TIMEOUT = import.meta.env.MODE === 'test' ? 10000 : 3500

/**
 * 延续改造前的单例语义：同一时刻只保留最近一条提示，
 * 再次触发时先关闭上一条，避免历史提示堆叠。
 */
let activeToastKey: string | null = null

/** 应用级变体 → HeroUI 内置提示方法（HeroUI 无 `error`，用 `danger`） */
const HERO_TOAST_PUSHERS = {
  success: Toast.toast.success,
  danger: Toast.toast.danger,
  accent: Toast.toast.info,
  warning: Toast.toast.warning
}

function pushToast(
  variant: keyof typeof HERO_TOAST_PUSHERS,
  message: string,
  options?: ToastOptions
) {
  if (activeToastKey) {
    Toast.toast.close(activeToastKey)
  }

  activeToastKey = HERO_TOAST_PUSHERS[variant](message, {
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    actionProps: options?.action
      ? { children: options.action.label, onPress: options.action.onClick }
      : undefined
  })

  return activeToastKey
}

/**
 * 封装的标准 toast API。
 * 底层是 HeroUI v3 内置的 Toast 队列（React Aria ToastRegion），
 * 语义与无障碍由框架保证：提示内容落在 `role="alert"` 区域中，
 * 整条提示为 `role="alertdialog"`。
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => pushToast('success', message, options),
  error: (message: string, options?: ToastOptions) => pushToast('danger', message, options),
  info: (message: string, options?: ToastOptions) => pushToast('accent', message, options),
  warning: (message: string, options?: ToastOptions) => pushToast('warning', message, options),
  dismiss: () => {
    if (activeToastKey) {
      Toast.toast.close(activeToastKey)
      activeToastKey = null
    }
  }
}

/** 全局 Toast 区域挂载提供者（顶部居中，与改造前位置一致） */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <HasToastContext.Provider value={true}>
      {children}
      <Toast.Provider placement="top" />
    </HasToastContext.Provider>
  )
}

/**
 * useToast Hook，提供快捷调用与环境自适应 fallback：
 * 若调用方没有外层 ToastProvider，则由本 Hook 自行挂载提示区域。
 */
export function useToast() {
  const hasProvider = useContext(HasToastContext)

  return {
    ...toast,
    ToastPortal: hasProvider ? null : <Toast.Provider placement="top" />
  }
}
