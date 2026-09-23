/**
 * 测试用的 `window.matchMedia` 替身。
 *
 * jsdom 未实现 `matchMedia`（HeroUI 的主题、本案的「减少动态效果」偏好都依赖它）。
 * 替身忽略具体查询串、只回放当前设定值，并如实登记 `change` 监听者，
 * 便于测试驱动「偏好中途改变」这条订阅路径（而不是只测首次渲染读到的值）。
 *
 * 注意：不要在这里于模块加载时缓存「原来的」`window.matchMedia`——`setup.ts` 会在
 * 本模块被导入之后才补上默认替身，那时缓存到的是 jsdom 的 `undefined`（踩过一次）。
 * 「还原」的语义就取「装回环境默认」（不减少动态效果）。
 */
export function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<() => void>()

  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia

  return {
    /** 改写偏好值，并通知所有已注册的 change 监听者（真实浏览器里这由系统偏好变更触发） */
    set(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener())
    }
  }
}

/** 还原成环境默认（不减少动态效果）；各测试文件在 afterEach 里调 */
export function restoreMatchMedia() {
  stubMatchMedia(false)
}
