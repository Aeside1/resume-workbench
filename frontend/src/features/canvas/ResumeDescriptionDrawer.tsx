import { Drawer } from '@heroui/react'
import { FileText } from 'lucide-react'
import type { WorkContent } from '../../api'
import { ResumeVersionsFeed } from './ResumeVersionsFeed'
import type { ResumeDescriptionVersion } from './supplementaryNotes'

export type ResumeDescriptionDrawerProps = {
  isOpen: boolean
  workContent: WorkContent | null
  onClose: () => void
  onUpdateVersions: (workContentId: number, versions: ResumeDescriptionVersion[]) => Promise<void> | void
}

/**
 * 简历描述提炼抽屉。
 *
 * 采用 HeroUI 原生 `Drawer`（React Aria 模态覆盖层）：Esc 关闭、点击背板关闭、
 * 焦点陷阱与背景 `aria-hidden` 全部由框架负责，应用侧不再手写滑入动画与按键监听。
 *
 * 相应地，抽屉打开时画布处于惰性状态——切换工作项需先关闭抽屉再点击另一张卡片的
 * 「简历描述提炼」按钮（原「抽屉打开时点另一张卡片直接换绑」的交互已按决策退役）。
 */
export function ResumeDescriptionDrawer({
  isOpen,
  workContent,
  onClose,
  onUpdateVersions
}: ResumeDescriptionDrawerProps) {
  const isDrawerOpen = isOpen && workContent !== null

  return (
    <Drawer.Root
      isOpen={isDrawerOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog aria-label="简历描述提炼抽屉" className="resume-drawer-panel">
            <Drawer.Header className="resume-drawer-header">
              <div className="resume-drawer-title-row">
                <FileText className="resume-drawer-title-icon" size={16} aria-hidden="true" />
                <Drawer.Heading level={2} className="resume-drawer-heading">
                  简历描述提炼
                </Drawer.Heading>
              </div>

              <div className="resume-drawer-target-work">
                <h3 className="drawer-target-title" title={workContent?.title}>
                  {workContent?.title}
                </h3>
              </div>
            </Drawer.Header>

            <Drawer.CloseTrigger aria-label="关闭抽屉" />

            <Drawer.Body className="resume-drawer-body">
              {workContent && (
                <ResumeVersionsFeed
                  workContent={workContent}
                  onUpdateVersions={onUpdateVersions}
                />
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  )
}
