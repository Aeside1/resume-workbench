import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'info' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  duration?: number
  action?: ToastAction
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
  duration: number
}

interface ToastContextValue {
  show: (type: ToastType, message: string, options?: ToastOptions) => string
  success: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const duration = options?.duration ?? (import.meta.env.MODE === 'test' ? 0 : 3500)
    const newToast: ToastItem = {
      id,
      type,
      message,
      action: options?.action,
      duration,
    }
    setToasts([newToast]) // 保持最新单条操作提示，聚焦视觉反馈
    return id
  }, [])

  const success = useCallback((msg: string, opts?: ToastOptions) => show('success', msg, opts), [show])
  const info = useCallback((msg: string, opts?: ToastOptions) => show('info', msg, opts), [show])
  const error = useCallback((msg: string, opts?: ToastOptions) => show('error', msg, opts), [show])

  return (
    <ToastContext.Provider value={{ show, success, info, error, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/**
 * useToast Hook
 * 如果在 ToastProvider 内部则使用全局 Toast，
 * 如果在独立测试等无 Provider 环境下，自适应提供局部状态并渲染局部 ToastContainer，
 * 保证 100% 健壮性与测试兼容性。
 */
export function useToast() {
  const context = useContext(ToastContext)
  const [localToasts, setLocalToasts] = useState<ToastItem[]>([])

  const localDismiss = useCallback((id: string) => {
    setLocalToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const localShow = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `local-toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const duration = options?.duration ?? (import.meta.env.MODE === 'test' ? 0 : 3500)
    const newToast: ToastItem = {
      id,
      type,
      message,
      action: options?.action,
      duration,
    }
    setLocalToasts([newToast])
    return id
  }, [])

  if (context) {
    return {
      ...context,
      ToastPortal: null,
    }
  }

  return {
    show: localShow,
    success: (msg: string, opts?: ToastOptions) => localShow('success', msg, opts),
    info: (msg: string, opts?: ToastOptions) => localShow('info', msg, opts),
    error: (msg: string, opts?: ToastOptions) => localShow('error', msg, opts),
    dismiss: localDismiss,
    ToastPortal: <ToastContainer toasts={localToasts} onDismiss={localDismiss} />,
  }
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="toast-viewport" aria-label="通知提示">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  const isTest = import.meta.env.MODE === 'test'

  useEffect(() => {
    if (isTest || toast.duration <= 0) return
    const timer = setTimeout(() => {
      onDismiss()
    }, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration, onDismiss, isTest])

  return (
    <motion.div
      layout={!isTest}
      initial={isTest ? false : { opacity: 0, y: -16, scale: 0.95 }}
      animate={isTest ? false : { opacity: 1, y: 0, scale: 1 }}
      exit={isTest ? undefined : { opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`toast-card toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-icon-wrapper" aria-hidden="true">
        {toast.type === 'success' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {toast.type === 'info' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="toast-icon info">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
        {toast.type === 'error' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="toast-icon error">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </div>

      <div className="toast-content">{toast.message}</div>

      {toast.action && (
        <button
          type="button"
          className="toast-action-btn"
          onClick={e => {
            e.stopPropagation()
            toast.action?.onClick()
            onDismiss()
          }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        className="toast-close-btn"
        aria-label="关闭提示"
        onClick={e => {
          e.stopPropagation()
          onDismiss()
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  )
}
