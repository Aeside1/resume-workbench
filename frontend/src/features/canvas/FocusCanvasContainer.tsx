import { FormEvent, useEffect, useState } from 'react'
import { api, ExperienceGroup, WorkContent } from '../../api'
import type { Session } from '../../session'
import { ContentDraft, WorkContentEditor } from '../WorkContentEditor'

export type FocusCanvasContainerProps = {
  session: Session
  group: ExperienceGroup
  onExitFocus: () => void
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved') => void
}

const emptyContent: ContentDraft = {
  title: '',
  detailed_record: '',
  technical_materials: '',
  result_data: '',
  supplementary_notes: ''
}

export function FocusCanvasContainer({
  session,
  group,
  onExitFocus: _onExitFocus,
  onSaveStatusChange
}: FocusCanvasContainerProps) {
  const [contents, setContents] = useState<WorkContent[]>([])
  const [contentDraft, setContentDraft] = useState<ContentDraft>(emptyContent)
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.workContents(session.token, group.id, showArchived)
      .then(setContents)
      .catch((e) => setError((e as Error).message))
  }, [session.token, group.id, showArchived])

  const startEditContent = (item: WorkContent) => {
    setEditingContentId(item.id)
    setContentDraft({
      title: item.title,
      detailed_record: item.detailed_record ?? '',
      technical_materials: item.technical_materials ?? '',
      result_data: item.result_data ?? '',
      supplementary_notes: item.supplementary_notes ?? ''
    })
  }

  const saveContent = async (event: FormEvent) => {
    event.preventDefault()
    if (!contentDraft.title.trim()) return

    onSaveStatusChange?.('saving')
    const payload = {
      ...contentDraft,
      title: contentDraft.title.trim(),
      detailed_record: contentDraft.detailed_record || null,
      technical_materials: contentDraft.technical_materials || null,
      result_data: contentDraft.result_data || null,
      supplementary_notes: contentDraft.supplementary_notes || null
    }

    try {
      const saved = editingContentId
        ? await api.updateWorkContent(session.token, editingContentId, payload)
        : await api.createWorkContent(session.token, group.id, payload)

      setContents((items) =>
        editingContentId
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved]
      )
      setContentDraft(emptyContent)
      setEditingContentId(null)
      onSaveStatusChange?.('saved')
      setTimeout(() => onSaveStatusChange?.('idle'), 2500)
    } catch (e) {
      setError((e as Error).message)
      onSaveStatusChange?.('idle')
    }
  }

  const archiveContent = async (item: WorkContent) => {
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

  const moveContent = async (index: number, direction: -1 | 1) => {
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
    <div className="focus-canvas-wrapper">
      <div className="focus-canvas-document">
        <header className="focus-experience-overview">
          <div className="overview-header-row">
            <div>
              <span className="overview-type-pill">
                {group.type === 'internship' ? '实习经历' : '项目经历'}
              </span>
              <h2 className="overview-title">{group.name}</h2>
              <p className="overview-org-date">
                <span>{group.organization || '未填写归属'}</span>
                {(group.start_date || group.end_date) && (
                  <>
                    <span className="dot-divider">·</span>
                    <span>{group.start_date || '至今'} — {group.end_date || '至今'}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {group.description && (
            <div className="overview-description-box">
              <p>{group.description}</p>
            </div>
          )}
        </header>

        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        <section className="focus-work-contents-section">
          <WorkContentEditor
            contents={contents}
            draft={contentDraft}
            editingId={editingContentId}
            onDraftChange={setContentDraft}
            onStartEdit={startEditContent}
            onSubmit={saveContent}
            onCancel={() => {
              setEditingContentId(null)
              setContentDraft(emptyContent)
            }}
            onMove={moveContent}
            onArchive={archiveContent}
          />
        </section>
      </div>
    </div>
  )
}
