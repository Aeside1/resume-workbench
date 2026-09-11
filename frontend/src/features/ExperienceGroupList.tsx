import { FormEvent } from 'react'
import { Button, Checkbox, Input, Label, ListBox, ListBoxItem, Select, TextArea } from '@heroui/react'
import type { ExperienceGroup } from '../api'

export type GroupDraft = { name: string; type: 'internship' | 'project'; organization: string; start_date: string; end_date: string; description: string }

type Props = {
  groups: ExperienceGroup[]
  selectedId: number | null
  draft: GroupDraft
  showArchived: boolean
  onSelect: (id: number) => void
  onDraftChange: (draft: GroupDraft) => void
  onShowArchivedChange: (value: boolean) => void
  onSubmit: (event: FormEvent) => void
}

export function ExperienceGroupList({ groups, selectedId, draft, showArchived, onSelect, onDraftChange, onShowArchivedChange, onSubmit }: Props) {
  return <aside className="group-column">
    <Checkbox isSelected={showArchived} onChange={onShowArchivedChange} className="archive-toggle"><Checkbox.Control /><Checkbox.Content>显示已归档</Checkbox.Content></Checkbox>
    <div className="group-list" aria-label="经历分组列表">{groups.map(group => <button key={group.id} className={`group-list-item ${group.id === selectedId ? 'selected' : ''}`} onClick={() => onSelect(group.id)}><strong>{group.name}</strong><span>{group.type === 'internship' ? '实习经历' : '项目经历'}{group.archived ? ' · 已归档' : ''}</span>{(group.start_date || group.end_date) && <small>{group.start_date || '至今'} — {group.end_date || '至今'}</small>}</button>)}{!groups.length && <div className="empty-copy">还没有经历分组，先创建一段实习或项目经历。</div>}</div>
    <form className="stack-form" onSubmit={onSubmit}><h3>新建经历分组</h3><div className="field"><Label htmlFor="experience-name">经历名称</Label><Input id="experience-name" value={draft.name} onChange={event => onDraftChange({ ...draft, name: event.target.value })} placeholder="例如：支付平台实习" required /></div><div className="field"><Label htmlFor="experience-type">类型</Label><Select id="experience-type" aria-label="类型" selectedKey={draft.type} onSelectionChange={key => onDraftChange({ ...draft, type: String(key) as GroupDraft['type'] })}><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox><ListBoxItem id="internship" textValue="实习经历">实习经历</ListBoxItem><ListBoxItem id="project" textValue="项目经历">项目经历</ListBoxItem></ListBox></Select.Popover></Select></div><div className="field"><Label htmlFor="experience-organization">组织或项目归属</Label><Input id="experience-organization" value={draft.organization} onChange={event => onDraftChange({ ...draft, organization: event.target.value })} /></div><div className="date-row"><div className="field"><Label htmlFor="experience-start">开始日期</Label><Input id="experience-start" type="date" value={draft.start_date} onChange={event => onDraftChange({ ...draft, start_date: event.target.value })} /></div><div className="field"><Label htmlFor="experience-end">结束日期</Label><Input id="experience-end" type="date" value={draft.end_date} onChange={event => onDraftChange({ ...draft, end_date: event.target.value })} /></div></div><div className="field"><Label htmlFor="experience-description">整体说明</Label><TextArea id="experience-description" value={draft.description} onChange={event => onDraftChange({ ...draft, description: event.target.value })} /></div><Button type="submit" variant="primary">创建经历分组</Button></form>
  </aside>
}
