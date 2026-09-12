import { Button } from '@heroui/react'
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
  const unarchivedContents = contents.filter((item) => !item.archived)
  const totalItemsCount = unarchivedContents.length

  return (
    <aside className="outline-navigator-container" aria-label="经历目录大纲">
      <div className="outline-card">
        <div className="outline-header">
          <div className="outline-header-title-box">
            <svg
              className="outline-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="21" x2="3" y1="6" y2="6" />
              <line x1="15" x2="3" y1="12" y2="12" />
              <line x1="17" x2="3" y1="18" y2="18" />
            </svg>
            <h3 className="outline-title">经历大纲</h3>
          </div>
        </div>

        <nav className="outline-nav-list" aria-label="大纲导航">
          <button
            type="button"
            className={`outline-nav-item ${activeKey === 'section-overview' ? 'active' : ''}`}
            aria-current={activeKey === 'section-overview' ? 'location' : undefined}
            onClick={() => onNavigate('section-overview')}
          >
            <span className="outline-bullet" aria-hidden="true" />
            <span className="outline-item-text">经历概况</span>
          </button>

          {contents.map((item, index) => {
            const itemKey = `work-content-${item.id}`
            const isActive = activeKey === itemKey
            return (
              <button
                key={item.id}
                type="button"
                className={`outline-nav-item ${isActive ? 'active' : ''} ${item.archived ? 'archived' : ''}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => onNavigate(itemKey)}
              >
                <span className="outline-bullet" aria-hidden="true" />
                <span className="outline-item-text">
                  <span className="outline-item-num">{index + 1}.</span> {item.title}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="outline-action-section">
          <Button
            size="sm"
            variant="ghost"
            className="outline-add-btn"
            onPress={onAddNew}
          >
            + 新增工作内容
          </Button>
        </div>

        <div className="outline-stats-footer">
          <div className="stats-row">
            <span className="stats-label">已沉淀工作项</span>
            <span className="stats-value">{totalItemsCount}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">多版本简历资产</span>
            <span className="stats-value">{totalItemsCount * 2}+</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
