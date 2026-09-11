import { FormEvent, useState } from 'react'
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

export type CreateExperienceDraft = {
  name: string
  type: 'internship' | 'project'
  organization: string
  start_date: string
  end_date: string
  description: string
}

export type CreateExperienceModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (draft: CreateExperienceDraft) => Promise<void> | void
}

const defaultDraft: CreateExperienceDraft = {
  name: '',
  type: 'project',
  organization: '',
  start_date: '',
  end_date: '',
  description: ''
}

export function CreateExperienceModal({
  isOpen,
  onClose,
  onSubmit
}: CreateExperienceModalProps) {
  const [draft, setDraft] = useState<CreateExperienceDraft>(defaultDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleClose = () => {
    setDraft(defaultDraft)
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
      setDraft(defaultDraft)
      onClose()
    } catch (err) {
      setError((err as Error).message || '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop className="modal-backdrop-custom" />
      <Modal.Container className="modal-container-custom">
        <Modal.Dialog className="modal-dialog-custom">
          <form onSubmit={handleSubmit} className="create-experience-form">
            <Modal.Header className="modal-header-custom">
              <Modal.Heading className="modal-title">新建经历分组</Modal.Heading>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                className="modal-close-btn"
                aria-label="关闭弹窗"
                onClick={handleClose}
              >
                ✕
              </Button>
            </Modal.Header>

            <Modal.Body className="modal-body-custom">
              {error && <p className="error" role="alert">{error}</p>}

              <div className="field">
                <Label htmlFor="experience-name">经历名称</Label>
                <Input
                  id="experience-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="例如：微信支付营销平台实习"
                  required
                />
              </div>

              <div className="field">
                <Label htmlFor="experience-type">类型</Label>
                <Select
                  id="experience-type"
                  aria-label="类型"
                  selectedKey={draft.type}
                  onSelectionChange={(key) =>
                    setDraft({ ...draft, type: String(key) as CreateExperienceDraft['type'] })
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
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
                <Label htmlFor="experience-organization">组织或项目归属</Label>
                <Input
                  id="experience-organization"
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  placeholder="例如：腾讯科技 / 微信支付业务线"
                />
              </div>

              <div className="date-row">
                <div className="field">
                  <Label htmlFor="experience-start">开始日期</Label>
                  <Input
                    id="experience-start"
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <Label htmlFor="experience-end">结束日期</Label>
                  <Input
                    id="experience-end"
                    type="date"
                    value={draft.end_date}
                    onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <Label htmlFor="experience-description">整体说明</Label>
                <TextArea
                  id="experience-description"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="简述该经历的业务背景、你的核心使命与整体技术栈..."
                  rows={3}
                />
              </div>
            </Modal.Body>

            <Modal.Footer className="modal-footer-custom">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                isDisabled={submitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={submitting || !draft.name.trim()}
              >
                {submitting ? '创建中...' : '创建经历分组'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Root>
  )
}
