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
      <Modal.Backdrop className="modal-backdrop-custom" />
      <Modal.Container className="modal-container-custom">
        <Modal.Dialog className="modal-dialog-custom delete-confirm-dialog" aria-label="确认删除工作项">
          <Modal.Header className="modal-header-custom delete-dialog-header">
            <Modal.Heading className="modal-title delete-title">确认删除工作项</Modal.Heading>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              className="modal-close-btn"
              aria-label="关闭弹窗"
              onPress={onClose}
            >
              ✕
            </Button>
          </Modal.Header>

          <Modal.Body className="modal-body-custom delete-dialog-body">
            <div className="delete-warning-box">
              <p className="delete-warning-text">
                确定要删除工作项 <strong>“{itemTitle}”</strong> 吗？
              </p>
              <p className="delete-warning-subtext">
                此操作将从当前经历分组中彻底移除该条工作草稿，<strong>数据无法恢复</strong>。
              </p>
            </div>
          </Modal.Body>

          <Modal.Footer className="modal-footer-custom delete-dialog-footer">
            <Button
              size="sm"
              variant="ghost"
              className="modal-btn-cancel"
              onPress={onClose}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="modal-btn-delete-confirm"
              onPress={onConfirm}
            >
              确认删除
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Root>
  )
}
