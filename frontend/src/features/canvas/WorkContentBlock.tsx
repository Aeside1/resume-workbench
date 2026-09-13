import { FormEvent, useEffect, useState, useMemo, useRef } from 'react'
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
  onDelete?: () => void
  onArchive?: () => void
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
  onDelete,
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const cardRef = useRef<HTMLElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const getSignature = (d: ContentDraft) => `${d.title.trim()}|||${d.detailed_record}`
  const lastSavedSignatureRef = useRef<string>(getSignature(buildInitialDraft(item, parsedData.note)))

  useEffect(() => {
    const parsed = parseSupplementaryNotes(item.supplementary_notes)
    const initial = buildInitialDraft(item, parsed.note)
    setDraft(initial)
    lastSavedSignatureRef.current = getSignature(initial)
    setSaveStatus('idle')
  }, [item])

  const isSavingRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const performSave = async (currentDraft: ContentDraft) => {
    if (!currentDraft.title.trim()) return
    const signature = getSignature(currentDraft)
    if (signature === lastSavedSignatureRef.current || isSavingRef.current) return

    isSavingRef.current = true
    lastSavedSignatureRef.current = signature
    setSaveStatus('saving')
    const serializedNotes = serializeSupplementaryNotes(
      currentDraft.supplementary_notes ?? '',
      parsedData.versions
    )
    try {
      await onSave({
        title: currentDraft.title.trim(),
        detailed_record: currentDraft.detailed_record,
        technical_materials: '',
        result_data: '',
        supplementary_notes: serializedNotes
      })
      setSaveStatus('saved')
    } catch {
      // 失败后允许重试
      lastSavedSignatureRef.current = ''
      setSaveStatus('idle')
    } finally {
      isSavingRef.current = false
    }
  }

  // 输入停顿 800ms 自动保存
  useEffect(() => {
    if (!isEditing) return
    if (!draft.title.trim()) return
    const signature = getSignature(draft)
    if (signature === lastSavedSignatureRef.current) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      performSave(draft)
    }, 800)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [draft, isEditing])

  // 点击卡片外部时自动保存未保存变更，并平滑收起编辑态
  useEffect(() => {
    if (!isEditing) return

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!cardRef.current || !target) return
      // 如果点击在卡片外部
      if (!cardRef.current.contains(target)) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        performSave(draftRef.current)
        onCancelEdit()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
    }
  }, [isEditing, onCancelEdit])

  const handleCancel = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setDraft(buildInitialDraft(item, parsedData.note))
    onCancelEdit()
  }

  const handleFinishEdit = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    await performSave(draft)
    onCancelEdit()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await handleFinishEdit()
  }


  const combinedContent = useMemo(
    () => getCombinedDetailedRecord(item, parsedData.note),
    [item, parsedData.note]
  )

  return (
    <article
      ref={cardRef}
      id={`work-content-${item.id}`}
      className={`work-content-card ${item.archived ? 'archived' : ''} ${isEditing ? 'editing' : 'interactive-card'} ${isDragging ? 'work-content-card--dragging' : ''} ${dragOverPosition === 'top' ? 'work-content-card--drag-over-top' : ''} ${dragOverPosition === 'bottom' ? 'work-content-card--drag-over-bottom' : ''}`}
      aria-label={`工作项 ${index + 1}: ${item.title}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (!isEditing && !isDragging) {
          onStartEdit()
        }
      }}
    >
      {isEditing ? (
        <form className="work-content-edit-form" onSubmit={handleSubmit}>
          <div className="edit-form-header">
            <span className="edit-form-kicker">编辑工作项 #{index + 1}</span>
            <div className="auto-save-container">
              {saveStatus === 'saving' && (
                <span className="auto-save-badge saving" role="status">
                  保存中...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="auto-save-badge saved" role="status">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  已自动保存
                </span>
              )}
            </div>
          </div>

          <WorkContentFormFields
            prefixId={`wc-${item.id}`}
            draft={draft}
            onChange={setDraft}
          />

          <div className="edit-form-actions">
            <Button
              type="button"
              variant="primary"
              onPress={handleFinishEdit}
            >
              完成编辑
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
                onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEdit()
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    onOpenZenMode?.()
                  }}
                  title="单击就地编辑，双击展开专注模式"
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
                aria-label="展开专注模式"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 4 }}>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                展开专注
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
              <Button
                size="sm"
                variant="ghost"
                className="btn-delete-ghost"
                onPress={() => {
                  if (window.confirm(`确定要删除工作项“${item.title}”吗？此操作不可恢复。`)) {
                    if (onDelete) {
                      onDelete()
                    } else if (onArchive) {
                      onArchive()
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                删除
              </Button>
            </div>

          </header>

          <div className="work-content-typography-body">
            <MilkdownView
              content={combinedContent}
              placeholder="暂无工作内容记录，点击卡片或“展开专注”开始沉淀..."
            />
          </div>

          <footer className="work-content-card-footer" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              className="resume-desc-trigger-btn"
              onPress={() => onOpenDrawer?.()}
              onClick={(e) => e.stopPropagation()}
              aria-label="打开简历描述提炼抽屉"
            >
              <svg className="resume-trigger-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="resume-trigger-label">简历描述提炼</span>
              <svg className="resume-trigger-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          </footer>
        </div>
      )}
    </article>
  )
}




