import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { api, ExperienceGroup, WorkContent } from '../api'
import type { Session } from '../session'
import { ExperienceGroupList, GroupDraft } from './ExperienceGroupList'
import { ContentDraft, WorkContentEditor } from './WorkContentEditor'

type Props = { session: Session }
const emptyGroup: GroupDraft = { name: '', type: 'project', organization: '', start_date: '', end_date: '', description: '' }
const emptyContent: ContentDraft = { title: '', detailed_record: '', technical_materials: '', result_data: '', supplementary_notes: '' }

export function ExperienceGroupsPanel({ session }: Props) {
  const [groups, setGroups] = useState<ExperienceGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [contents, setContents] = useState<WorkContent[]>([])
  const [groupDraft, setGroupDraft] = useState(emptyGroup)
  const [contentDraft, setContentDraft] = useState(emptyContent)
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selectedGroup = useMemo(() => groups.find(group => group.id === selectedId) ?? null, [groups, selectedId])

  useEffect(() => {
    api.experienceGroups(session.token, session.selectedWorkspaceId, showArchived).then(result => { setGroups(result); setSelectedId(current => current && result.some(group => group.id === current) ? current : result[0]?.id ?? null) }).catch(e => setError((e as Error).message))
  }, [session.token, session.selectedWorkspaceId, showArchived])
  useEffect(() => {
    if (!selectedId) { setContents([]); return }
    api.workContents(session.token, selectedId, showArchived).then(setContents).catch(e => setError((e as Error).message))
  }, [session.token, selectedId, showArchived])

  const createGroup = async (event: FormEvent) => {
    event.preventDefault(); if (!groupDraft.name.trim()) return
    try { const group = await api.createExperienceGroup(session.token, session.selectedWorkspaceId, { ...groupDraft, name: groupDraft.name.trim(), organization: groupDraft.organization || null, start_date: groupDraft.start_date || null, end_date: groupDraft.end_date || null, description: groupDraft.description || null }); setGroups(current => [group, ...current]); setSelectedId(group.id); setGroupDraft(emptyGroup) } catch (e) { setError((e as Error).message) }
  }
  const startEditContent = (item: WorkContent) => { setEditingContentId(item.id); setContentDraft({ title: item.title, detailed_record: item.detailed_record ?? '', technical_materials: item.technical_materials ?? '', result_data: item.result_data ?? '', supplementary_notes: item.supplementary_notes ?? '' }) }
  const saveContent = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedId || !contentDraft.title.trim()) return
    const payload = { ...contentDraft, title: contentDraft.title.trim(), detailed_record: contentDraft.detailed_record || null, technical_materials: contentDraft.technical_materials || null, result_data: contentDraft.result_data || null, supplementary_notes: contentDraft.supplementary_notes || null }
    try { const saved = editingContentId ? await api.updateWorkContent(session.token, editingContentId, payload) : await api.createWorkContent(session.token, selectedId, payload); setContents(items => editingContentId ? items.map(item => item.id === saved.id ? saved : item) : [...items, saved]); setContentDraft(emptyContent); setEditingContentId(null) } catch (e) { setError((e as Error).message) }
  }
  const archiveGroup = async () => {
    if (!selectedGroup) return
    try {
      const updated = selectedGroup.archived ? await api.restoreExperienceGroup(session.token, selectedGroup.id) : await api.archiveExperienceGroup(session.token, selectedGroup.id)
      setGroups(items => items.map(item => item.id === updated.id ? updated : item))
      setSelectedId(updated.id)
      if (updated.archived) {
        setShowArchived(true)
        setNotice('经历分组已归档，已显示已归档内容，可在列表中恢复。')
      } else {
        setNotice('经历分组已恢复。')
      }
    } catch (e) { setError((e as Error).message) }
  }
  const archiveContent = async (item: WorkContent) => {
    try {
      const updated = item.archived ? await api.restoreWorkContent(session.token, item.id) : await api.archiveWorkContent(session.token, item.id)
      setContents(items => items.map(current => current.id === updated.id ? updated : current))
      if (updated.archived) {
        setShowArchived(true)
        setNotice('具体工作内容已归档，已显示已归档内容，可在列表中恢复。')
      } else {
        setNotice('具体工作内容已恢复。')
      }
    } catch (e) { setError((e as Error).message) }
  }
  const moveContent = async (index: number, direction: -1 | 1) => {
    if (!selectedId) return
    const target = index + direction
    if (target < 0 || target >= contents.length) return

    const next = [...contents]
    ;[next[index], next[target]] = [next[target], next[index]]
    setContents(next)

    try {
      let workContentIds = next.map(item => item.id)
      if (!showArchived) {
        const allContents = await api.workContents(session.token, selectedId, true)
        let visibleIndex = 0
        workContentIds = allContents.map(item => item.archived ? item.id : next[visibleIndex++].id)
      }
      const reordered = await api.reorderWorkContents(session.token, selectedId, workContentIds)
      setContents(showArchived ? reordered : reordered.filter(item => !item.archived))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return <section className="experience-panel"><div className="section-heading"><div><h2>经历分组</h2><p className="muted">整理实习经历或项目经历，再逐步沉淀具体工作内容。</p></div></div>{error && <p className="error">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<div className="experience-layout"><ExperienceGroupList groups={groups} selectedId={selectedId} draft={groupDraft} showArchived={showArchived} onSelect={setSelectedId} onDraftChange={setGroupDraft} onShowArchivedChange={setShowArchived} onSubmit={createGroup} /><div className="content-column">{selectedGroup ? <><div className="detail-header"><div><h2>{selectedGroup.name}</h2><p>{selectedGroup.organization || '未填写归属'} · {selectedGroup.type === 'internship' ? '实习经历' : '项目经历'}</p></div><Button variant="secondary" onPress={archiveGroup}>{selectedGroup.archived ? '恢复经历分组' : '归档经历分组'}</Button></div><p className="group-description">{selectedGroup.description || '还没有整体说明。'}</p><WorkContentEditor contents={contents} draft={contentDraft} editingId={editingContentId} onDraftChange={setContentDraft} onStartEdit={startEditContent} onSubmit={saveContent} onCancel={() => { setEditingContentId(null); setContentDraft(emptyContent) }} onMove={moveContent} onArchive={archiveContent} /></> : <div className="empty-state"><h2>开始整理一段经历</h2><p>创建实习经历或项目经历后，这里会显示具体工作内容列表。</p><p>这是你的基础工作台。接下来可以创建经历分组，逐步沉淀具体工作内容。</p></div>}</div></div></section>
}
