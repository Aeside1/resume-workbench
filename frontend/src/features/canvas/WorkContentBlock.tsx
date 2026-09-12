import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import type { WorkContent } from '../../api'
import { ResumeDescriptionTabs } from './ResumeDescriptionTabs'
import { WorkContentFormFields } from './WorkContentFormFields'

export type ContentDraft = {
  title: string
  detailed_record: string
  technical_materials: string
  result_data: string
  supplementary_notes: string
}

export type WorkContentBlockProps = {
  item: WorkContent
  index: number
  totalCount: number
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (draft: ContentDraft) => Promise<void> | void
  onMove: (direction: -1 | 1) => void
  onArchive: () => void
}

export function WorkContentBlock({
  item,
  index,
  totalCount,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onMove,
  onArchive
}: WorkContentBlockProps) {
  const [draft, setDraft] = useState<ContentDraft>({
    title: item.title,
    detailed_record: item.detailed_record ?? '',
    technical_materials: item.technical_materials ?? '',
    result_data: item.result_data ?? '',
    supplementary_notes: item.supplementary_notes ?? ''
  })

  useEffect(() => {
    setDraft({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: item.supplementary_notes ?? ''
    })
  }, [item])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    onSave(draft)
  }

  const handleCancel = () => {
    setDraft({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: item.supplementary_notes ?? ''
    })
    onCancelEdit()
  }

  return (
    <article
      id={`work-content-${item.id}`}
      className={`work-content-card ${item.archived ? 'archived' : ''} ${isEditing ? 'editing' : ''}`}
      aria-label={`工作项 ${index + 1}: ${item.title}`}
    >
      {isEditing ? (
        <form className="work-content-edit-form" onSubmit={handleSubmit}>
          <div className="edit-form-header">
            <span className="edit-form-kicker">编辑工作项 #{index + 1}</span>
          </div>

          <WorkContentFormFields
            prefixId={`wc-${item.id}`}
            draft={draft}
            onChange={setDraft}
          />

          <div className="edit-form-actions">
            <Button
              type="submit"
              variant="primary"
            >
              保存
            </Button>
            <Button
              type="button"
              variant="ghost"
              onPress={handleCancel}
            >
              取消
            </Button>
          </div>
        </form>
      ) : (
        <div className="work-content-read-view">
          <header className="work-content-card-header">
            <div className="work-content-title-meta">
              <span className="work-content-index-pill">工作项 {index + 1}</span>
              {item.archived && <span className="archived-badge">已归档</span>}
              <h3 className="work-content-title">
                <button
                  type="button"
                  className="work-content-title-btn"
                  onClick={onStartEdit}
                >
                  {item.title}
                </button>
              </h3>
            </div>

            <div className="work-content-actions" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={index === 0}
                onPress={() => onMove(-1)}
              >
                上移
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={index === totalCount - 1}
                onPress={() => onMove(1)}
              >
                下移
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={onArchive}
              >
                {item.archived ? '恢复' : '归档'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="edit-content-btn"
                onPress={onStartEdit}
              >
                编辑
              </Button>
            </div>
          </header>

          <div className="work-content-typography-body">
            <div className="typography-section">
              <h4 className="typography-label">背景与难点</h4>
              <p className="typography-text">{item.detailed_record || '暂无背景与难点记录'}</p>
            </div>

            <div className="typography-section">
              <h4 className="typography-label">技术方案与材料</h4>
              <p className="typography-text">{item.technical_materials || '暂无技术方案记录'}</p>
            </div>

            <div className="typography-section">
              <h4 className="typography-label">量化结果数据</h4>
              <p className="typography-text highlight-result">{item.result_data || '暂无量化结果数据'}</p>
            </div>

            {item.supplementary_notes && (
              <div className="typography-section">
                <h4 className="typography-label">补充说明</h4>
                <p className="typography-text muted">{item.supplementary_notes}</p>
              </div>
            )}
          </div>

          <footer className="work-content-card-footer">
            <ResumeDescriptionTabs workContentId={item.id} />
          </footer>
        </div>
      )}
    </article>
  )
}
