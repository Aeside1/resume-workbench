import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from './clipboard'

describe('copyToClipboard 跨浏览器剪贴板复制工具', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('优先使用 navigator.clipboard.writeText 进行复制', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    })

    const result = await copyToClipboard('Hello World')
    expect(result).toBe(true)
    expect(writeTextMock).toHaveBeenCalledWith('Hello World')
  })

  it('若 navigator.clipboard 抛错则优雅回退并返回 false', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
      }
    })

    const result = await copyToClipboard('Hello Error')
    expect(result).toBe(false)
  })
})
