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
      <Modal.Backdrop>
        <Modal.Container size="sm">
        <Modal.Dialog aria-label="确认彻底删除">
          <Modal.Header>
            <Modal.Heading className="delete-title">确认彻底删除经历分组</Modal.Heading>
            <Modal.CloseTrigger aria-label="关闭弹窗" />
          </Modal.Header>

          <Modal.Body>
            <div className="delete-warning-box">
              <p className="delete-warning-text">
                确定要彻底删除经历分组 <strong>“{groupName}”</strong> 吗？
              </p>
              <p className="delete-warning-subtext">
                此操作将永久清除该经历名下关联的全部具体工作内容，<strong>数据无法恢复</strong>。
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
              确认彻底删除
            </Button>
          </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
