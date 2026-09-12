import { FormEvent, useState } from 'react'
import { Button } from '@heroui/react'
import { Reorder, useDragControls } from 'framer-motion'
import type { ExperienceGroup, WorkContent } from '../../api'
import { ExperienceOverviewSection } from './ExperienceOverviewSection'
import { WorkContentBlock, ContentDraft } from './WorkContentBlock'
import { WorkContentFormFields } from './WorkContentFormFields'

export type FocusCanvasDocumentProps = {
  group: ExperienceGroup
  contents: WorkContent[]
  editingId: number | null
  isCreatingNew: boolean
  onStartEdit: (item: WorkContent) => void
  onCancelEdit: () => void
  onSaveContent: (draft: ContentDraft, editingId: number | null) => Promise<void> | void
  onMoveContent?: (index: number, direction: -1 | 1) => void
  onReorderContent?: (sourceIndex: number, targetIndex: number) => void
  onReorderContents?: (newContents: WorkContent[]) => void
  onArchiveContent: (item: WorkContent) => void
  onStartCreateNew: () => void
  onCancelCreateNew: () => void
  onUpdateGroup?: (payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => Promise<void> | void
}

const emptyNewDraft: ContentDraft = {
  title: '',
  detailed_record: '',
  technical_materials: '',
  result_data: '',
  supplementary_notes: ''
}

export function FocusCanvasDocument({
  group,
  contents,
  editingId,
  isCreatingNew,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onMoveContent,
  onReorderContent,
  onReorderContents,
  onArchiveContent,
  onStartCreateNew,
  onCancelCreateNew,
  onUpdateGroup
}: FocusCanvasDocumentProps) {
  const [newDraft, setNewDraft] = useState<ContentDraft>(emptyNewDraft)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverInfo, setDragOverInfo] = useState<{ index: number; position: 'top' | 'bottom' } | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverInfo(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'top' : 'bottom'
    setDragOverInfo({ index, position })
  }

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverInfo?.index === index) {
      setDragOverInfo(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverInfo(null)
      return
    }
    onReorderContent?.(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setDragOverInfo(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverInfo(null)
  }

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newDraft.title.trim()) return
    onSaveContent(newDraft, null)
    setNewDraft(emptyNewDraft)
  }

  const handleCancelNew = () => {
    setNewDraft(emptyNewDraft)
    onCancelCreateNew()
  }

  return (
    <div className="focus-canvas-document">
      <ExperienceOverviewSection group={group} onUpdate={onUpdateGroup} />

      <section className="focus-work-contents-section" aria-label="具体工作内容列表">
        <div className="work-contents-header">
          <div className="work-contents-header-title">
            <h3 className="section-title">具体工作内容</h3>
            <span className="section-badge">{contents.length} 条</span>
          </div>
        </div>

        <div className="work-contents-list">
          <Reorder.Group
            axis="y"
            values={contents}
            onReorder={(newOrder) => onReorderContents?.(newOrder)}
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {contents.map((item, index) => (
              <FocusWorkContentItem
                key={item.id}
                item={item}
                index={index}
                totalCount={contents.length}
                editingId={editingId}
                draggedIndex={draggedIndex}
                dragOverInfo={dragOverInfo}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveContent={onSaveContent}
                onMoveContent={onMoveContent}
                onArchiveContent={onArchiveContent}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </Reorder.Group>

          {isCreatingNew ? (
            <article className="work-content-card creating-new-card" aria-label="新建具体工作内容">
              <form className="work-content-edit-form" onSubmit={handleCreateSubmit}>
                <div className="edit-form-header">
                  <span className="edit-form-kicker">+ 新建具体工作内容</span>
                </div>

                <WorkContentFormFields
                  prefixId="new-wc"
                  draft={newDraft}
                  onChange={setNewDraft}
                />

                <div className="edit-form-actions">
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    添加工作内容
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={handleCancelNew}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </article>
          ) : (
            <button
              type="button"
              className="add-content-dashed-btn"
              onClick={onStartCreateNew}
            >
              <span className="plus-symbol" aria-hidden="true">+</span>
              <span className="btn-text">添加具体工作内容</span>
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function FocusWorkContentItem({
  item,
  index,
  totalCount,
  editingId,
  draggedIndex,
  dragOverInfo,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onMoveContent,
  onArchiveContent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: {
  item: WorkContent
  index: number
  totalCount: number
  editingId: number | null
  draggedIndex: number | null
  dragOverInfo: { index: number; position: 'top' | 'bottom' } | null
  onStartEdit: (item: WorkContent) => void
  onCancelEdit: () => void
  onSaveContent: (draft: ContentDraft, editingId: number | null) => Promise<void> | void
  onMoveContent?: (index: number, direction: -1 | 1) => void
  onArchiveContent: (item: WorkContent) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragLeave: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}) {
  const dragControls = useDragControls()
  const isEditing = editingId === item.id

  return (
    <Reorder.Item
      value={item}
      id={`work-content-${item.id}`}
      dragListener={false}
      dragControls={dragControls}
      style={{ listStyle: 'none', position: 'relative' }}
      whileDrag={{ scale: 1.01, zIndex: 10, boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)' }}
    >
      <WorkContentBlock
        item={item}
        index={index}
        totalCount={totalCount}
        isEditing={isEditing}
        isDragging={draggedIndex === index}
        dragOverPosition={dragOverInfo?.index === index ? dragOverInfo.position : null}
        onStartEdit={() => onStartEdit(item)}
        onCancelEdit={onCancelEdit}
        onSave={(draft) => onSaveContent(draft, item.id)}
        onMove={(direction) => onMoveContent?.(index, direction)}
        onArchive={() => onArchiveContent(item)}
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragLeave={(e) => onDragLeave(e, index)}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
        onDragHandlePointerDown={(e) => {
          if (!isEditing) {
            dragControls.start(e)
          }
        }}
      />
    </Reorder.Item>
  )
}
