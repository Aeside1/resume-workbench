import { FormEvent, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  TextArea
} from '@heroui/react'
import { ChevronDown } from 'lucide-react'
import type { ExperienceGroup } from '../../api'

export type EditExperienceDraft = {
  name: string
  type: 'internship' | 'project'
  organization: string
  start_date: string
  end_date: string
  description: string
}

export type EditExperienceModalProps = {
  isOpen: boolean
  group: ExperienceGroup | null
  onClose: () => void
  onSubmit: (draft: EditExperienceDraft) => Promise<void> | void
}

const defaultDraft: EditExperienceDraft = {
  name: '',
  type: 'project',
  organization: '',
  start_date: '',
  end_date: '',
  description: ''
}

export function EditExperienceModal({
  isOpen,
  group,
  onClose,
  onSubmit
}: EditExperienceModalProps) {
  const [draft, setDraft] = useState<EditExperienceDraft>(defaultDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (group) {
      setDraft({
        name: group.name || '',
        type: group.type || 'project',
        organization: group.organization || '',
        start_date: group.start_date || '',
        end_date: group.end_date || '',
        description: group.description || ''
      })
      setError('')
    }
  }, [group, isOpen])

  if (!isOpen || !group) return null

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = draft.name.trim()
    if (!trimmedName) return

    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        ...draft,
        name: trimmedName,
        organization: draft.organization.trim(),
        description: draft.description.trim()
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || '修改失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="create-experience-form">
            <Modal.Header>
              <Modal.Heading>编辑经历分组</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭弹窗" />
            </Modal.Header>

            <Modal.Body>
              {error && <p className="error" role="alert">{error}</p>}

              <div className="field">
                <Label htmlFor="edit-experience-name">经历名称</Label>
                <Input
                  id="edit-experience-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="例如：微信支付营销平台实习"
                  required
                />
              </div>

              <div className="field">
                <Label htmlFor="edit-experience-type">类型</Label>
                <Select
                  id="edit-experience-type"
                  aria-label="类型"
                  selectedKey={draft.type}
                  onSelectionChange={(key) =>
                    setDraft({ ...draft, type: String(key) as EditExperienceDraft['type'] })
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
                      <ListBoxItem id="internship" textValue="实习经历">
                        实习经历
                      </ListBoxItem>
                      <ListBoxItem id="project" textValue="项目经历">
                        项目经历
                      </ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="field">
                <Label htmlFor="edit-experience-organization">组织或项目归属</Label>
                <Input
                  id="edit-experience-organization"
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  placeholder="例如：腾讯科技 / 微信支付业务线"
                />
              </div>

              <div className="date-row">
                <div className="field">
                  <Label htmlFor="edit-experience-start">开始日期</Label>
                  <Input
                    id="edit-experience-start"
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <Label htmlFor="edit-experience-end">结束日期</Label>
                  <Input
                    id="edit-experience-end"
                    type="date"
                    value={draft.end_date}
                    onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <Label htmlFor="edit-experience-description">整体说明</Label>
                <TextArea
                  id="edit-experience-description"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="简述该经历的业务背景、你的核心使命与整体技术栈..."
                  rows={3}
                />
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="ghost"
                onPress={handleClose}
                isDisabled={submitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={submitting || !draft.name.trim()}
              >
                {submitting ? '保存中...' : '保存修改'}
              </Button>
            </Modal.Footer>
          </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
