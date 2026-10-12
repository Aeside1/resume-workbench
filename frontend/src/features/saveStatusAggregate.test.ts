import { describe, expect, it } from 'vitest'
import { aggregateSaveStatus } from './saveStatusAggregate'
import type { SaveStatus } from './useTransientSaveStatus'

describe('aggregateSaveStatus：多来源保存态汇总（issue #8）', () => {
  it('没有来源时是 idle', () => {
    expect(aggregateSaveStatus([])).toBe('idle')
    expect(aggregateSaveStatus(['idle', 'idle'])).toBe('idle')
  })

  it('一个来源的 saved 不能盖掉另一个来源在途的 saving', () => {
    const statuses: SaveStatus[] = ['saved', 'saving']
    expect(aggregateSaveStatus(statuses)).toBe('saving')
    // 顺序无关
    expect(aggregateSaveStatus([...statuses].reverse())).toBe('saving')
  })

  it('只要还有内容没落盘就是 unsaved，哪怕别处正在保存或已保存', () => {
    expect(aggregateSaveStatus(['saved', 'saving', 'unsaved'])).toBe('unsaved')
    expect(aggregateSaveStatus(['unsaved', 'idle'])).toBe('unsaved')
  })

  it('全部落盘时才是 saved', () => {
    expect(aggregateSaveStatus(['saved', 'saved'])).toBe('saved')
    expect(aggregateSaveStatus(['saved', 'idle'])).toBe('saved')
  })
})
