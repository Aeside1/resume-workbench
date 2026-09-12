import { useEffect, useRef, useState } from 'react'
import { api, ExperienceGroup, WorkContent } from '../../api'
import type { Session } from '../../session'
import { FocusCanvasDocument } from './FocusCanvasDocument'
import { OutlineNavigator } from './OutlineNavigator'
import type { ContentDraft } from './WorkContentBlock'

export type FocusCanvasContainerProps = {
  session: Session
  group: ExperienceGroup
  onExitFocus: () => void
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved') => void
  onDirtyChange?: (isDirty: boolean) => void
}

export function FocusCanvasContainer({
  session,
  group,
  onExitFocus: _onExitFocus,
  onSaveStatusChange,
  onDirtyChange
}: FocusCanvasContainerProps) {
  const [contents, setContents] = useState<WorkContent[]>([])
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeNavId, setActiveNavId] = useState<string>('section-overview')
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  const handleArchiveContent = async (item: WorkContent) => {
    try {
      const updated = item.archived
        ? await api.restoreWorkContent(session.token, item.id)
        : await api.archiveWorkContent(session.token, item.id)

      setContents((items) =>
        items.map((current) => (current.id === updated.id ? updated : current))
      )
      if (updated.archived) {
        setShowArchived(true)
        setNotice('具体工作内容已归档，已显示已归档内容，可在列表中恢复。')
      } else {
        setNotice('具体工作内容已恢复。')
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleMoveContent = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= contents.length) return

    const next = [...contents]
    ;[next[index], next[target]] = [next[target], next[index]]
    setContents(next)

    try {
      let workContentIds = next.map((item) => item.id)
      if (!showArchived) {
        const allContents = await api.workContents(session.token, group.id, true)
        let visibleIndex = 0
        workContentIds = allContents.map((item) =>
          item.archived ? item.id : next[visibleIndex++].id
        )
      }
      const reordered = await api.reorderWorkContents(session.token, group.id, workContentIds)
      setContents(showArchived ? reordered : reordered.filter((item) => !item.archived))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="focus-canvas-wrapper" ref={containerRef}>
      <div className="focus-canvas-layout">
        <main className="focus-canvas-main-col">
          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}

          <FocusCanvasDocument
            group={group}
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
          />
        </main>

        <aside className="focus-canvas-side-col">
          <OutlineNavigator
            group={group}
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
