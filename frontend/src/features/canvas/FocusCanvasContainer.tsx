import { useEffect, useRef, useState } from 'react'
import { api, type ExperienceGroup, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { useToast } from '../../components/ui/Toast'
import { OutlineNavigator } from './OutlineNavigator'
import { FocusCanvasDocument } from './FocusCanvasDocument'
import type { ContentDraft } from './WorkContentBlock'

type Props = {
  session: Session
  group: ExperienceGroup
  onExitFocus?: () => void
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved') => void
  onDirtyChange?: (isDirty: boolean) => void
  onUpdateGroup?: (group: ExperienceGroup) => void
}

export function FocusCanvasContainer({
  session,
  group,
  onExitFocus,
  onSaveStatusChange,
  onDirtyChange,
  onUpdateGroup
}: Props) {
  const [currentGroup, setCurrentGroup] = useState<ExperienceGroup>(group)
  const [contents, setContents] = useState<WorkContent[]>([])
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeNavId, setActiveNavId] = useState<string>('section-overview')
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  useEffect(() => {
    setCurrentGroup(group)
  }, [group])

  const containerRef = useRef<HTMLDivElement>(null)

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

    onSaveStatusChange?.('saving')
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
        setEditingContentId(null)
      } else {
        // 新建卡片
        const created = await api.createWorkContent(session.token, group.id, payload)
        setContents((items) => [...items, created])
        setIsCreatingNew(false)
        setActiveNavId(`work-content-${created.id}`)
      }

      onSaveStatusChange?.('saved')
      setTimeout(() => onSaveStatusChange?.('idle'), 2500)
    } catch (e) {
      setError((e as Error).message)
      onSaveStatusChange?.('idle')
    }
  }

  const handleUpdateOverview = async (payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => {
    onSaveStatusChange?.('saving')
    try {
      const updated = await api.updateExperienceGroup(session.token, currentGroup.id, payload)
      setCurrentGroup(updated)
      onUpdateGroup?.(updated)
      onSaveStatusChange?.('saved')
      setTimeout(() => onSaveStatusChange?.('idle'), 2500)
    } catch (e) {
      setError((e as Error).message)
      onSaveStatusChange?.('idle')
      throw e
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

  const handleMoveContent = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= contents.length) return

    const reordered = [...contents]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setContents(reordered)
    try {
      let workContentIds = reordered.map((item) => item.id)
      if (!showArchived) {
        const allContents = await api.workContents(session.token, currentGroup.id, true)
        let visibleIndex = 0
        workContentIds = allContents.map((item) =>
          item.archived ? item.id : reordered[visibleIndex++].id
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

  return (
    <div className="focus-canvas-wrapper" ref={containerRef}>
      {toast.ToastPortal}
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
            onArchiveContent={handleArchiveContent}
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
    </div>
  )
}
