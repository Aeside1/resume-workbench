import { FormEvent, useEffect, useState, useMemo } from 'react'
import { Button } from '@heroui/react'
import type { WorkContent } from '../../api'
import { MilkdownView } from '../../components/ui/MilkdownView'
import { ResumeDescriptionTabs, type ResumeDescriptionItem } from './ResumeDescriptionTabs'
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
  onMove?: (direction: -1 | 1) => void
  onArchive: () => void
  isDragging?: boolean
  dragOverPosition?: 'top' | 'bottom' | null
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
}

export function parseSupplementaryNotes(raw: string | null | undefined): {
  note: string
  descriptions: ResumeDescriptionItem[]
} {
  if (!raw || !raw.trim()) {
    return { note: '', descriptions: [] }
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { note: '', descriptions: parsed }
    }
    if (parsed && typeof parsed === 'object') {
      return {
        note: typeof parsed.note === 'string' ? parsed.note : '',
        descriptions: Array.isArray(parsed.descriptions) ? parsed.descriptions : []
      }
    }
  } catch {
    return { note: raw, descriptions: [] }
  }
  return { note: '', descriptions: [] }
}

export function serializeSupplementaryNotes(
  note: string,
  descriptions: ResumeDescriptionItem[]
): string {
  const trimmedNote = note.trim()
  if (!trimmedNote && descriptions.length === 0) {
    return ''
  }
  if (descriptions.length === 0) {
    return trimmedNote
  }
  return JSON.stringify({
    note: trimmedNote,
    descriptions
  })
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
  onArchive,
  isDragging = false,
  dragOverPosition = null,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onDragHandlePointerDown
}: WorkContentBlockProps) {
  const parsedData = useMemo(
    () => parseSupplementaryNotes(item.supplementary_notes),
    [item.supplementary_notes]
  )

  const [draft, setDraft] = useState<ContentDraft>({
    title: item.title,
    detailed_record: item.detailed_record ?? '',
    technical_materials: item.technical_materials ?? '',
    result_data: item.result_data ?? '',
    supplementary_notes: parsedData.note
  })

  useEffect(() => {
    const parsed = parseSupplementaryNotes(item.supplementary_notes)
    setDraft({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: parsed.note
    })
  }, [item])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    const serializedNotes = serializeSupplementaryNotes(
      draft.supplementary_notes,
      parsedData.descriptions
    )
    onSave({
      ...draft,
      supplementary_notes: serializedNotes
    })
  }

  const handleCancel = () => {
    setDraft({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: parsedData.note
    })
    onCancelEdit()
  }

  const handleDescriptionsChange = (newDescriptions: ResumeDescriptionItem[]) => {
    const serializedNotes = serializeSupplementaryNotes(parsedData.note, newDescriptions)
    onSave({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: serializedNotes
    })
  }

  return (
    <article
      id={`work-content-${item.id}`}
      className={`work-content-card ${item.archived ? 'archived' : ''} ${isEditing ? 'editing' : ''} ${isDragging ? 'work-content-card--dragging' : ''} ${dragOverPosition === 'top' ? 'work-content-card--drag-over-top' : ''} ${dragOverPosition === 'bottom' ? 'work-content-card--drag-over-bottom' : ''}`}
      aria-label={`工作项 ${index + 1}: ${item.title}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
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
              <span
                className="work-content-drag-handle"
                draggable={!isEditing}
                onDragStart={onDragStart}
                onPointerDown={onDragHandlePointerDown}
                style={{ touchAction: 'none' }}
                title="按住拖拽调整排序"
                aria-label="拖拽调整排序"
                role="button"
                tabIndex={0}
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="5" r="1.2" fill="currentColor" />
                  <circle cx="9" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="9" cy="19" r="1.2" fill="currentColor" />
                  <circle cx="15" cy="5" r="1.2" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="15" cy="19" r="1.2" fill="currentColor" />
                </svg>
              </span>
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
              <MilkdownView
                content={item.detailed_record}
                placeholder="暂无背景与难点记录"
              />
            </div>

            <div className="typography-section">
              <h4 className="typography-label">技术方案与材料</h4>
              <MilkdownView
                content={item.technical_materials}
                placeholder="暂无技术方案记录"
              />
            </div>

            <div className="typography-section">
              <h4 className="typography-label">量化结果数据</h4>
              <MilkdownView
                content={item.result_data}
                className="highlight-result"
                placeholder="暂无量化结果数据"
              />
            </div>

            {parsedData.note && (
              <div className="typography-section">
                <h4 className="typography-label">补充说明</h4>
                <MilkdownView
                  content={parsedData.note}
                  className="muted"
                />
              </div>
            )}
          </div>

          <footer className="work-content-card-footer">
            <ResumeDescriptionTabs
              workContentId={item.id}
              descriptions={parsedData.descriptions}
              onChange={handleDescriptionsChange}
            />
          </footer>
        </div>
      )}
    </article>
  )
}
