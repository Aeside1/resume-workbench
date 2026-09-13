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

// jsdom 未实现 ResizeObserver，而 HeroUI 的 ScrollShadow（Tabs.ListContainer 会用到）
// 依赖它观察列表宽度；这里提供空实现，仅在测试环境补足浏览器 API。
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserverStub
  })
}

// jsdom 同样未实现 Web Animations API，而 React Aria 的 SelectionIndicator
// （HeroUI 的 Tabs.Indicator 用它做选中态平滑位移）会读取 element.getAnimations()。
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => []
}

// 主题状态会写到 <html> 上，测试之间需要复位，避免相互污染。
afterEach(() => {
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-theme')
})
