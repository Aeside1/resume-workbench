import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

const THEME_STORAGE_KEY = 'heroui-theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-theme')
})

afterEach(cleanup)

describe('ThemeToggle 深浅色切换', () => {
  it('默认（系统偏好为浅色）渲染出一个未开启的深色模式开关', () => {
    render(<ThemeToggle />)

    const toggle = screen.getByRole('switch', { name: '深色模式' })
    expect(toggle).not.toBeChecked()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('开启后把 <html> 切到深色并持久化偏好', async () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('switch', { name: '深色模式' }))

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('再次关闭后回到浅色并持久化偏好', async () => {
    render(<ThemeToggle />)
    const toggle = screen.getByRole('switch', { name: '深色模式' })

    fireEvent.click(toggle)
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))

    fireEvent.click(toggle)
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('已持久化的深色偏好在挂载时即生效', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    render(<ThemeToggle />)

    expect(screen.getByRole('switch', { name: '深色模式' })).toBeChecked()
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })
})
