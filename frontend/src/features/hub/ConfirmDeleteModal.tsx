import { Button, Modal } from '@heroui/react'

export type ConfirmDeleteModalProps = {
  isOpen: boolean
  groupName: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDeleteModal({
  isOpen,
  groupName,
  onClose,
  onConfirm
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop className="modal-backdrop-custom" />
      <Modal.Container className="modal-container-custom">
        <Modal.Dialog className="modal-dialog-custom delete-confirm-dialog" aria-label="确认彻底删除">
          <Modal.Header className="modal-header-custom delete-dialog-header">
            <Modal.Heading className="modal-title delete-title">确认彻底删除经历分组</Modal.Heading>
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
                确定要彻底删除经历分组 <strong>“{groupName}”</strong> 吗？
              </p>
              <p className="delete-warning-subtext">
                此操作将永久清除该经历名下关联的全部具体工作内容，<strong>数据无法恢复</strong>。
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
              确认彻底删除
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Root>
  )
}
