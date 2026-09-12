import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@heroui/react'
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
    <section
      id="section-overview"
      className={`focus-experience-overview ${isEditing ? 'editing' : ''}`}
      aria-label="经历概况"
    >
      {isEditing ? (
        <form className="overview-edit-form" onSubmit={handleSave}>
          <div className="edit-form-header">
            <span className="edit-form-kicker">编辑经历概况</span>
          </div>

          <div className="canvas-field">
            <label htmlFor="overview-edit-name">经历名称</label>
            <input
              id="overview-edit-name"
              data-slot="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </div>

          <div className="overview-form-grid">
            <div className="canvas-field">
              <label htmlFor="overview-edit-type">经历类型</label>
              <select
                id="overview-edit-type"
                data-slot="input"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as 'internship' | 'project' })}
              >
                <option value="internship">实习经历</option>
                <option value="project">项目经历</option>
              </select>
            </div>

            <div className="canvas-field">
              <label htmlFor="overview-edit-org">组织归属</label>
              <input
                id="overview-edit-org"
                data-slot="input"
                value={draft.organization}
                onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                placeholder="例如：阿里巴巴 / 核心业务部"
              />
            </div>
          </div>

          <div className="overview-form-grid">
            <div className="canvas-field">
              <label htmlFor="overview-edit-start">开始日期</label>
              <input
                id="overview-edit-start"
                data-slot="input"
                type="date"
                value={draft.start_date}
                onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
              />
            </div>
            <div className="canvas-field">
              <label htmlFor="overview-edit-end">结束日期</label>
              <input
                id="overview-edit-end"
                data-slot="input"
                type="date"
                value={draft.end_date}
                onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="canvas-field">
            <label htmlFor="overview-edit-desc">团队背景与整体说明</label>
            <textarea
              id="overview-edit-desc"
              data-slot="textarea"
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
              <span className={`overview-type-pill ${group.type}`}>
                {isInternship ? '实习经历' : '项目经历'}
              </span>
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
                className="edit-overview-btn"
                aria-label="编辑经历概况"
                onPress={() => setIsEditing(true)}
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
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
    </section>
  )
}
