import { useState, useEffect } from 'react'
import { Button, Input } from '@heroui/react'
import { MilkdownView, MilkdownEditor } from '../../components/ui/MilkdownView'

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

const EMPTY_DESCRIPTIONS: ResumeDescriptionItem[] = []

export function ResumeDescriptionTabs({
  workContentId,
  descriptions: externalDescriptions = EMPTY_DESCRIPTIONS,
  onChange
}: ResumeDescriptionTabsProps) {
  const [descriptions, setDescriptions] = useState<ResumeDescriptionItem[]>(externalDescriptions)
  const [activeId, setActiveId] = useState<string>(() => descriptions[0]?.id ?? '')

  // 同步外部传入的 descriptions 变更
  useEffect(() => {
    setDescriptions(externalDescriptions)
    setActiveId((prev) => {
      if (externalDescriptions.some((d) => d.id === prev)) {
        return prev
      }
      return externalDescriptions[0]?.id ?? ''
    })
  }, [externalDescriptions])

  // 新增与编辑状态
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTag, setDraftTag] = useState('')
  const [draftBulletsText, setDraftBulletsText] = useState('')

  const activeItem = descriptions.find((item) => item.id === activeId) ?? descriptions[0]

  const handleStartAdd = () => {
    setEditingId(null)
    setDraftTag('')
    setDraftBulletsText('')
    setIsAdding(true)
  }

  const handleStartEdit = (item: ResumeDescriptionItem) => {
    setIsAdding(false)
    setEditingId(item.id)
    setDraftTag(item.tag)
    setDraftBulletsText(item.bullets.join('\n'))
  }

  const handleCancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setDraftTag('')
    setDraftBulletsText('')
  }

  const handleSave = () => {
    if (!draftTag.trim()) return

    const bullets = draftBulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    if (isAdding) {
      const newItem: ResumeDescriptionItem = {
        id: `desc-${workContentId}-${Date.now()}`,
        tag: draftTag.trim(),
        bullets: bullets.length > 0 ? bullets : ['暂无描述要点']
      }
      const updated = [...descriptions, newItem]
      setDescriptions(updated)
      setActiveId(newItem.id)
      handleCancelForm()
      onChange?.(updated)
    } else if (editingId) {
      const updated = descriptions.map((item) =>
        item.id === editingId
          ? {
              ...item,
              tag: draftTag.trim(),
              bullets: bullets.length > 0 ? bullets : ['暂无描述要点']
            }
          : item
      )
      setDescriptions(updated)
      handleCancelForm()
      onChange?.(updated)
    }
  }

  const handleDelete = (id: string) => {
    const target = descriptions.find((d) => d.id === id)
    const confirmed = window.confirm(`确定要删除简历描述写法“${target?.tag || '此版本'}”吗？`)
    if (!confirmed) return

    const updated = descriptions.filter((item) => item.id !== id)
    setDescriptions(updated)
    if (activeId === id) {
      setActiveId(updated[0]?.id ?? '')
    }
    onChange?.(updated)
  }

  const isFormOpen = isAdding || editingId !== null

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
                onClick={() => {
                  setActiveId(item.id)
                  handleCancelForm()
                }}
              >
                {item.tag}
              </button>
            )
          })}
          {!isFormOpen && (
            <Button
              size="sm"
              variant="ghost"
              className="add-desc-tab-btn"
              onPress={handleStartAdd}
            >
              + 新增写法
            </Button>
          )}
        </div>
      </div>

      {isFormOpen ? (
        <div className="resume-desc-add-panel">
          <div className="resume-desc-form-header">
            <span className="desc-form-title">{isAdding ? '新增简历描述写法' : `编辑写法：${draftTag}`}</span>
          </div>

          <div className="resume-desc-field">
            <label htmlFor={`tag-input-${workContentId}`}>版本标签</label>
            <Input
              id={`tag-input-${workContentId}`}
              placeholder="例如：技术深度版、业务结果版、管理协同版"
              value={draftTag}
              onChange={(e) => setDraftTag(e.target.value)}
            />
          </div>

          <div className="resume-desc-field">
            <label id={`bullets-input-${workContentId}-label`} htmlFor={`bullets-input-${workContentId}`}>
              简历描述要点 (每行一条)
            </label>
            <MilkdownEditor
              id={`bullets-input-${workContentId}`}
              cacheKey={`bullets-input-${workContentId}-${editingId || 'new'}`}
              placeholder="输入该版本的 bullet points，每行一条..."
              rows={3}
              value={draftBulletsText}
              onChange={setDraftBulletsText}
            />
          </div>

          <div className="resume-desc-add-actions">
            <Button
              size="sm"
              variant="primary"
              onPress={handleSave}
            >
              {isAdding ? '保存新写法' : '保存修改'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={handleCancelForm}
            >
              取消
            </Button>
          </div>
        </div>
      ) : descriptions.length === 0 ? (
        <div className="resume-desc-empty-state">
          <p className="resume-empty-text">暂无针对不同岗位的简历描述写法</p>
          <Button
            size="sm"
            variant="secondary"
            className="empty-add-btn"
            onPress={handleStartAdd}
          >
            + 立即新增版本写法
          </Button>
        </div>
      ) : (
        <div className="resume-desc-content-panel" role="tabpanel">
          {activeItem ? (
            <>
              <div className="active-desc-header-actions">
                <span className="active-desc-tag-pill">{activeItem.tag}</span>
                <div className="desc-crud-btn-group">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="desc-action-edit-btn"
                    onPress={() => handleStartEdit(activeItem)}
                  >
                    编辑写法
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="desc-action-delete-btn text-danger"
                    onPress={() => handleDelete(activeItem.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>

              <ul className="resume-bullets-list">
                {activeItem.bullets.map((bullet, idx) => (
                  <li key={idx} className="resume-bullet-item">
                    <span className="bullet-dot" aria-hidden="true">•</span>
                    <div className="bullet-markdown-content">
                      <MilkdownView content={bullet} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="resume-empty-bullets">暂无此版本简历描述</p>
          )}
        </div>
      )}
    </div>
  )
}
