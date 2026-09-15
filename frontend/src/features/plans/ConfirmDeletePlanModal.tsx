import { Button, Modal } from '@heroui/react'

export type ConfirmDeletePlanModalProps = {
  isOpen: boolean
  planName: string
  onClose: () => void
  onConfirm: () => void
}

/** 彻底删除简历方案：要说清「方案没了，但经历资产还在」。 */
export function ConfirmDeletePlanModal({ isOpen, planName, onClose, onConfirm }: ConfirmDeletePlanModalProps) {
  if (!isOpen) return null

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog aria-label="确认彻底删除简历方案">
            <Modal.Header>
              <Modal.Heading className="delete-title">确认彻底删除简历方案</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭弹窗" />
            </Modal.Header>

            <Modal.Body>
              <div className="delete-warning-box">
                <p className="delete-warning-text">
                  确定要彻底删除简历方案 <strong>“{planName}”</strong> 吗？
                </p>
                <p className="delete-warning-subtext">
                  此操作会一并清除该方案的简历大纲与全部简历条目，<strong>数据无法恢复</strong>。
                  经历资产里的经历分组、具体工作内容与简历亮点不受影响。
                </p>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button size="sm" variant="ghost" onPress={onClose}>
                取消
              </Button>
              <Button size="sm" variant="danger" onPress={onConfirm}>
                确认彻底删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
