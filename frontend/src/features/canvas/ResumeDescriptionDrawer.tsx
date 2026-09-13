import { useEffect } from 'react'
import { Button, CloseIcon } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
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
 * 简历描述提炼抽屉（非模态伴随侧栏）。
 *
 * 有意不采用 HeroUI `Drawer`：`Drawer` 建立在 React Aria 的模态覆盖层之上（半透明背板、
 * 焦点陷阱、`aria-hidden` 背景）。而本抽屉的产品语义是“伴随画布的侧栏”——打开状态下仍需
 * 点击画布上其它工作项的胶囊按钮即可平滑换绑内容（见 FocusCanvasContainer 集成测试）。
 * 因此这里保留定位骨架（`aside` + framer-motion 滑入），外观全部读取 HeroUI 语义变量。
 */
export function ResumeDescriptionDrawer({
  isOpen,
  workContent,
  onClose,
  onUpdateVersions
}: ResumeDescriptionDrawerProps) {
  // 监听 Escape 按键关闭抽屉
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && workContent && (
        <motion.aside
          key="resume-desc-drawer"
          className="resume-description-drawer"
          aria-label="简历描述提炼抽屉"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <header className="resume-drawer-header">
            <div className="resume-drawer-header-top">
              <div className="resume-drawer-title-row">
                <FileText className="resume-drawer-title-icon" size={16} aria-hidden="true" />
                <h2 className="resume-drawer-heading">简历描述提炼</h2>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="关闭抽屉"
                onPress={onClose}
              >
                <CloseIcon className="resume-drawer-close-icon" />
              </Button>
            </div>

            <div className="resume-drawer-target-work">
              <h3 className="drawer-target-title" title={workContent.title}>
                {workContent.title}
              </h3>
            </div>
          </header>

          <div className="resume-drawer-body">
            <ResumeVersionsFeed
              workContent={workContent}
              onUpdateVersions={onUpdateVersions}
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
