import { FormEvent, useState } from 'react'
import { Button, Card, Chip } from '@heroui/react'
import { Plus } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import type { ExperienceGroup, WorkContent } from '../../api'
import { ExperienceOverviewSection } from './ExperienceOverviewSection'
import { WorkContentBlock, ContentDraft } from './WorkContentBlock'
import { WorkContentFormFields } from './WorkContentFormFields'
import type { SaveStatus } from '../useTransientSaveStatus'

/**
 * 键盘排序的位移：返回新顺序，越界返回 null。
 * 拖拽与方向键最终都交出「一份完整的新顺序」，所以排序只有一个入口（onReorderContents）。
 */
function moveContentByOffset(
  contents: WorkContent[],
  index: number,
  offset: -1 | 1
): WorkContent[] | null {
  const target = index + offset
  if (target < 0 || target >= contents.length) return null
  const next = [...contents]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export type FocusCanvasDocumentProps = {
  group: ExperienceGroup
  /** 游客态只读示例内容 */
  readOnly?: boolean
  contents: WorkContent[]
  editingId: number | null
  isCreatingNew: boolean
  onStartEdit: (item: WorkContent) => void
  onCancelEdit: () => void
  onSaveContent: (draft: ContentDraft, editingId: number | null) => Promise<void> | void
  /** 就地编辑的保存态上抛（由卡片的保存队列发布，与顶栏 Chip 同口径，issue #8） */
  onSaveStatusChange?: (workContentId: number, status: SaveStatus) => void
  /** 唯一的排序入口：拖拽结束与方向键都交出「完整的新顺序」，不存在 index ↔ index 的中间层 */
  onReorderContents?: (newContents: WorkContent[]) => void
  onDeleteContent: (item: WorkContent) => void
  onArchiveContent?: (item: WorkContent) => void
  activeDrawerWorkContentId?: number | null
  onOpenDrawer?: (item: WorkContent) => void
  onOpenZenMode?: (item: WorkContent) => void
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
  readOnly = false,
  contents,
  editingId,
  isCreatingNew,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onSaveStatusChange,
  onReorderContents,
  onDeleteContent,
  onArchiveContent,
  activeDrawerWorkContentId,
  onOpenDrawer,
  onOpenZenMode,
  onStartCreateNew,
  onCancelCreateNew,
  onUpdateGroup
}: FocusCanvasDocumentProps) {

  const [newDraft, setNewDraft] = useState<ContentDraft>(emptyNewDraft)

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

  const handleKeyboardReorder = (index: number, offset: -1 | 1) => {
    const next = moveContentByOffset(contents, index, offset)
    if (next) onReorderContents?.(next)
  }

  return (
    <div className="focus-canvas-document">
      <ExperienceOverviewSection group={group} onUpdate={readOnly ? undefined : onUpdateGroup} />

      <section className="focus-work-contents-section" aria-label="具体工作内容列表">
        <div className="work-contents-header">
          <div className="work-contents-header-title">
            <h3 className="section-title">具体工作内容</h3>
            <Chip size="sm" className="section-badge">
              <Chip.Label>{contents.length} 条</Chip.Label>
            </Chip>
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
                readOnly={readOnly}
                key={item.id}
                item={item}
                index={index}
                editingId={editingId}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveContent={onSaveContent}
                onSaveStatusChange={onSaveStatusChange}
                onDeleteContent={onDeleteContent}
                onArchiveContent={onArchiveContent}
                activeDrawerWorkContentId={activeDrawerWorkContentId}
                onOpenDrawer={onOpenDrawer}
                onOpenZenMode={onOpenZenMode}
                onKeyboardReorder={handleKeyboardReorder}
              />
            ))}
          </Reorder.Group>

          {!readOnly && (isCreatingNew ? (
            <Card className="creating-new-card" aria-label="新建具体工作内容">
              <form className="work-content-edit-form" onSubmit={handleCreateSubmit}>
                <div className="edit-form-header">
                  <span className="edit-form-kicker">
                    <Plus size={14} aria-hidden="true" />
                    新建具体工作内容
                  </span>
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
            </Card>
          ) : (
            <Button
              variant="ghost"
              className="add-content-dashed-btn"
              onPress={onStartCreateNew}
            >
              <Plus size={18} aria-hidden="true" />
              <span>添加具体工作内容</span>
            </Button>
          ))}
        </div>
      </section>
    </div>
  )
}

function FocusWorkContentItem({
  item,
  index,
  readOnly,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onSaveStatusChange,
  onDeleteContent,
  onArchiveContent,
  activeDrawerWorkContentId,
  onOpenDrawer,
  onOpenZenMode,
  onKeyboardReorder
}: {
  item: WorkContent
  index: number
  readOnly: boolean
  editingId: number | null
  onStartEdit: (item: WorkContent) => void
  onCancelEdit: () => void
  onSaveContent: (draft: ContentDraft, editingId: number | null) => Promise<void> | void
  onSaveStatusChange?: (workContentId: number, status: SaveStatus) => void
  onDeleteContent: (item: WorkContent) => void
  onArchiveContent?: (item: WorkContent) => void
  activeDrawerWorkContentId?: number | null
  onOpenDrawer?: (item: WorkContent) => void
  onOpenZenMode?: (item: WorkContent) => void
  onKeyboardReorder: (index: number, offset: -1 | 1) => void
}) {
  const dragControls = useDragControls()
  const isEditing = editingId === item.id
  const isActive = activeDrawerWorkContentId === item.id

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      style={{ listStyle: 'none', position: 'relative' }}
      whileDrag={{ scale: 1.01, zIndex: 10, boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)' }}
    >
      <WorkContentBlock
        item={item}
        index={index}
        readOnly={readOnly}
        isEditing={isEditing}
        isActive={isActive}
        onStartEdit={() => onStartEdit(item)}
        onCancelEdit={onCancelEdit}
        onSave={(draft) => onSaveContent(draft, item.id)}
        onSaveStatusChange={
          onSaveStatusChange ? (status) => onSaveStatusChange(item.id, status) : undefined
        }
        onDelete={() => onDeleteContent(item)}
        onArchive={() => onArchiveContent?.(item)}
        onOpenDrawer={() => onOpenDrawer?.(item)}
        onOpenZenMode={() => onOpenZenMode?.(item)}
        onDragHandlePointerDown={(e) => {
          if (!isEditing && !readOnly) {
            dragControls.start(e)
          }
        }}
        onKeyboardReorder={(direction) => onKeyboardReorder(index, direction)}
      />
    </Reorder.Item>
  )
}

