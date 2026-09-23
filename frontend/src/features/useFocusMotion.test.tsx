import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusMotion } from './useFocusMotion'
import { restoreMatchMedia, stubMatchMedia } from '../test/matchMedia'

afterEach(restoreMatchMedia)

describe('useFocusMotion 专注页的入场 / 退场参数（04l / 04m）', () => {
  it('入场：返回可直接展开到 motion 组件上的参数（页头与写作区共用同一份）', () => {
    stubMatchMedia(false)

    const { result } = renderHook(() => useFocusMotion('enter'))

    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })
    expect(result.current.animate).toEqual({ opacity: 1, y: 0 })
    expect(result.current.transition).toEqual({ duration: 0.22, ease: [0.16, 1, 0.3, 1] })
  })

  it('退场：向上淡出，且不重放 initial（元素此时已经挂载）', () => {
    stubMatchMedia(false)

    const { result } = renderHook(() => useFocusMotion('exit'))

    expect(result.current.initial).toBe(false)
    expect(result.current.animate).toEqual({ opacity: 0, y: -8 })
    expect(result.current.transition).toEqual({ duration: 0.16, ease: [0.16, 1, 0.3, 1] })
  })

  it('系统开启「减少动态效果」时两个相位都不播，直接落位', () => {
    stubMatchMedia(true)

    const enter = renderHook(() => useFocusMotion('enter'))
    const exit = renderHook(() => useFocusMotion('exit'))

    expect(enter.result.current).toEqual({ initial: false })
    expect(exit.result.current).toEqual({ initial: false })
  })

  it('偏好中途改变时立刻生效：订阅 matchMedia 的 change，而不是只在首次渲染读一次', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useFocusMotion('enter'))
    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })

    // 不重新挂载、也不 rerender：只让系统偏好变更事件打过来
    act(() => media.set(true))
    expect(result.current).toEqual({ initial: false })

    act(() => media.set(false))
    expect(result.current.initial).toEqual({ opacity: 0, y: 10 })
  })
})
