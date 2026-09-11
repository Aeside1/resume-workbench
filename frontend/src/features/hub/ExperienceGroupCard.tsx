import { MouseEvent } from 'react'
import { Button, Card } from '@heroui/react'
import type { ExperienceGroup } from '../../api'

export type ExperienceGroupCardProps = {
  group: ExperienceGroup
  workContentCount?: number
  onSelect: (group: ExperienceGroup) => void
  onArchive: (group: ExperienceGroup) => void
  onRestore: (group: ExperienceGroup) => void
}

export function ExperienceGroupCard({
  group,
  workContentCount = 0,
  onSelect,
  onArchive,
  onRestore
}: ExperienceGroupCardProps) {
  const isArchived = group.archived
  const dateText = group.start_date || group.end_date
    ? `${group.start_date || '至今'} — ${group.end_date || '至今'}`
    : '未设置起止时间'

  const handleBodyClick = () => {
    onSelect(group)
  }

  const handleArchive = (e?: MouseEvent | unknown) => {
    if (e && typeof (e as MouseEvent).stopPropagation === 'function') {
      (e as MouseEvent).stopPropagation()
    }
    onArchive(group)
  }

  const handleRestore = (e?: MouseEvent | unknown) => {
    if (e && typeof (e as MouseEvent).stopPropagation === 'function') {
      (e as MouseEvent).stopPropagation()
    }
    onRestore(group)
  }

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
              <h3 className="group-card-name">{group.name}</h3>
              <div className="group-card-badges">
                <span className={`group-type-badge type-${group.type}`}>
                  {group.type === 'internship' ? '实习经历' : '项目经历'}
                </span>
                {isArchived && (
                  <span className="group-archived-badge">已归档</span>
                )}
              </div>
            </div>
            <p className="group-card-org">{group.organization || '未填写归属'}</p>
          </div>
        </Card.Header>

        <Card.Content className="group-card-content">
          <div className="group-card-date">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>{dateText}</span>
          </div>

          <p className="group-card-description">
            {group.description || '还没有整体说明。'}
          </p>
        </Card.Content>
      </div>

      <Card.Footer
        className="group-card-footer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="group-card-count">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
          <span>{workContentCount} 项具体工作</span>
        </div>

        <div className="group-card-actions">
          {isArchived ? (
            <Button
              size="sm"
              variant="outline"
              className="group-action-btn btn-restore"
              aria-label="恢复经历分组"
              onPress={handleRestore}
              onClick={handleRestore}
            >
              恢复经历分组
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="group-action-btn btn-archive"
              aria-label="归档经历分组"
              onPress={handleArchive}
              onClick={handleArchive}
            >
              归档经历分组
            </Button>
          )}
        </div>
      </Card.Footer>
    </Card>
  )
}
