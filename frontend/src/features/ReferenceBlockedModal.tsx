import { Button, Modal } from '@heroui/react'

export type ReferenceBlockedModalProps = {
  isOpen: boolean
  /** 默认「无法彻底删除」；一般失败传「删除失败」 */
  title?: string
  message: string
  onClose: () => void
}

/**
 * 删除被阻断时的模态提示（04j）。
 *
 * 为什么不用内联红字：删除是在确认弹窗里点的，请求失败后确认弹窗关闭、内联提示落在
 * 内容区顶部——画布一旦滚下去就等于什么都没发生。被引用而删不掉是**需要用户去处理**
 * 的阻断状态（去哪几份方案里移除引用），必须弹出来并点名是哪几份方案。
 */
export function ReferenceBlockedModal({
  isOpen,
  title = '无法彻底删除',
  message,
  onClose
}: ReferenceBlockedModalProps) {
  if (!isOpen) return null

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog aria-label={title}>
            <Modal.Header>
              <Modal.Heading className="delete-title">{title}</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭弹窗" />
            </Modal.Header>

            <Modal.Body>
              <div className="delete-warning-box">
                <p className="delete-warning-text">{message}</p>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button size="sm" variant="primary" onPress={onClose}>
                知道了
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
