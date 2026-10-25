import { FormEvent, useEffect, useState, useMemo, useRef } from 'react'
import { Button, Chip, Tooltip } from '@heroui/react'
import { ArrowDown, ArrowUp, Check, ChevronRight, FileText, GripVertical, Maximize2, Trash2 } from 'lucide-react'
import type { WorkContent } from '../../api'
import { MilkdownView, clearMilkdownEditorCache } from '../../components/ui/MilkdownView'
import { WorkContentFormFields } from './WorkContentFormFields'
import { useTransientSaveStatus, type SaveStatus } from '../useTransientSaveStatus'
import { useSaveQueue } from '../useSaveQueue'
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
  /** 游客态只读示例内容 */
  readOnly?: boolean
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (draft: ContentDraft) => Promise<void> | void
  /** 把本卡片的保存态上抛给容器（顶栏 Chip 与卡片徽章共用同一套口径） */
  onSaveStatusChange?: (status: SaveStatus) => void
  onDelete?: () => void
  onArchive?: () => void
  onOpenDrawer?: () => void
  onOpenZenMode?: () => void
  isActive?: boolean
  /**
   * 排序走 framer-motion 的指针拖拽（只有这个手柄能发起拖动），
   * 键盘等价路径是 ArrowUp / ArrowDown 移动一格（PRD NFR-05）；两者共用同一个 reorder 出口。
   */
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
  onKeyboardReorder?: (direction: -1 | 1) => void
  /**
   * 窄屏的上下移按钮：手指拖拽在手机上不可靠，卡片上直接给两个按钮（issue 19）。
   * 按钮在桌面被 CSS 隐藏（`.work-content-move-actions`），拖拽与方向键照常可用。
   * 缺省可移动：调用方只传了 `onKeyboardReorder` 就不应该拿到两个死按钮；
   * 首项 / 末项由调用方显式传 false 禁用。
   */
  canMoveUp?: boolean
  canMoveDown?: boolean
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

/**
 * 草稿签名：只看「会被存下去的字段」，与落盘 payload 对齐。
 * 卡片与 Zen 共用一份，避免两处各写一遍再各自漂移。
 */
export function getContentSignature(draft: ContentDraft): string {
  return `${draft.title.trim()}|||${draft.detailed_record}`
}

/**
 * 两个编辑入口都发送完整工作内容，不能各自拼一份 payload。
 * supplementary_notes 保留服务端已有的亮点修订记录，只替换当前自由备注。
 */
export function toContentPayload(
  draft: ContentDraft,
  existingSupplementaryNotes?: string | null
): ContentDraft {
  const currentNotes = parseSupplementaryNotes(existingSupplementaryNotes)
  return {
    title: draft.title.trim(),
    detailed_record: draft.detailed_record,
    technical_materials: '',
    result_data: '',
    supplementary_notes: serializeSupplementaryNotes(
      draft.supplementary_notes ?? '',
      currentNotes.versions
    )
  }
}

export function WorkContentBlock({
  item,
  index,
  readOnly = false,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onSaveStatusChange,
  onDelete,
  onArchive,
  onOpenDrawer,
  onOpenZenMode,
  isActive = false,
  onDragHandlePointerDown,
  onKeyboardReorder,
  canMoveUp = true,
  canMoveDown = true
}: WorkContentBlockProps) {
  const parsedData = useMemo(
    () => parseSupplementaryNotes(item.supplementary_notes),
    [item.supplementary_notes]
  )

  const [draft, setDraft] = useState<ContentDraft>(() =>
    buildInitialDraft(item, parsedData.note)
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const applySaveStatus = useTransientSaveStatus(setSaveStatus)

  /**
   * 落盘走保存队列（issue #8）：在途时不丢弃后续草稿，回来补发一笔；
   * 保存态跟着「内容有没有落盘」走，而不是「请求走到哪一步」。
   */
  const { request: requestSave, flush: flushSave, resetBaseline, status: queueStatus } =
    useSaveQueue<ContentDraft>({
      getSignature: getContentSignature,
      isSavable: (value) => !!value.title.trim(),
      onStatusChange: onSaveStatusChange,
      persist: (value) => onSave(
        toContentPayload(value, item.supplementary_notes)
      )
    })

  // 卡片徽章（本地）与顶栏 Chip（上抛给容器）跟着同一个队列状态走，同屏两处口径不会打架
  useEffect(() => {
    applySaveStatus(queueStatus)
  }, [queueStatus, applySaveStatus])

  /** 上一次见到的卡片 id：用来把「换绑到另一张卡片」从「父级回写同一张卡片」里区分出来 */
  const lastSeenItemIdRef = useRef(item.id)

  useEffect(() => {
    // 编辑态下本地 draft 才是唯一真源：保存成功后父级会以新对象身份回写 contents
    // （FocusCanvasContainer.handleSaveContent 的 setContents(items => map(...))），
    // 若此处照旧重建草稿，既会把用户正在敲的字符覆盖回上一次保存的结果，
    // 也会把刚点亮的「已自动保存」徽章立刻重置为 idle（issue 13 的缺陷）。
    // 非编辑态下 item 变化（外部路径改内容）仍会同步草稿；换绑到另一张卡片
    // （item.id 变化）不属「父级回写」，照旧重建草稿，不依赖父级是否给了 key。
    // 依赖里故意不放 isEditing：进入/退出编辑态都不需要重建草稿——
    // 退出时重建会把刚敲的内容（保存尚未回写）退回旧 item，失败时直接丢失。
    const isOtherCard = lastSeenItemIdRef.current !== item.id
    lastSeenItemIdRef.current = item.id
    // 队列还在排水或已经失败时，item 多半只是父级把上一笔结果回写过来的旧值。
    // 此时重建 draft / baseline 会抹掉待发槽位，甚至让旧值与新值来回震荡（issue #8）。
    // 队列回到 idle / saved 后再同步；换绑也沿用同一保护，避免把旧卡内容写进新卡。
    // queueStatus 必须进依赖：否则“等队列回到位再同步”永远不会发生。
    if (!isOtherCard && queueStatus !== 'idle' && queueStatus !== 'saved') return
    if (isEditing && !isOtherCard) return
    const parsed = parseSupplementaryNotes(item.supplementary_notes)
    const initial = buildInitialDraft(item, parsed.note)
    setDraft(initial)
    // 外部路径带回的就是「已落盘」的那份：同时刷新已落盘签名与待发槽位
    resetBaseline(initial)
  }, [item, resetBaseline, queueStatus])

  // 输入停顿 800ms 自动保存（防抖与「在途补发」都归保存队列，这里只把最新草稿交出去）
  useEffect(() => {
    if (!isEditing) return
    requestSave(draft)
  }, [draft, isEditing, requestSave])

  // 点击卡片外部或按 Esc 键时把最新草稿交给队列（不等结果），并平滑收起编辑态
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

        flushSave(draftRef.current)
        onCancelEdit()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        flushSave(draftRef.current)
        onCancelEdit()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditing, onCancelEdit, flushSave])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    flushSave(draft)
    onCancelEdit()
  }

  const combinedContent = useMemo(
    () => getCombinedDetailedRecord(item, parsedData.note),
    [item, parsedData.note]
  )

  /** 键盘等价路径：上下方向键把本卡片移动一格。手柄既宣称为按钮，就必须真的能被键盘操作 */
  const handleDragHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    onKeyboardReorder?.(e.key === 'ArrowUp' ? -1 : 1)
  }

  return (
    <>
      <article
        ref={cardRef}
        id={`work-content-${item.id}`}
        className={`work-content-card ${item.archived ? 'archived' : ''} ${isEditing ? 'editing' : ''} ${isActive ? 'work-content-card--active' : ''}`}
        aria-label={`工作项 ${index + 1}: ${item.title}`}
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
              {saveStatus === 'unsaved' && (
                <Chip size="sm" color="warning" variant="soft" role="status">
                  <Chip.Label>还有未保存内容</Chip.Label>
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
              {!readOnly && (
                <span
                  className="work-content-drag-handle"
                  onPointerDown={onDragHandlePointerDown}
                  onKeyDown={handleDragHandleKeyDown}
                  style={{ touchAction: 'none' }}
                  title="按住拖拽调整排序，或用方向键上移、下移"
                  aria-label="拖拽调整排序"
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  role="button"
                  tabIndex={0}
                >
                  <GripVertical size={14} aria-hidden="true" />
                </span>
              )}
              {/* 窄屏排序（ADR 010）：手指拖拽在手机上不可靠，给两个按钮代替；
                  桌面由 CSS 隐藏，拖拽与方向键不变 */}
              {!readOnly && onKeyboardReorder && (
                <span className="work-content-move-actions">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="上移工作内容"
                    isDisabled={!canMoveUp}
                    onPress={() => onKeyboardReorder(-1)}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="下移工作内容"
                    isDisabled={!canMoveDown}
                    onPress={() => onKeyboardReorder(1)}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </Button>
                </span>
              )}
              {item.archived && (
                <Chip size="sm" color="warning" variant="soft">
                  <Chip.Label>已归档</Chip.Label>
                </Chip>
              )}
              <h3 className="work-content-title">
                {readOnly ? (
                  item.title
                ) : (
                  <Tooltip>
                    <Button
                      size="lg"
                      variant="ghost"
                      onPress={onStartEdit}
                    >
                      {item.title}
                    </Button>
                    <Tooltip.Content>单击就地编辑</Tooltip.Content>
                  </Tooltip>
                )}
              </h3>
            </div>

            {!readOnly && (
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
            )}

          </header>

          {/* 正文区域是卡片内唯一的“点击进入编辑”热区 */}
          <div
            className="work-content-typography-body work-content-card-body"
            onClick={() => {
              if (!readOnly) {
                onStartEdit()
              }
            }}
          >
            <MilkdownView
              content={combinedContent}
              placeholder={readOnly ? '暂无工作内容记录' : '暂无工作内容记录，点击此处或“展开专注”开始沉淀...'}
            />
          </div>

          <footer className="work-content-card-footer">
            <Button
              size="sm"
              variant="outline"
              className={`resume-desc-trigger-btn${isActive ? ' resume-desc-trigger-btn--active' : ''}`}
              onPress={() => onOpenDrawer?.()}
              aria-label="简历亮点提炼"
            >
              <FileText className="resume-trigger-icon" size={15} aria-hidden="true" />
              <span>简历亮点提炼</span>
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




