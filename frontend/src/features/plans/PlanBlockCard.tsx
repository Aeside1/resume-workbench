import { useState } from 'react'
import { Button, Card, Chip, Switch } from '@heroui/react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { PlanBlock, PlanItem } from '../../api'

export type PlanBlockCardProps = {
  block: PlanBlock
  index: number
  total: number
  onAddHighlight: (block: PlanBlock) => void
  onRemoveBlock: (block: PlanBlock) => void
  onMoveBlock: (block: PlanBlock, direction: -1 | 1) => void
  onToggleTitles: (block: PlanBlock, value: boolean) => void
  onRemoveItem: (block: PlanBlock, item: PlanItem) => void
  onMoveItem: (block: PlanBlock, index: number, direction: -1 | 1) => void
  onReorderItem: (block: PlanBlock, sourceIndex: number, targetIndex: number) => void
}

const STATUS_LABEL: Record<PlanItem['status'], string> = {
  ok: '',
  missing_highlight: '待选简历亮点',
  missing_source: '引用已失效'
}

/**
 * 简历大纲里的一段经历（经历块）：抬头 + 块内简历条目 + 挑亮点入口。
 *
 * 排序有两级：块之间的上移/下移在这里；块内条目既能拖动，也能用上移/下移按钮
 * （键盘可达，不依赖指针）。
 */
export function PlanBlockCard({
  block,
  index,
  total,
  onAddHighlight,
  onRemoveBlock,
  onMoveBlock,
  onToggleTitles,
  onRemoveItem,
  onMoveItem,
  onReorderItem
}: PlanBlockCardProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const period = [block.start_date?.slice(0, 7), block.end_date?.slice(0, 7)].filter(Boolean).join(' – ')
  const subtitle = [block.organization, period].filter(Boolean).join(' · ')

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      return
    }
    onReorderItem(block, draggedIndex, targetIndex)
    setDraggedIndex(null)
  }

  return (
    <Card role="article" className="plan-block-card" aria-label={`经历块 ${block.name}`}>
      <Card.Header className="plan-block-header">
        <div className="plan-block-heading">
          <h4 className="plan-block-name">{block.name}</h4>
          {subtitle && <p className="plan-block-subtitle">{subtitle}</p>}
        </div>

        <div className="plan-block-actions">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`上移经历块 ${block.name}`}
            isDisabled={index === 0}
            onPress={() => onMoveBlock(block, -1)}
          >
            <ArrowUp size={14} aria-hidden="true" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`下移经历块 ${block.name}`}
            isDisabled={index === total - 1}
            onPress={() => onMoveBlock(block, 1)}
          >
            <ArrowDown size={14} aria-hidden="true" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`移除经历块 ${block.name}`}
            onPress={() => onRemoveBlock(block)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      </Card.Header>

      <Card.Content className="plan-block-content">
        <div className="plan-block-toggle">
          <Switch
            isSelected={block.show_work_content_titles}
            onChange={(isSelected) => onToggleTitles(block, isSelected)}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              显示工作内容标题
            </Switch.Content>
          </Switch>
        </div>

        <ul className="plan-item-list" aria-label={`${block.name} 的简历条目`}>
          {block.items.map((item, itemIndex) => (
            <li
              key={item.id}
              className="plan-item-row"
              draggable
              onDragStart={() => setDraggedIndex(itemIndex)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(itemIndex)
              }}
              onDragEnd={() => setDraggedIndex(null)}
            >
              <span className="plan-item-drag" aria-hidden="true">
                <GripVertical size={14} />
              </span>

              <div className="plan-item-main">
                {item.status === 'ok' ? (
                  <span className="plan-item-label">{item.highlight_label}</span>
                ) : (
                  <Chip size="sm">
                    <Chip.Label>{STATUS_LABEL[item.status]}</Chip.Label>
                  </Chip>
                )}
                {block.show_work_content_titles && item.work_content_title && (
                  <span className="plan-item-source">{item.work_content_title}</span>
                )}
              </div>

              <div className="plan-item-actions">
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`上移条目 ${item.highlight_label ?? item.id}`}
                  isDisabled={itemIndex === 0}
                  onPress={() => onMoveItem(block, itemIndex, -1)}
                >
                  <ArrowUp size={13} aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`下移条目 ${item.highlight_label ?? item.id}`}
                  isDisabled={itemIndex === block.items.length - 1}
                  onPress={() => onMoveItem(block, itemIndex, 1)}
                >
                  <ArrowDown size={13} aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`移除条目 ${item.highlight_label ?? item.id}`}
                  onPress={() => onRemoveItem(block, item)}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}

          {block.items.length === 0 && (
            <li className="plan-item-empty">还没有简历亮点：点下面的「添加亮点」从这段经历里挑。</li>
          )}
        </ul>

        <Button
          size="sm"
          variant="secondary"
          aria-label={`添加亮点到 ${block.name}`}
          onPress={() => onAddHighlight(block)}
        >
          <Plus size={14} aria-hidden="true" />
          添加亮点
        </Button>
      </Card.Content>
    </Card>
  )
}
