import { ReactNode } from 'react'
import { Button, Card } from '@heroui/react'
import { Plus } from 'lucide-react'

export type EmptyStateCardProps = {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyStateCard({
  title,
  description,
  icon,
  actionLabel,
  onAction
}: EmptyStateCardProps) {
  return (
    <Card className="empty-state-card" role="region" aria-label={title}>
      <Card.Content className="empty-state-content">
        {icon && <div className="empty-state-icon-box">{icon}</div>}
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-desc">{description}</p>
        {actionLabel && onAction && (
          <div className="empty-state-action-box">
            <Button
              variant="primary"
              onPress={onAction}
            >
              <Plus size={16} aria-hidden="true" />
              {actionLabel}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  )
}
