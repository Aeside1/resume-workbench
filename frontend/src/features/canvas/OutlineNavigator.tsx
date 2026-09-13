import { Button, Card, Chip } from '@heroui/react'
import { ListTree, Plus } from 'lucide-react'
import type { ExperienceGroup, WorkContent } from '../../api'

export type OutlineNavigatorProps = {
  group: ExperienceGroup
  contents: WorkContent[]
  activeId: string | null
  onNavigate: (targetId: string) => void
  onAddNew: () => void
}

export function OutlineNavigator({
  group: _group,
  contents,
  activeId,
  onNavigate,
  onAddNew
}: OutlineNavigatorProps) {
  const activeKey = activeId || 'section-overview'

  return (
    <aside className="outline-navigator-container" aria-label="经历目录大纲">
      <Card className="outline-card">
        <div className="outline-header">
          <div className="outline-header-title-box">
            <ListTree className="outline-icon" size={16} aria-hidden="true" />
            <h3 className="outline-title">经历大纲</h3>
          </div>
        </div>

        <nav className="outline-nav-list" aria-label="大纲导航">
          <Button
            size="sm"
            variant="ghost"
            fullWidth
            className={`outline-nav-item outline-nav-item--parent${activeKey === 'section-overview' ? ' active' : ''}`}
            aria-current={activeKey === 'section-overview' ? 'location' : undefined}
            onPress={() => onNavigate('section-overview')}
          >
            <span className="outline-bullet" aria-hidden="true" />
            <span className="outline-item-text">经历概况</span>
          </Button>

          <div className="outline-tree-branch">
            <div className="outline-branch-label">
              <span className="outline-branch-title">具体工作内容</span>
              <Chip size="sm">({contents.length})</Chip>
            </div>

            <div className="outline-sub-list">
              {contents.map((item, index) => {
                const itemKey = `work-content-${item.id}`
                const isActive = activeKey === itemKey
                return (
                  <Button
                    key={item.id}
                    size="sm"
                    variant="ghost"
                    fullWidth
                    className={`outline-nav-item outline-nav-item--child${isActive ? ' active' : ''}${item.archived ? ' archived' : ''}`}
                    aria-current={isActive ? 'location' : undefined}
                    onPress={() => onNavigate(itemKey)}
                  >
                    <span className="outline-bullet outline-bullet--child" aria-hidden="true" />
                    <span className="outline-item-text">
                      <span className="outline-item-num">{index + 1}.</span> {item.title}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="outline-action-section">
          <Button
            size="sm"
            variant="outline"
            fullWidth
            onPress={onAddNew}
          >
            <Plus size={14} aria-hidden="true" />
            新增工作内容
          </Button>
        </div>
      </Card>
    </aside>
  )
}
