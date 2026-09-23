import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { stubMatchMedia } from './matchMedia'

// jsdom 未实现 matchMedia，而 HeroUI 的 useTheme、以及本仓的「减少动态效果」偏好都依赖它。
// 默认解算为浅色 / 不减少动态效果；需要驱动的用例用 src/test/matchMedia.ts 的替身覆盖。
if (!window.matchMedia) {
  stubMatchMedia(false)
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

// jsdom 未实现 scrollIntoView，而「退出专注后回到原卡片位置」依赖一次
// scrollIntoView（FocusCanvasContainer 在关闭提交那一帧的 layout effect 里调）；
// 不补这一步，jsdom 会抛出未捕获的 TypeError（vitest 会记为 unhandled error）。
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// 主题状态会写到 <html> 上，测试之间需要复位，避免相互污染。
afterEach(() => {
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-theme')
})
