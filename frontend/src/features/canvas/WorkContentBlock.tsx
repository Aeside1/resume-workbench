import { FormEvent, useEffect, useState, useMemo, useRef } from 'react'
import { Button, Chip, Tooltip } from '@heroui/react'
import { Check, ChevronRight, FileText, GripVertical, Maximize2, Trash2 } from 'lucide-react'
import type { WorkContent } from '../../api'
import { MilkdownView, clearMilkdownEditorCache } from '../../components/ui/MilkdownView'
import { WorkContentFormFields } from './WorkContentFormFields'
import { ConfirmDeleteWorkContentModal } from './ConfirmDeleteWorkContentModal'
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
  isActive?: boolean
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
  isActive = false,
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
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

  // 点击卡片外部或按 Esc 键时自动保存未保存变更，并平滑收起编辑态
  useEffect(() => {
    if (!isEditing) return

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!cardRef.current || !target) return
      // 如果点击在卡片外部
      if (!cardRef.current.contains(target)) {
        const isModal = !!(
          target instanceof Element &&
          (target.closest('[role="dialog"]'))
        )
        if (isModal) return

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        performSave(draftRef.current)
        onCancelEdit()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        performSave(draftRef.current)
        onCancelEdit()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditing, onCancelEdit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    await performSave(draft)
    onCancelEdit()
  }

  const combinedContent = useMemo(
    () => getCombinedDetailedRecord(item, parsedData.note),
    [item, parsedData.note]
  )

  return (
    <>
      <article
        ref={cardRef}
        id={`work-content-${item.id}`}
        className={`work-content-card ${item.archived ? 'archived' : ''} ${isEditing ? 'editing' : ''} ${isActive ? 'work-content-card--active' : ''} ${isDragging ? 'work-content-card--dragging' : ''} ${dragOverPosition === 'top' ? 'work-content-card--drag-over-top' : ''} ${dragOverPosition === 'bottom' ? 'work-content-card--drag-over-bottom' : ''}`}
      aria-label={`工作项 ${index + 1}: ${item.title}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isEditing ? (
        <form className="work-content-edit-form" onSubmit={handleSubmit}>
          <div className="edit-form-header">
            <span className="edit-form-kicker">编辑工作内容</span>
            <div className="auto-save-container">
              {saveStatus === 'saving' && (
                <Chip size="sm" role="status">
                  <Chip.Label>保存中...</Chip.Label>
                </Chip>
              )}
              {saveStatus === 'saved' && (
                <Chip size="sm" color="success" variant="soft" role="status">
                  <Check size={12} aria-hidden="true" />
                  <Chip.Label>已自动保存</Chip.Label>
                </Chip>
              )}
            </div>
          </div>

          <WorkContentFormFields
            prefixId={`wc-${item.id}`}
            draft={draft}
            onChange={setDraft}
          />
        </form>
      ) : (

        <>
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
                <GripVertical size={14} aria-hidden="true" />
              </span>
              {item.archived && (
                <Chip size="sm" color="warning" variant="soft">
                  <Chip.Label>已归档</Chip.Label>
                </Chip>
              )}
              <h3 className="work-content-title">
                <Tooltip>
                  <Button
                    size="lg"
                    variant="ghost"
                    onPress={onStartEdit}
                    onDoubleClick={() => onOpenZenMode?.()}
                  >
                    {item.title}
                  </Button>
                  <Tooltip.Content>单击就地编辑，双击展开专注模式</Tooltip.Content>
                </Tooltip>
              </h3>
            </div>

            <div className="work-content-actions">
              <Button
                size="sm"
                variant="ghost"
                onPress={() => onOpenZenMode?.()}
                aria-label="展开专注模式"
              >
                <Maximize2 size={13} aria-hidden="true" />
                展开专注
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={onStartEdit}
              >
                编辑
              </Button>
              <Button
                size="sm"
                variant="danger-soft"
                onPress={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 size={13} aria-hidden="true" />
                删除
              </Button>
            </div>

          </header>

          {/* 正文区域是卡片内唯一的"点击进入编辑"热区，头部操作区与底部按钮区各自独立 */}
          <div
            className="work-content-typography-body work-content-card-body"
            onClick={() => {
              if (!isDragging) {
                onStartEdit()
              }
            }}
          >
            <MilkdownView
              content={combinedContent}
              placeholder="暂无工作内容记录，点击此处或“展开专注”开始沉淀..."
            />
          </div>

          <footer className="work-content-card-footer">
            <Button
              size="sm"
              variant="outline"
              className={`resume-desc-trigger-btn${isActive ? ' resume-desc-trigger-btn--active' : ''}`}
              onPress={() => onOpenDrawer?.()}
              aria-label="简历描述提炼"
            >
              <FileText className="resume-trigger-icon" size={15} aria-hidden="true" />
              <span>简历描述提炼</span>
              <ChevronRight className="resume-trigger-arrow" size={14} aria-hidden="true" />
            </Button>
          </footer>
        </>
      )}
    </article>

    <ConfirmDeleteWorkContentModal
      isOpen={isDeleteModalOpen}
      itemTitle={item.title}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={() => {
        setIsDeleteModalOpen(false)
        clearMilkdownEditorCache(`wc-${item.id}-record`)
        if (onDelete) {
          onDelete()
        } else if (onArchive) {
          onArchive()
        }
      }}
    />
  </>
  )
}




