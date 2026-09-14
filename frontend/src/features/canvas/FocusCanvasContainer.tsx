import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type ExperienceGroup, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { useToast } from '../../components/ui/Toast'
import { OutlineNavigator } from './OutlineNavigator'
import { FocusCanvasDocument } from './FocusCanvasDocument'
import { ResumeDescriptionDrawer } from './ResumeDescriptionDrawer'
import { ZenFocusEditor } from './ZenFocusEditor'
import {
  parseSupplementaryNotes,
  serializeSupplementaryNotes,
  type ResumeDescriptionVersion
} from './supplementaryNotes'
import { useTransientSaveStatus, type SaveStatus } from '../useTransientSaveStatus'
import type { ContentDraft } from './WorkContentBlock'

type Props = {
  session: Session
  group: ExperienceGroup
  onSaveStatusChange?: (status: SaveStatus) => void
  onDirtyChange?: (isDirty: boolean) => void
  onUpdateGroup?: (group: ExperienceGroup) => void
  /** 向 AppShell 上报 Zen 展开状态与当前工作项实时标题（顶栏面包屑末级） */
  onZenChange?: (state: ZenTopbarState) => void
  /** 伴随栏开合由 WorkbenchShell 持有，这里只透传给 Zen */
  isCompanionOpen?: boolean
  /** 外壳发起的「返回画布」命令；+1 递增，由 Zen 自己执行（先 flush 再关闭） */
  zenExitSignal?: number
}

/** 顶栏在 Zen 展开时需要的两项语境：是否展开、当前工作项实时标题 */
export type ZenTopbarState = { isOpen: boolean; title: string }

export function FocusCanvasContainer({
  session,
  group,
  onSaveStatusChange,
  onDirtyChange,
  onUpdateGroup,
  onZenChange,
  isCompanionOpen,
  zenExitSignal
}: Props) {
  const [currentGroup, setCurrentGroup] = useState<ExperienceGroup>(group)
  const [contents, setContents] = useState<WorkContent[]>([])
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [activeDrawerWorkContentId, setActiveDrawerWorkContentId] = useState<number | null>(null)
  const [zenModeWorkContentId, setZenModeWorkContentId] = useState<number | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeNavId, setActiveNavId] = useState<string>('section-overview')
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  useEffect(() => {
    setCurrentGroup(group)
  }, [group])

  const containerRef = useRef<HTMLDivElement>(null)
  // Zen 展开时画布被区域内替（卸载 → 重挂），退出后需把视窗恢复到原卡片位置
  const zenReturnScrollRef = useRef(0)

  /**
   * 顶栏保存态 Chip。归零口径（含单一归零定时器、卸载清理）全部落在
   * `useTransientSaveStatus`，与画布卡片内联徽章共用同一套（issue 13）。
   */
  const publishSaveStatus = useCallback(
    (status: SaveStatus) => onSaveStatusChange?.(status),
    [onSaveStatusChange]
  )
  const applySaveStatus = useTransientSaveStatus(publishSaveStatus)

  // 脏判据（issue 12 D1）：只反映「可能有未保存修改」的就地编辑/新建态。
  // Zen 展开本身不算脏——退出 Zen 走的是先 flush 再关的路径；
  // 若把「Zen 展开」也算脏，完全没输入内容时离开也会弹不成立的「放弃修改」确认框。
  useEffect(() => {
    onDirtyChange?.(editingContentId !== null || isCreatingNew)
  }, [editingContentId, isCreatingNew, onDirtyChange])

  useEffect(() => {
    api.workContents(session.token, group.id, showArchived)
      .then(setContents)
      .catch((e) => setError((e as Error).message))
  }, [session.token, group.id, showArchived])

  // IntersectionObserver 滚动高亮大纲
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          // 选择视窗中最早或最大的元素
          const topEntry = visibleEntries[0]
          if (topEntry.target.id) {
            setActiveNavId(topEntry.target.id)
          }
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0.1
      }
    )

    const overviewEl = document.getElementById('section-overview')
    if (overviewEl) observer.observe(overviewEl)

    contents.forEach((item) => {
      const el = document.getElementById(`work-content-${item.id}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [contents])

  const handleNavigate = (targetId: string) => {
    setActiveNavId(targetId)
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleStartEdit = (item: WorkContent) => {
    setIsCreatingNew(false)
    setEditingContentId(item.id)
  }

  const handleCancelEdit = () => {
    setEditingContentId(null)
  }

  const handleSaveContent = async (draft: ContentDraft, targetId: number | null) => {
    if (!draft.title.trim()) return

    applySaveStatus('saving')
    const payload = {
      ...draft,
      title: draft.title.trim(),
      detailed_record: draft.detailed_record || null,
      technical_materials: draft.technical_materials || null,
      result_data: draft.result_data || null,
      supplementary_notes: draft.supplementary_notes || null
    }

    try {
      if (targetId) {
        // 更新现有卡片
        const saved = await api.updateWorkContent(session.token, targetId, payload)
        setContents((items) => items.map((item) => (item.id === saved.id ? saved : item)))
        // 注意：不在此处重置 editingContentId，保持用户当前的沉浸编辑态；
        // 用户点击【完成编辑】或失焦点击外部时由对应回调收起卡片。
      } else {
        // 新建卡片
        const created = await api.createWorkContent(session.token, group.id, payload)
        setContents((items) => [...items, created])
        setIsCreatingNew(false)
        setActiveNavId(`work-content-${created.id}`)
      }

      applySaveStatus('saved')
    } catch (e) {
      setError((e as Error).message)
      applySaveStatus('idle')
    }
  }

  const handleUpdateOverview = async (payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => {
    applySaveStatus('saving')
    try {
      const updated = await api.updateExperienceGroup(session.token, currentGroup.id, payload)
      setCurrentGroup(updated)
      onUpdateGroup?.(updated)
      applySaveStatus('saved')
    } catch (e) {
      setError((e as Error).message)
      applySaveStatus('idle')
      throw e
    }
  }

  const handleDeleteContent = async (item: WorkContent) => {
    try {
      await api.deleteWorkContent(session.token, item.id)
      setContents((items) => items.filter((it) => it.id !== item.id))
      if (editingContentId === item.id) {
        setEditingContentId(null)
      }
      if (activeDrawerWorkContentId === item.id) {
        setActiveDrawerWorkContentId(null)
      }
      toast.success(`已删除工作内容：“${item.title}”`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleArchiveContent = async (item: WorkContent) => {
    try {
      const updated = item.archived
        ? await api.restoreWorkContent(session.token, item.id)
        : await api.archiveWorkContent(session.token, item.id)

      setContents((items) =>
        items.map((it) => (it.id === updated.id ? updated : it))
      )
      if (activeDrawerWorkContentId === item.id && updated.archived && !showArchived) {
        setActiveDrawerWorkContentId(null)
      }
      toast.success(`已${updated.archived ? '归档' : '恢复'}工作内容：“${updated.title}”`, {
        action: {
          label: '撤销',
          onClick: () => handleArchiveContent(updated),
        },
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleOpenDrawer = (item: WorkContent) => {
    setActiveDrawerWorkContentId((prev) => (prev === item.id ? null : item.id))
  }

  const handleCloseDrawer = () => {
    setActiveDrawerWorkContentId(null)
  }

  const handleOpenZenMode = (item: WorkContent) => {
    zenReturnScrollRef.current = window.scrollY
    // 画布被区域内替后原有就地编辑态已不可见，其未决修改也不再有承接者，
    // 因此退出编辑态并把脏标记归零，避免离开画布时弹出不成立的确认框。
    setEditingContentId(null)
    setIsCreatingNew(false)
    setActiveDrawerWorkContentId(null)
    setZenModeWorkContentId(item.id)
    onZenChange?.({ isOpen: true, title: item.title })
  }

  const handleZenTitleChange = (title: string) => {
    onZenChange?.({ isOpen: true, title })
  }

  /**
   * 关闭 Zen 并回到画布。
   * 画布是「卸载 → 重挂」，仅靠 scrollY 恢复不足以处理布局高度变化，
   * 因此恢复滚动位置后再把目标卡片滚入视野（block: 'nearest' 只在必要时移动）。
   */
  const handleCloseZenMode = useCallback(() => {
    const lastId = zenModeWorkContentId
    const restoreScroll = zenReturnScrollRef.current
    setZenModeWorkContentId(null)
    onZenChange?.({ isOpen: false, title: '' })
    if (lastId !== null) {
      setTimeout(() => {
        window.scrollTo({ top: restoreScroll })
        const el = document.getElementById(`work-content-${lastId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [zenModeWorkContentId, onZenChange])

  const handleUpdateDrawerVersions = async (
    workContentId: number,
    versions: ResumeDescriptionVersion[]
  ) => {
    const target = contents.find((item) => item.id === workContentId)
    if (!target) return
    const parsed = parseSupplementaryNotes(target.supplementary_notes)
    const serializedNotes = serializeSupplementaryNotes(parsed.note, versions)
    const payload = {
      title: target.title,
      detailed_record: target.detailed_record,
      technical_materials: target.technical_materials,
      result_data: target.result_data,
      supplementary_notes: serializedNotes
    }
    try {
      const saved = await api.updateWorkContent(session.token, workContentId, payload)
      setContents((items) => items.map((item) => (item.id === saved.id ? saved : item)))
    } catch (e) {
      setError((e as Error).message)
    }
  }


  const handleReorderContents = async (newContents: WorkContent[]) => {
    setContents(newContents)
    try {
      let workContentIds = newContents.map((item) => item.id)
      if (!showArchived) {
        const allContents = await api.workContents(session.token, currentGroup.id, true)
        let visibleIndex = 0
        workContentIds = allContents.map((item) =>
          item.archived ? item.id : newContents[visibleIndex++].id
        )
      }
      const saved = await api.reorderWorkContents(
        session.token,
        currentGroup.id,
        workContentIds
      )
      setContents(showArchived ? saved : saved.filter((item) => !item.archived))
    } catch (e) {
      setError((e as Error).message)
      setContents(contents)
    }
  }

  const handleReorderContent = async (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= contents.length ||
      targetIndex >= contents.length
    ) {
      return
    }

    const reordered = [...contents]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    await handleReorderContents(reordered)
  }

  const handleMoveContent = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= contents.length) return
    await handleReorderContent(index, targetIndex)
  }

  const zenWorkContent = useMemo(
    () => contents.find((item) => item.id === zenModeWorkContentId) ?? null,
    [contents, zenModeWorkContentId]
  )

  return (
    <div
      className={`focus-canvas-wrapper${zenWorkContent ? ' focus-canvas-wrapper--zen' : ''}`}
      ref={containerRef}
    >
      {toast.ToastPortal}
      {zenWorkContent ? (
        /* Zen 展开时区域内替画布（ADR 004 §2.1） */
        <ZenFocusEditor
          isOpen={true}
          workContent={zenWorkContent}
          onClose={handleCloseZenMode}
          onSaveContent={handleSaveContent}
          onUpdateVersions={handleUpdateDrawerVersions}
          isCompanionOpen={isCompanionOpen}
          onTitleChange={handleZenTitleChange}
          exitSignal={zenExitSignal}
        />
      ) : (
        <div className="focus-canvas-layout">
          <main className="focus-canvas-main-col">
            {error && <p className="error" role="alert">{error}</p>}

            <FocusCanvasDocument
              group={currentGroup}
              contents={contents}
              editingId={editingContentId}
              isCreatingNew={isCreatingNew}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveContent={handleSaveContent}
              onMoveContent={handleMoveContent}
              onReorderContent={handleReorderContent}
              onReorderContents={handleReorderContents}
              onDeleteContent={handleDeleteContent}
              onArchiveContent={handleArchiveContent}
              activeDrawerWorkContentId={activeDrawerWorkContentId}
              onOpenDrawer={handleOpenDrawer}
              onOpenZenMode={handleOpenZenMode}
              onStartCreateNew={() => {
                setEditingContentId(null)
                setIsCreatingNew(true)
              }}
              onCancelCreateNew={() => setIsCreatingNew(false)}
              onUpdateGroup={handleUpdateOverview}
            />
          </main>

          <aside className="focus-canvas-side-col">
            <OutlineNavigator
              group={currentGroup}
              contents={contents}
              activeId={activeNavId}
              onNavigate={handleNavigate}
              onAddNew={() => {
                if (editingContentId !== null) {
                  const confirmed = window.confirm('当前正在编辑工作内容，确定放弃未保存修改并新建吗？')
                  if (!confirmed) return
                }
                setEditingContentId(null)
                setIsCreatingNew(true)
                setTimeout(() => {
                  const el = document.querySelector('.creating-new-card')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }, 50)
              }}
            />
          </aside>
        </div>
      )}

      <ResumeDescriptionDrawer
        isOpen={activeDrawerWorkContentId !== null}
        workContent={contents.find((item) => item.id === activeDrawerWorkContentId) ?? null}
        onClose={handleCloseDrawer}
        onUpdateVersions={handleUpdateDrawerVersions}
      />
    </div>
  )
}
