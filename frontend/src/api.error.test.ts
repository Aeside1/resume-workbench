import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, isReferenceBlocked } from './api'

afterEach(() => vi.unstubAllGlobals())

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response

describe('接口错误语义（04j）', () => {
  it('非 2xx 抛出 ApiError，携带后端 detail 与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(409, { detail: '该内容正被简历方案《Test》引用，请先在方案中移除或替换对应条目，再执行删除。' })
      )
    )

    await expect(api.updateWorkContent('token', 1, { title: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: '该内容正被简历方案《Test》引用，请先在方案中移除或替换对应条目，再执行删除。'
    })
  })

  it('后端没有 detail 时给出兜底文案', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, {})))

    await expect(api.deleteWorkContent('token', 1)).rejects.toMatchObject({ status: 500 })
  })

  it('isReferenceBlocked 只对 409 为真', () => {
    expect(isReferenceBlocked(new ApiError('被引用', 409))).toBe(true)
    expect(isReferenceBlocked(new ApiError('服务异常', 500))).toBe(false)
    expect(isReferenceBlocked(new Error('普通错误'))).toBe(false)
    expect(isReferenceBlocked(undefined)).toBe(false)
  })
})
