import { FormEvent, useState } from 'react'
import { Button, Card, Chip } from '@heroui/react'
import { Plus } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import type { ExperienceGroup, WorkContent } from '../../api'
import { ExperienceOverviewSection } from './ExperienceOverviewSection'
import { WorkContentBlock, ContentDraft } from './WorkContentBlock'
import { WorkContentFormFields } from './WorkContentFormFields'
import type { SaveStatus } from '../useTransientSaveStatus'

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
  /**
   * 唯一的排序入口：拖拽结束后把「新顺序」整份交出去。
   * 不再有 index ↔ index 的 onReorderContent / onMoveContent——那是原生 HTML5 拖放与
   * 上下移按钮时代的两条老路径，2026-10 已随本票删除（issue #9）。
   */
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
                totalCount={contents.length}
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
  totalCount,
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
  onOpenZenMode
}: {
  item: WorkContent
  index: number
  totalCount: number
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
        totalCount={totalCount}
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
      />
    </Reorder.Item>
  )
}

