import { FormEvent, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  TextArea
} from '@heroui/react'
import { ChevronDown, Pencil } from 'lucide-react'
import type { ExperienceGroup } from '../../api'

export type ExperienceOverviewSectionProps = {
  group: ExperienceGroup
  onUpdate?: (payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => Promise<void> | void
}

export function ExperienceOverviewSection({ group, onUpdate }: ExperienceOverviewSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: group.name || '',
    type: group.type || 'project',
    organization: group.organization || '',
    start_date: group.start_date || '',
    end_date: group.end_date || '',
    description: group.description || ''
  })

  useEffect(() => {
    setDraft({
      name: group.name || '',
      type: group.type || 'project',
      organization: group.organization || '',
      start_date: group.start_date || '',
      end_date: group.end_date || '',
      description: group.description || ''
    })
  }, [group])

  const isInternship = group.type === 'internship'
  const hasDates = Boolean(group.start_date || group.end_date)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      await onUpdate?.({
        name: draft.name.trim(),
        type: draft.type,
        organization: draft.organization.trim() || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        description: draft.description.trim() || null
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft({
      name: group.name || '',
      type: group.type || 'project',
      organization: group.organization || '',
      start_date: group.start_date || '',
      end_date: group.end_date || '',
      description: group.description || ''
    })
    setIsEditing(false)
  }

  return (
    <Card
      id="section-overview"
      className={`overview-card ${isEditing ? 'overview-card--editing' : ''}`}
      aria-label="经历概况"
    >
      <Card.Content>
        {isEditing ? (
          <form className="overview-edit-form" onSubmit={handleSave}>
            <div className="edit-form-header">
              <span className="edit-form-kicker">编辑经历概况</span>
            </div>

            <div className="field">
              <Label htmlFor="overview-edit-name">经历名称</Label>
              <Input
                id="overview-edit-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>

            <div className="overview-form-grid">
              <div className="field">
                <Label htmlFor="overview-edit-type">经历类型</Label>
                <Select
                  id="overview-edit-type"
                  aria-label="经历类型"
                  selectedKey={draft.type}
                  onSelectionChange={(key) =>
                    setDraft({ ...draft, type: String(key) as 'internship' | 'project' })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator>
                      <ChevronDown size={16} aria-hidden="true" />
                    </Select.Indicator>
                  </Select.Trigger>
                  <Select.Popover className="experience-type-popover">
                    <ListBox>
                      <ListBoxItem id="internship" textValue="实习经历">实习经历</ListBoxItem>
                      <ListBoxItem id="project" textValue="项目经历">项目经历</ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="field">
                <Label htmlFor="overview-edit-org">组织归属</Label>
                <Input
                  id="overview-edit-org"
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  placeholder="例如：阿里巴巴 / 核心业务部"
                />
              </div>
            </div>

            <div className="overview-form-grid">
              <div className="field">
                <Label htmlFor="overview-edit-start">开始日期</Label>
                <Input
                  id="overview-edit-start"
                  type="date"
                  value={draft.start_date}
                  onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                />
              </div>
              <div className="field">
                <Label htmlFor="overview-edit-end">结束日期</Label>
                <Input
                  id="overview-edit-end"
                  type="date"
                  value={draft.end_date}
                  onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <Label htmlFor="overview-edit-desc">团队背景与整体说明</Label>
              <TextArea
                id="overview-edit-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                placeholder="简述整体团队背景、核心使命或主要技术栈..."
              />
            </div>

            <div className="edit-form-actions">
              <Button
                type="submit"
                variant="primary"
                isDisabled={!draft.name.trim() || saving}
              >
                {saving ? '保存中...' : '保存概况'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onPress={handleCancel}
                isDisabled={saving}
              >
                取消
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="overview-header-row">
              <div>
                <Chip
                  size="sm"
                  className={isInternship ? 'chip-type-internship' : 'chip-project'}
                >
                  <Chip.Label>{isInternship ? '实习经历' : '项目经历'}</Chip.Label>
                </Chip>
                <h2 className="overview-title">{group.name}</h2>
                <p className="overview-org-date">
                  <span>{group.organization || '未填写归属'}</span>
                  {hasDates && (
                    <>
                      <span className="dot-divider" aria-hidden="true">·</span>
                      <span>
                        {group.start_date || '至今'} — {group.end_date || '至今'}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {onUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="编辑经历概况"
                  onPress={() => setIsEditing(true)}
                >
                  <Pencil size={14} aria-hidden="true" />
                  编辑概况
                </Button>
              )}
            </div>

            {group.description && (
              <div className="overview-description-box">
                <p>{group.description}</p>
              </div>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  )
}
