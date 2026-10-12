import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSaveQueue } from './useSaveQueue'

/**
 * 保存队列（issue #8）在途时不再丢弃后续草稿，而是「回来补发一笔」。
 * 这里只测队列自己的公共接口：request / flush / resetBaseline / status。
 */

type Draft = { title: string; body: string }

const getSignature = (draft: Draft) => `${draft.title.trim()}|||${draft.body}`

const BASE: Draft = { title: '项目', body: '已落盘内容' }

describe('useSaveQueue：在途不再丢尾段（issue #8）', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('内容与已落盘一致时不发请求：重复 request / flush 都不会多打一笔', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )

    act(() => result.current.resetBaseline(BASE))
    act(() => result.current.request(BASE))
    act(() => result.current.flush(BASE))

    await new Promise((resolve) => setTimeout(resolve, 120))

    expect(persist).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('防抖等待期间也显示 unsaved，直到请求真正落盘', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 80 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: '尚未落盘' }))
    expect(result.current.status).toBe('unsaved')
    expect(persist).not.toHaveBeenCalled()

    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('防抖期间改回已落盘内容会清掉 unsaved，不留下过期提示', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const onStatusChange = vi.fn()
    const { result } = renderHook(() =>
      useSaveQueue<Draft>({
        getSignature,
        persist,
        onStatusChange,
        debounceMs: 500
      })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: '临时修改' }))
    expect(result.current.status).toBe('unsaved')

    act(() => result.current.request(BASE))
    expect(result.current.status).toBe('idle')
    expect(onStatusChange).toHaveBeenLastCalledWith('idle')
    expect(persist).not.toHaveBeenCalled()
  })

  it('卸载后在途请求失败仍把 unsaved 上报给外壳', async () => {
    let rejectPersist: (error: Error) => void = () => {}
    const persist = vi.fn(
      () => new Promise<void>((_resolve, reject) => { rejectPersist = reject })
    )
    const onStatusChange = vi.fn()
    const { result, unmount } = renderHook(() =>
      useSaveQueue<Draft>({
        getSignature,
        persist,
        onStatusChange,
        debounceMs: 20
      })
    )
    act(() => result.current.resetBaseline(BASE))
    act(() => result.current.request({ title: '项目', body: '卸载前的修改' }))
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))

    unmount()
    rejectPersist(new Error('offline'))

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('unsaved'))
  })

  it('在途请求失败但期间已有更新草稿时，会继续补发最新草稿', async () => {
    const resolvers: Array<{ resolve?: () => void; reject?: () => void }> = []
    const persist = vi.fn(
      () => new Promise<void>((resolve, reject) => { resolvers.push({ resolve, reject }) })
    )
    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: 'A' }))
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))
    act(() => result.current.request({ title: '项目', body: 'B' }))

    resolvers[0].reject?.()
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(2))
    expect(persist).toHaveBeenLastCalledWith({ title: '项目', body: 'B' })

    resolvers[1].resolve?.()
    await waitFor(() => expect(result.current.status).toBe('saved'))
  })

  it('在途期间连打 10 次只产生一笔补发，且补发的是最新草稿（请求数不滚雪球）', async () => {
    const resolvers: Array<() => void> = []
    const persist = vi.fn(
      () => new Promise<void>((resolve) => { resolvers.push(resolve) })
    )

    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: 'v1' }))
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))

    for (let i = 2; i <= 11; i += 1) {
      act(() => result.current.request({ title: '项目', body: `v${i}` }))
    }

    act(() => resolvers[0]())
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(2))

    // 第一笔落盘后才发第二笔，且合并成一次（不是十次）
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith({ title: '项目', body: 'v11' })

    act(() => resolvers[1]())
    await waitFor(() => expect(result.current.status).toBe('saved'))
  })

  it('在途期间又来了新草稿时状态保持 saving，不会闪一下 saved（界面不说谎）', async () => {
    const resolvers: Array<() => void> = []
    const persist = vi.fn(
      () => new Promise<void>((resolve) => { resolvers.push(resolve) })
    )

    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: 'v1' }))
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))
    expect(result.current.status).toBe('saving')

    // 第一笔还在路上时用户又敲了字
    act(() => result.current.request({ title: '项目', body: 'v2' }))

    // 第一笔落地：还有内容没落盘，状态不能回落成 saved
    await act(async () => {
      resolvers[0]()
      await Promise.resolve()
    })
    expect(persist).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saving')

    await act(async () => {
      resolvers[1]()
      await Promise.resolve()
    })
    expect(result.current.status).toBe('saved')
  })

  it('保存失败时状态为 unsaved 且不自动重试，下一次触发可以再发一笔', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: 'v1' }))
    await waitFor(() => expect(result.current.status).toBe('unsaved'))

    // 失败后不无限重试：静置也不会自己再发
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(persist).toHaveBeenCalledTimes(1)

    persist.mockResolvedValue(undefined)
    act(() => result.current.request({ title: '项目', body: 'v1' }))
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(persist).toHaveBeenCalledTimes(2)
  })

  it('卸载时不会自动重试刚失败过的签名（否则会把已删记录再写一次）', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('offline'))
    const { result, unmount } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 20 })
    )
    act(() => result.current.resetBaseline(BASE))
    act(() => result.current.request({ title: '项目', body: '失败的内容' }))

    // 等它真的发出去并失败落地（status 在防抖阶段就已经是 unsaved，不能拿它当完成信号）
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 30))

    unmount()
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('卸载时最新草稿若还没落盘则补发一笔（防抖未到点就走人也不丢）', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)

    const { result, unmount } = renderHook(() =>
      useSaveQueue<Draft>({ getSignature, persist, debounceMs: 5000 })
    )
    act(() => result.current.resetBaseline(BASE))

    act(() => result.current.request({ title: '项目', body: '刚敲下就走人' }))
    expect(persist).not.toHaveBeenCalled()

    unmount()

    await waitFor(() =>
      expect(persist).toHaveBeenCalledWith({ title: '项目', body: '刚敲下就走人' })
    )
  })
})
