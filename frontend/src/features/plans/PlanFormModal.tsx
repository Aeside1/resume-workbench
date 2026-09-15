import { FormEvent, useEffect, useState } from 'react'
import { Button, Input, Label, Modal, TextArea } from '@heroui/react'
import type { ResumePlan } from '../../api'

export type PlanDraft = { name: string; purpose: string }

export type PlanFormModalProps = {
  isOpen: boolean
  /** 传入已有方案表示编辑，否则为新建 */
  plan?: ResumePlan | null
  onClose: () => void
  onSubmit: (draft: PlanDraft) => Promise<void> | void
}

const emptyDraft: PlanDraft = { name: '', purpose: '' }

/** 新建 / 编辑简历方案（名称 + 简历用途）。 */
export function PlanFormModal({ isOpen, plan = null, onClose, onSubmit }: PlanFormModalProps) {
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isEditing = plan !== null

  useEffect(() => {
    if (!isOpen) return
    setDraft(plan ? { name: plan.name, purpose: plan.purpose ?? '' } : emptyDraft)
    setError('')
  }, [isOpen, plan])

  if (!isOpen) return null

  const handleClose = () => {
    setDraft(emptyDraft)
    setError('')
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({ name, purpose: draft.purpose.trim() })
      onClose()
    } catch (err) {
      setError((err as Error).message || '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <form onSubmit={handleSubmit} className="plan-form">
              <Modal.Header>
                <Modal.Heading>{isEditing ? '编辑简历方案' : '新建简历方案'}</Modal.Heading>
                <Modal.CloseTrigger aria-label="关闭弹窗" />
              </Modal.Header>

              <Modal.Body>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}

                <div className="field">
                  <Label htmlFor="plan-name">方案名称</Label>
                  <Input
                    id="plan-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="例如：2026 后端岗"
                    required
                  />
                </div>

                <div className="field">
                  <Label htmlFor="plan-purpose">简历用途</Label>
                  <TextArea
                    id="plan-purpose"
                    value={draft.purpose}
                    onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                    placeholder="例如：支付中台方向的社招投递"
                    rows={2}
                  />
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="ghost" onPress={handleClose} isDisabled={submitting}>
                  取消
                </Button>
                <Button type="submit" variant="primary" isDisabled={submitting || !draft.name.trim()}>
                  {submitting ? '保存中...' : isEditing ? '保存修改' : '创建简历方案'}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
