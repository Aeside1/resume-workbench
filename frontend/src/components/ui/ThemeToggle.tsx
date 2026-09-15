import { Switch, useTheme } from '@heroui/react'

export type ThemeToggleProps = {
  /** 侧栏折叠时只留开关轨道；可访问名由 aria-label 保证 */
  showLabel?: boolean
}

/**
 * 全站深浅色切换入口。
 *
 * 直接使用 HeroUI v3 内置的 `useTheme`：它把解析后的主题写到 `<html>` 的 class 与
 * `data-theme` 属性上，并以 `heroui-theme` 为键持久化用户意图（含 `system`）。
 */
export function ThemeToggle({ showLabel = true }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Switch
      aria-label="深色模式"
      isSelected={isDark}
      onChange={(isSelected) => setTheme(isSelected ? 'dark' : 'light')}
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {showLabel && '深色模式'}
      </Switch.Content>
    </Switch>
  )
}
