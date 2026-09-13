import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Button } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExperienceGroup, WorkContent } from '../../api'
import { MilkdownEditor } from '../../components/ui/MilkdownView'
import {
  parseSupplementaryNotes,
  serializeSupplementaryNotes,
  type ResumeDescriptionVersion
} from './supplementaryNotes'
import { ResumeVersionsFeed } from './ResumeVersionsFeed'
import {
  buildInitialDraft,
  type ContentDraft
} from './WorkContentBlock'

export type ZenFocusEditorProps = {
  isOpen: boolean
  group: ExperienceGroup
  workContent: WorkContent | null
  onClose: () => void
  onSaveContent: (draft: ContentDraft, targetId: number) => Promise<void> | void
  onUpdateVersions: (workContentId: number, versions: ResumeDescriptionVersion[]) => Promise<void> | void
}

export function ZenFocusEditor({
  isOpen,
  group,
  workContent,
  onClose,
  onSaveContent,
  onUpdateVersions
}: ZenFocusEditorProps) {
  const parsedData = useMemo(
    () => (workContent ? parseSupplementaryNotes(workContent.supplementary_notes) : null),
    [workContent?.supplementary_notes]
  )

  const [draft, setDraft] = useState<ContentDraft>(() =>
    workContent ? buildInitialDraft(workContent, parsedData?.note) : {
      title: '',
      detailed_record: '',
      technical_materials: '',
      result_data: '',
      supplementary_notes: ''
    }
  )

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isCompanionOpen, setIsCompanionOpen] = useState(true)

  const draftRef = useRef(draft)
  draftRef.current = draft

  const getSignature = (d: ContentDraft) => `${d.title.trim()}|||${d.detailed_record}`
  const lastSavedSignatureRef = useRef<string>(
    workContent ? getSignature(buildInitialDraft(workContent, parsedData?.note)) : ''
  )
  const isSavingRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTitleChange = (val: string) => {
    setDraft((prev) => {
      const updated = { ...prev, title: val }
      draftRef.current = updated
      return updated
    })
  }

  const handleRecordChange = (val: string) => {
    setDraft((prev) => {
      const updated = { ...prev, detailed_record: val }
      draftRef.current = updated
      return updated
    })
  }
  useEffect(() => {
    if (!workContent) return
    const parsed = parseSupplementaryNotes(workContent.supplementary_notes)
    const initial = buildInitialDraft(workContent, parsed.note)
    setDraft(initial)
    lastSavedSignatureRef.current = getSignature(initial)
    setSaveStatus('idle')
  }, [workContent])

  const performSave = useCallback(async (currentDraft: ContentDraft) => {
    if (!workContent || !currentDraft.title.trim()) return
    const signature = getSignature(currentDraft)
    if (signature === lastSavedSignatureRef.current || isSavingRef.current) return

    isSavingRef.current = true
    lastSavedSignatureRef.current = signature
    setSaveStatus('saving')

    const currentNotes = parseSupplementaryNotes(workContent.supplementary_notes)
    const serializedNotes = serializeSupplementaryNotes(
      currentDraft.supplementary_notes ?? '',
      currentNotes.versions
    )

    try {
      await onSaveContent({
        title: currentDraft.title.trim(),
        detailed_record: currentDraft.detailed_record,
        technical_materials: '',
        result_data: '',
        supplementary_notes: serializedNotes
      }, workContent.id)
      setSaveStatus('saved')
    } catch {
      lastSavedSignatureRef.current = ''
      setSaveStatus('idle')
    } finally {
      isSavingRef.current = false
    }
  }, [workContent, onSaveContent])

  const flushSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    performSave(draftRef.current)
  }, [performSave])

  // 输入停顿 800ms 自动保存
  useEffect(() => {
    if (!isOpen || !workContent) return
    if (!draft.title.trim()) return
    const signature = getSignature(draft)
    if (signature === lastSavedSignatureRef.current) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      performSave(draft)
    }, 800)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [draft, isOpen, workContent, performSave])

  // 监听物理 Escape 键退出专注模式
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const hasActiveModal = !!document.querySelector(
          '[role="dialog"]:not(.zen-focus-overlay)'
        )
        if (hasActiveModal) return

        flushSave()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, flushSave])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleExit = () => {
    flushSave()
    onClose()
  }

  if (!isOpen || !workContent) return null

  const breadcrumbOrg = group.organization ? `${group.organization} · ` : ''
  const breadcrumbGroup = `${breadcrumbOrg}${group.name}`

  return (
    <div
      className="zen-focus-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`全屏专注工作台: ${workContent.title}`}
    >
      {/* 顶部极简 Topbar */}
      <header className="zen-topbar">
        <div className="zen-topbar-left">
          <Button
            size="sm"
            variant="ghost"
            className="zen-exit-btn"
            onPress={handleExit}
            aria-label="退出全屏"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="zen-exit-text">退出全屏</span>
            <kbd className="zen-shortcut-kbd">Esc</kbd>
          </Button>

          <nav className="zen-breadcrumbs" aria-label="层级面包屑导航">
            <span className="zen-breadcrumb-group" title={breadcrumbGroup}>
              {breadcrumbGroup}
            </span>
            <span className="zen-breadcrumb-separator" aria-hidden="true">/</span>
            <span className="zen-breadcrumb-item-title" title={draft.title || workContent.title}>
              {draft.title || workContent.title}
            </span>
          </nav>
        </div>

        <div className="zen-topbar-right">
          <div className="zen-save-indicator" aria-live="polite">
            {saveStatus === 'saving' && (
              <span className="zen-save-badge saving" role="status">
                <svg className="zen-spinner-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>保存中...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="zen-save-badge saved" role="status">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>已自动保存</span>
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant={isCompanionOpen ? 'secondary' : 'ghost'}
            className="zen-action-btn zen-toggle-companion-btn"
            onPress={() => setIsCompanionOpen((prev) => !prev)}
            aria-label={isCompanionOpen ? '收起伴随栏' : '展开伴随栏'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span>{isCompanionOpen ? '收起伴随栏' : '展开伴随栏'}</span>
          </Button>
        </div>
      </header>

      {/* 左右双栏巅峰对照工作区 */}
      <div className="zen-workspace">
        {/* 左侧主写作区 (70% 或 100%) */}
        <main className={`zen-main-writer ${isCompanionOpen ? 'zen-main-writer--with-companion' : 'zen-main-writer--full'}`}>
          <div className="zen-writer-scroll">
            <div className="zen-writer-canvas">
              {/* 大标题输入 */}
              <div className="zen-title-container">
                <input
                  id={`zen-title-${workContent.id}`}
                  type="text"
                  className="zen-title-input"
                  value={draft.title}
                  placeholder="输入工作项大标题..."
                  aria-label="工作项大标题"
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              {/* 宽阔 Markdown 编辑打字画布 */}
              <div className="zen-editor-wrapper">
                <label
                  id={`zen-editor-${workContent.id}-label`}
                  htmlFor={`zen-editor-${workContent.id}`}
                  className="sr-only"
                >
                  草稿正文
                </label>
                <MilkdownEditor
                  id={`zen-editor-${workContent.id}`}
                  cacheKey={`zen-wc-${workContent.id}-record`}
                  value={draft.detailed_record}
                  placeholder="在此自由书写项目背景、架构设计、排障推演、核心代码块或量化结果（支持完整 Markdown 排版）..."
                  rows={20}
                  onChange={handleRecordChange}
                />
              </div>
            </div>
          </div>
        </main>

        {/* 右侧伴随提炼栏 (带顺滑收起/展开过渡动画) */}
        <AnimatePresence initial={false}>
          {isCompanionOpen && (
            <motion.aside
              key="zen-companion-sidebar"
              className="zen-companion-sidebar"
              aria-label="伴随提炼栏"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="zen-companion-inner">
                <header className="zen-companion-header">
                  <div className="zen-companion-header-title">
                    <svg className="zen-companion-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h3 className="zen-companion-heading">简历描述提炼</h3>
                  </div>
                </header>

                <div className="zen-companion-body">
                  <ResumeVersionsFeed
                    workContent={workContent}
                    onUpdateVersions={onUpdateVersions}
                    className="zen-feed"
                  />
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
