import { useState } from 'react'
import { Button, Input, TextArea } from '@heroui/react'

export type ResumeDescriptionItem = {
  id: string
  tag: string
  bullets: string[]
}

export type ResumeDescriptionTabsProps = {
  workContentId: number
  descriptions?: ResumeDescriptionItem[]
  onChange?: (descriptions: ResumeDescriptionItem[]) => void
}

const defaultInitialVersions = (id: number): ResumeDescriptionItem[] => [
  {
    id: `desc-${id}-tech`,
    tag: '技术深度版',
    bullets: ['主导核心模块架构设计与性能优化，解决高并发与复杂状态同步难题。']
  },
  {
    id: `desc-${id}-biz`,
    tag: '业务结果版',
    bullets: ['推动核心业务流程敏捷交付，提升端到端执行效率与用户满意度。']
  }
]

export function ResumeDescriptionTabs({
  workContentId,
  descriptions: externalDescriptions,
  onChange
}: ResumeDescriptionTabsProps) {
  const [descriptions, setDescriptions] = useState<ResumeDescriptionItem[]>(() =>
    externalDescriptions && externalDescriptions.length > 0
      ? externalDescriptions
      : defaultInitialVersions(workContentId)
  )

  const [activeId, setActiveId] = useState<string>(() =>
    descriptions[0]?.id ?? ''
  )
  const [isAdding, setIsAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newBulletsText, setNewBulletsText] = useState('')

  const activeItem = descriptions.find((item) => item.id === activeId) ?? descriptions[0]

  const handleSaveNew = () => {
    if (!newTag.trim()) return

    const bullets = newBulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    const newItem: ResumeDescriptionItem = {
      id: `desc-${workContentId}-${Date.now()}`,
      tag: newTag.trim(),
      bullets: bullets.length > 0 ? bullets : ['暂无描述要点']
    }

    const updated = [...descriptions, newItem]
    setDescriptions(updated)
    setActiveId(newItem.id)
    setIsAdding(false)
    setNewTag('')
    setNewBulletsText('')
    onChange?.(updated)
  }

  return (
    <div className="resume-desc-container">
      <div className="resume-desc-header">
        <div className="resume-desc-tabs-bar" role="tablist" aria-label="简历描述版本">
          {descriptions.map((item) => {
            const isSelected = item.id === (activeItem?.id ?? '')
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`resume-desc-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                {item.tag}
              </button>
            )
          })}
          {!isAdding && (
            <Button
              size="sm"
              variant="ghost"
              className="add-desc-tab-btn"
              onPress={() => setIsAdding(true)}
            >
              + 新增写法
            </Button>
          )}
        </div>
        <span className="resume-asset-badge">简历内容资产 · 供方案直接引用</span>
      </div>

      {isAdding ? (
        <div className="resume-desc-add-panel">
          <div className="resume-desc-field">
            <label htmlFor={`tag-input-${workContentId}`}>版本标签</label>
            <Input
              id={`tag-input-${workContentId}`}
              placeholder="例如：管理与协同版、海外业务版"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
          </div>
          <div className="resume-desc-field">
            <label htmlFor={`bullets-input-${workContentId}`}>简历描述要点 (每行一条)</label>
            <TextArea
              id={`bullets-input-${workContentId}`}
              placeholder="输入该版本的 bullet points，每行一条..."
              rows={3}
              value={newBulletsText}
              onChange={(e) => setNewBulletsText(e.target.value)}
            />
          </div>
          <div className="resume-desc-add-actions">
            <Button
              size="sm"
              variant="primary"
              onPress={handleSaveNew}
            >
              保存新写法
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setIsAdding(false)
                setNewTag('')
                setNewBulletsText('')
              }}
            >
              取消新增
            </Button>
          </div>
        </div>
      ) : (
        <div className="resume-desc-content-panel" role="tabpanel">
          {activeItem && activeItem.bullets.length > 0 ? (
            <ul className="resume-bullets-list">
              {activeItem.bullets.map((bullet, idx) => (
                <li key={idx} className="resume-bullet-item">
                  <span className="bullet-dot" aria-hidden="true">•</span>
                  <span className="bullet-text">{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="resume-empty-bullets">暂无此版本简历描述</p>
          )}
        </div>
      )}
    </div>
  )
}
