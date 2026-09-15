import { Button } from '@heroui/react'
import { PanelRightClose, RotateCcw } from 'lucide-react'
import type { PlanArchive } from '../../api'

export type PlanHistoryPanelProps = {
  archives: PlanArchive[]
  isLoading: boolean
  onRestore: (archive: PlanArchive) => void
  onClose: () => void
}

/** 留档时间的紧凑展示（本地时区，只到分钟） */
function formatTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * 方案历史版本面板（04e）。
 *
 * **非模态、可收起**（ADR 005 §2.5）：不遮主工作面，编排与回滚可以并排看。
 * 每次结构性变更都会自动留一条，回滚会把方案恢复到那一刻，并**追加**一条新记录
 * （历史只增不减）；引用已失效的条目会保留占位，不会静默消失。
 */
export function PlanHistoryPanel({ archives, isLoading, onRestore, onClose }: PlanHistoryPanelProps) {
  return (
    <aside className="plan-history-panel" aria-label="方案历史版本">
      <header className="plan-history-header">
        <h3 className="plan-history-title">历史版本</h3>
        <Button isIconOnly size="sm" variant="ghost" aria-label="收起历史版本" onPress={onClose}>
          <PanelRightClose size={15} aria-hidden="true" />
        </Button>
      </header>

      {isLoading ? (
        <p className="plan-history-hint">正在载入历史版本…</p>
      ) : archives.length === 0 ? (
        <p className="plan-history-hint">
          还没有历史留档。方案的结构调整（加经历、挑亮点、改顺序）都会在这里自动留一份，可随时回滚。
        </p>
      ) : (
        <ul className="plan-history-list">
          {archives.map((archive) => (
            <li key={archive.id} className="plan-history-row">
              <div className="plan-history-row-main">
                <span className="plan-history-time">{formatTime(archive.created_at)}</span>
                <span className="plan-history-summary">
                  {archive.summary || '结构调整'}
                  {archive.source === 'export' && '（导出快照）'}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`回滚到 ${archive.summary || '这一版'}`}
                onPress={() => onRestore(archive)}
              >
                <RotateCcw size={13} aria-hidden="true" />
                回滚
              </Button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
