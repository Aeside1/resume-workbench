import { FormEvent, useEffect, useState, useMemo } from 'react'
import { Button } from '@heroui/react'
import type { WorkContent } from '../../api'
import { MilkdownView } from '../../components/ui/MilkdownView'
import { WorkContentFormFields } from './WorkContentFormFields'
import {
  parseSupplementaryNotes,
  serializeSupplementaryNotes,
  type ResumeDescriptionVersion,
  type ParsedSupplementaryNotes
} from './supplementaryNotes'

export type ContentDraft = {
  title: string
  detailed_record: string
  technical_materials?: string
  result_data?: string
  supplementary_notes?: string
}

export type WorkContentBlockProps = {
  item: WorkContent
  index: number
  totalCount?: number
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (draft: ContentDraft) => Promise<void> | void
  onMove?: (direction: -1 | 1) => void
  onArchive: () => void
  onOpenDrawer?: () => void
  onOpenZenMode?: () => void
  isDragging?: boolean
  dragOverPosition?: 'top' | 'bottom' | null
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
}

export {
  parseSupplementaryNotes,
  serializeSupplementaryNotes,
  type ResumeDescriptionVersion,
  type ParsedSupplementaryNotes
}

/**
 * 将可能包含旧版分段字段（detailed_record, technical_materials, result_data, note）的工作项内容，
 * 智能拼接为统一的自由 Markdown 正文。
 */
export function getCombinedDetailedRecord(
  item: {
    detailed_record?: string | null
    technical_materials?: string | null
    result_data?: string | null
  },
  note?: string | null
): string {
  const record = (item.detailed_record ?? '').trim()
  const materials = (item.technical_materials ?? '').trim()
  const results = (item.result_data ?? '').trim()
  const legacyNote = (note ?? '').trim()

  const parts: string[] = []
  if (record) {
    parts.push(record)
  }
  if (materials) {
    parts.push(`### 技术方案与材料\n\n${materials}`)
  }
  if (results) {
    parts.push(`### 量化结果数据\n\n${results}`)
  }
  if (legacyNote) {
    parts.push(`### 补充说明\n\n${legacyNote}`)
  }

  return parts.join('\n\n')
}

/**
 * 构造初始与重置工作项草稿对象
 */
export function buildInitialDraft(
  item: WorkContent,
  note?: string | null
): ContentDraft {
  return {
    title: item.title,
    detailed_record: getCombinedDetailedRecord(item, note),
    technical_materials: '',
    result_data: '',
    supplementary_notes: ''
  }
}

export function WorkContentBlock({
  item,
  index,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onArchive,
  onOpenDrawer,
  onOpenZenMode,
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

  const [draft, setDraft] = useState<ContentDraft>(() =>
    buildInitialDraft(item, parsedData.note)
  )

  useEffect(() => {
    const parsed = parseSupplementaryNotes(item.supplementary_notes)
    setDraft(buildInitialDraft(item, parsed.note))
  }, [item])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    const serializedNotes = serializeSupplementaryNotes(
      draft.supplementary_notes ?? '',
      parsedData.versions
    )
    onSave({
      title: draft.title.trim(),
      detailed_record: draft.detailed_record,
      technical_materials: '',
      result_data: '',
      supplementary_notes: serializedNotes
    })
  }

  const handleCancel = () => {
    setDraft(buildInitialDraft(item, parsedData.note))
    onCancelEdit()
  }

  const combinedContent = useMemo(
    () => getCombinedDetailedRecord(item, parsedData.note),
    [item, parsedData.note]
  )

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
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    onOpenZenMode?.()
                  }}
                  title="双击展开专注模式，单击编辑"
                >
                  {item.title}
                </button>
              </h3>
            </div>

            <div className="work-content-actions" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="zen-mode-btn"
                onPress={() => onOpenZenMode?.()}
                onClick={(e) => e.stopPropagation()}
              >
                ⛶ 展开专注
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={onArchive}
                onClick={(e) => e.stopPropagation()}
              >
                {item.archived ? '恢复' : '归档'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="edit-content-btn"
                onPress={onStartEdit}
                onClick={(e) => e.stopPropagation()}
              >
                编辑
              </Button>
            </div>
          </header>

          <div className="work-content-typography-body">
            <MilkdownView
              content={combinedContent}
              placeholder="暂无工作内容记录，点击“编辑”或“展开专注”开始沉淀..."
            />
          </div>

          <footer className="work-content-card-footer" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="resume-desc-pill-btn"
              onPress={() => onOpenDrawer?.()}
              onClick={(e) => e.stopPropagation()}
            >
              📝 简历描述 ({parsedData.versions.length} 个版本) →
            </Button>
          </footer>
        </div>
      )}
    </article>
  )
}


