import { Button, Modal } from '@heroui/react'

export type ConfirmDeleteWorkContentModalProps = {
  isOpen: boolean
  itemTitle: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteWorkContentModal({
  isOpen,
  itemTitle,
  onClose,
  onConfirm
}: ConfirmDeleteWorkContentModalProps) {
  if (!isOpen) return null

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
        <Modal.Dialog aria-label="确认删除工作项">
          <Modal.Header>
            <Modal.Heading className="delete-title">确认删除工作项</Modal.Heading>
            <Modal.CloseTrigger aria-label="关闭弹窗" />
          </Modal.Header>

          <Modal.Body>
            <div className="delete-warning-box">
              <p className="delete-warning-text">
                确定要删除工作项 <strong>“{itemTitle}”</strong> 吗？
              </p>
              <p className="delete-warning-subtext">
                此操作将从当前经历分组中彻底移除该条工作草稿，<strong>数据无法恢复</strong>。
              </p>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              size="sm"
              variant="ghost"
              onPress={onClose}
            >
              取消
            </Button>
            <Button
              size="sm"
              variant="danger"
              onPress={onConfirm}
            >
              确认删除
            </Button>
          </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
