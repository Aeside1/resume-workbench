import { Button, Card, Chip } from '@heroui/react'
import { Archive, FileText, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { ResumePlan } from '../../api'

export type PlanCardProps = {
  plan: ResumePlan
  blockCount?: number
  onSelect: (plan: ResumePlan) => void
  onEdit?: (plan: ResumePlan) => void
  onArchive?: (plan: ResumePlan) => void
  onRestore?: (plan: ResumePlan) => void
  onDelete?: (plan: ResumePlan) => void
}

/**
 * 简历方案卡片（一张卡片 = 一个岗位方向的一版简历）。
 * 卡片主体点击进入简历编排；Footer 的操作区与主体物理解耦（AGENTS.md 第 2 条）。
 */
export function PlanCard({ plan, blockCount = 0, onSelect, onEdit, onArchive, onRestore, onDelete }: PlanCardProps) {
  const isArchived = plan.archived
  const updatedAt = plan.updated_at ? plan.updated_at.slice(0, 10) : ''

  const handleBodyClick = () => onSelect(plan)

  return (
    <Card role="article" className={`plan-card ${isArchived ? 'plan-card--archived' : ''}`}>
      <div
        className="plan-card-clickable-area"
        onClick={handleBodyClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBodyClick()
          }
        }}
      >
        <Card.Header className="plan-card-header">
          <div className="plan-card-title-group">
            <div className="plan-card-top-row">
              <h3 className="plan-card-name" title={plan.name}>
                {plan.name}
              </h3>
              {isArchived && (
                <Chip size="sm">
                  <Chip.Label>已归档</Chip.Label>
                </Chip>
              )}
            </div>
            <p className="plan-card-purpose" title={plan.purpose || ''}>
              {plan.purpose || '未填写简历用途'}
            </p>
          </div>
        </Card.Header>

        <Card.Content className="plan-card-content">
          <p className="plan-card-meta">最后更新：{updatedAt || '—'}</p>
        </Card.Content>
      </div>

      <Card.Footer className="plan-card-footer">
        <div className="plan-card-count">
          <FileText size={14} aria-hidden="true" />
          <span>{blockCount} 段经历</span>
        </div>

        <div className="plan-card-actions">
          {isArchived ? (
            <>
              <Button size="sm" variant="outline" aria-label="恢复简历方案" onPress={() => onRestore?.(plan)}>
                <RotateCcw size={14} aria-hidden="true" />
                恢复简历方案
              </Button>
              <Button size="sm" variant="danger" aria-label="彻底删除简历方案" onPress={() => onDelete?.(plan)}>
                <Trash2 size={14} aria-hidden="true" />
                彻底删除
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" aria-label="编辑简历方案" onPress={() => onEdit?.(plan)}>
                <Pencil size={14} aria-hidden="true" />
                编辑
              </Button>
              <Button size="sm" variant="ghost" aria-label="归档简历方案" onPress={() => onArchive?.(plan)}>
                <Archive size={14} aria-hidden="true" />
                归档简历方案
              </Button>
            </>
          )}
        </div>
      </Card.Footer>
    </Card>
  )
}
