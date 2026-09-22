import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusEnterMotion } from './useFocusEnterMotion'
import { stubMatchMedia } from '../test/matchMedia'

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('useFocusEnterMotion 展开专注的入场动画参数（04l）', () => {
  it('默认：返回可直接展开到 motion 组件上的入场参数（页头与写作区共用同一份）', () => {
    stubMatchMedia(false)

    const { result } = renderHook(() => useFocusEnterMotion())

    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })
    expect(result.current.animate).toEqual({ opacity: 1, y: 0 })
    expect(result.current.transition).toEqual({ duration: 0.22, ease: [0.16, 1, 0.3, 1] })
  })

  it('系统开启「减少动态效果」时不播动画，直接落位', () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useFocusEnterMotion())

    expect(result.current).toEqual({ initial: false })
  })

  it('偏好中途改变时立刻生效：订阅 matchMedia 的 change，而不是只在首次渲染读一次', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useFocusEnterMotion())
    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })

    // 不重新挂载、也不 rerender：只让系统偏好变更事件打过来
    act(() => media.set(true))
    expect(result.current).toEqual({ initial: false })

    act(() => media.set(false))
    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })
  })
})
