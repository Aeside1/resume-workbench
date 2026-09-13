import { useEffect } from 'react'
import { Button, CloseIcon } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkContent } from '../../api'
import { ResumeVersionsFeed } from './ResumeVersionsFeed'
import type { ResumeDescriptionVersion } from './supplementaryNotes'

export type ResumeDescriptionDrawerProps = {
  isOpen: boolean
  workContent: WorkContent | null
  onClose: () => void
  onUpdateVersions: (workContentId: number, versions: ResumeDescriptionVersion[]) => Promise<void> | void
}

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
                <svg className="resume-drawer-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h2 className="resume-drawer-heading">简历描述提炼</h2>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="resume-drawer-close-btn"
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
