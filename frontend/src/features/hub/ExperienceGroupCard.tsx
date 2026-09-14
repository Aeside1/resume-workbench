import { MouseEvent } from 'react'
import { Button, Card, Chip } from '@heroui/react'
import { Archive, Calendar, FileText, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { ExperienceGroup } from '../../api'

export type ExperienceGroupCardProps = {
  group: ExperienceGroup
  workContentCount?: number
  onSelect: (group: ExperienceGroup) => void
  onEdit?: (group: ExperienceGroup) => void
  onArchive?: (group: ExperienceGroup) => void
  onRestore?: (group: ExperienceGroup) => void
  onDelete?: (group: ExperienceGroup) => void
}

export function ExperienceGroupCard({
  group,
  workContentCount = 0,
  onSelect,
  onEdit,
  onArchive,
  onRestore,
  onDelete
}: ExperienceGroupCardProps) {
  const isArchived = group.archived
  const isProject = group.type === 'project'
  const dateText = group.start_date || group.end_date
    ? `${group.start_date || '至今'} — ${group.end_date || '至今'}`
    : '未设置起止时间'

  const handleBodyClick = () => {
    onSelect(group)
  }

  // 卡片主体点击区与 Footer 已物理分离，操作按钮无需再阻断冒泡
  const handleEdit = () => onEdit?.(group)
  const handleArchive = () => onArchive?.(group)
  const handleRestore = () => onRestore?.(group)
  const handleDelete = () => onDelete?.(group)

  return (
    <Card
      role="article"
      className={`experience-group-card ${isArchived ? 'experience-group-card--archived' : ''}`}
    >
      <div
        className="group-card-clickable-area"
        onClick={handleBodyClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBodyClick()
          }
        }}
      >
        <Card.Header className="group-card-header">
          <div className="group-card-title-group">
            <div className="group-card-top-row">
              <h3 className="group-card-name" title={group.name}>{group.name}</h3>
              <div className="group-card-badges">
                <Chip
                  size="sm"
                  className={isProject ? 'chip-project' : 'chip-type-internship'}
                >
                  <Chip.Label>{isProject ? '项目经历' : '实习经历'}</Chip.Label>
                </Chip>
                {isArchived && (
                  <Chip size="sm" className="chip-archived">
                    <Chip.Label>已归档</Chip.Label>
                  </Chip>
                )}
              </div>
            </div>
            <p className="group-card-org" title={group.organization || ''}>{group.organization || '未填写归属'}</p>
          </div>
        </Card.Header>

        <Card.Content className="group-card-content">
          <div className="group-card-date">
            <Calendar size={14} aria-hidden="true" />
            <span>{dateText}</span>
          </div>

          <p className="group-card-description" title={group.description || ''}>
            {group.description || '还没有整体说明。'}
          </p>
        </Card.Content>
      </div>

      <Card.Footer className="group-card-footer">
        <div className="group-card-count">
          <FileText size={14} aria-hidden="true" />
          <span>{workContentCount} 项具体工作</span>
        </div>

        <div className="group-card-actions">
          {isArchived ? (
            <>
              <Button
                size="sm"
                variant="outline"
                aria-label="恢复经历分组"
                onPress={handleRestore}
              >
                <RotateCcw size={14} aria-hidden="true" />
                恢复经历分组
              </Button>
              <Button
                size="sm"
                variant="danger"
                aria-label="彻底删除经历分组"
                onPress={handleDelete}
              >
                <Trash2 size={14} aria-hidden="true" />
                彻底删除
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                aria-label="编辑经历分组"
                onPress={handleEdit}
              >
                <Pencil size={14} aria-hidden="true" />
                编辑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="归档经历分组"
                onPress={handleArchive}
              >
                <Archive size={14} aria-hidden="true" />
                归档经历分组
              </Button>
            </>
          )}
        </div>
      </Card.Footer>
    </Card>
  )
}
