import type { SaveStatus } from './useTransientSaveStatus'

/**
 * 把同一屏上多个保存来源的状态汇总成顶栏那一条。
 *
 * 为什么要汇总：画布卡片、Zen 写作区、新建表单各自跑自己的保存队列，
 * 却共用顶栏同一个 Chip。单纯「后报的覆盖先报的」会让一个来源刚写完的
 * `saved` 盖掉另一个来源仍在途的 `saving`——界面又会开始说没事（issue #8）。
 *
 * 优先级即「离落盘还有多远」：
 * - `unsaved` > `saving` > `saved` > `idle`
 *
 * 也就是说，只要还有任何一处内容没落盘，顶栏就不许宣称一切正常。
 */
export function aggregateSaveStatus(statuses: readonly SaveStatus[]): SaveStatus {
  if (statuses.includes('unsaved')) return 'unsaved'
  if (statuses.includes('saving')) return 'saving'
  if (statuses.includes('saved')) return 'saved'
  return 'idle'
}
