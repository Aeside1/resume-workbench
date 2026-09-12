import React, { createContext, useContext } from 'react'
import { Toaster as SonnerToaster, toast as sonnerToast, type ExternalToast } from 'sonner'

export type ToastOptions = ExternalToast

const HasToastContext = createContext(false)
const DEFAULT_TOAST_ID = 'workbench-toast'

/**
 * 全局 Toaster 挂载提供者
 * 基于生态标准库 sonner，支持顶部居中、平滑微动效与手势滑动
 */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <HasToastContext.Provider value={true}>
      {children}
      <SonnerToaster
        position="top-center"
        richColors
        closeButton
        duration={import.meta.env.MODE === 'test' ? 10000 : 3500}
        theme="light"
      />
    </HasToastContext.Provider>
  )
}

/**
 * 封装的标准 toast API
 * 底层调用 sonner，使用默认单例 id 实现操作反馈平滑过渡与视觉聚焦，
 * 规范包裹 role="status" / role="alert" 保障无障碍阅读与测试断言。
 */
export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(<span role="status">{message}</span>, {
      id: options?.id ?? DEFAULT_TOAST_ID,
      ...options,
    }),
  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(<span role="alert">{message}</span>, {
      id: options?.id ?? DEFAULT_TOAST_ID,
      ...options,
    }),
  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(<span role="status">{message}</span>, {
      id: options?.id ?? DEFAULT_TOAST_ID,
      ...options,
    }),
  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.warning(<span role="status">{message}</span>, {
      id: options?.id ?? DEFAULT_TOAST_ID,
      ...options,
    }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id ?? DEFAULT_TOAST_ID),
}

/**
 * useToast Hook，提供快捷调用与环境自适应 fallback
 */
export function useToast() {
  const hasProvider = useContext(HasToastContext)

  return {
    ...toast,
    ToastPortal: hasProvider ? null : (
      <SonnerToaster
        position="top-center"
        richColors
        closeButton
        duration={import.meta.env.MODE === 'test' ? 10000 : 3500}
        theme="light"
      />
    ),
  }
}

export { SonnerToaster as Toaster }
