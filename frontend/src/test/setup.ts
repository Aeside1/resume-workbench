import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// jsdom 未实现 matchMedia，而 HeroUI 的 useTheme 依赖它读取系统配色偏好。
// 这里提供一个可被单个测试覆盖的默认实现（默认解算为浅色）。
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia
}

// 主题状态会写到 <html> 上，测试之间需要复位，避免相互污染。
afterEach(() => {
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-theme')
})
