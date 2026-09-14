import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Card, ScrollShadow, Surface } from '@heroui/react'
import { FileText, PanelRight, PanelRightClose } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkContent } from '../../api'
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
  workContent: WorkContent | null
  onClose: () => void
  onSaveContent: (draft: ContentDraft, targetId: number) => Promise<void> | void
  onUpdateVersions: (workContentId: number, versions: ResumeDescriptionVersion[]) => Promise<void> | void
  /** 伴随栏开合由外壳（AppShell 顶栏插槽）持有；未接入外壳时默认展开 */
  isCompanionOpen?: boolean
  /** 就地编辑大标题时把实时标题上抛给顶栏面包屑末级 */
  onTitleChange?: (title: string) => void
  /** 外壳（顶栏返回按钮 / 面包屑中间级）发起的关闭命令，+1 递增 */
  exitSignal?: number
}

/**
 * Zen 专注写作区（ADR 004：非模态区域展开）。
 *
 * 这里只负责「写作区本身」：区域骨架、大标题、正文编辑器、伴随栏。
 * 退出入口、保存态 Chip、伴随栏开关全在 AppShell 顶栏（由 onClose /
 * onTitleChange / isCompanionOpen / exitSignal 四处接线），因此本组件不再
 * 自足——单独渲染时没有退出按钮、没有保存反馈、没有伴随栏开关。
 */
export function ZenFocusEditor({
  isOpen,
  workContent,
  onClose,
  onSaveContent,
  onUpdateVersions,
  isCompanionOpen,
  onTitleChange,
  exitSignal
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

  // 保存态 Chip 归 AppShell 顶栏（走 onSaveStatusChange 链路），这里不再维护本地保存状态。
  const companionOpen = isCompanionOpen ?? true

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
    onTitleChange?.(val)
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
  }, [workContent])

  const performSave = useCallback(async (currentDraft: ContentDraft) => {
    if (!workContent || !currentDraft.title.trim()) return
    const signature = getSignature(currentDraft)
    if (signature === lastSavedSignatureRef.current || isSavingRef.current) return

    isSavingRef.current = true
    lastSavedSignatureRef.current = signature

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
    } catch {
      lastSavedSignatureRef.current = ''
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

  // 退出路径统一走这里：先 flush 保存，再关闭（ADR 004 §2.4）
  const handleExit = useCallback(() => {
    flushSave()
    onClose()
  }, [flushSave, onClose])

  // 监听物理 Escape 键退出专注模式
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 区域形态下 Zen 内已无模态层，此守卫为防御性代码：若将来有自绘弹窗
        // 落在区域内，Esc 应交给那一层处理。
        const hasActiveModal = !!document.querySelector('[role="dialog"]')
        if (hasActiveModal) return

        handleExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleExit])

  // 外壳发起的「返回画布」命令：与 Esc 走同一条退出路径（先 flush 再关闭）
  const handledExitSignalRef = useRef(exitSignal ?? 0)
  useEffect(() => {
    if (exitSignal === undefined || exitSignal === handledExitSignalRef.current) return
    handledExitSignalRef.current = exitSignal
    handleExit()
  }, [exitSignal, handleExit])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  if (!isOpen || !workContent) return null

  return (
    <Surface
      className="zen-focus-region"
      role="region"
      aria-label={`专注写作区: ${draft.title || workContent.title}`}
    >
      {/* 左右双栏巅峰对照工作区 */}
      <div className="zen-workspace">
        {/* 左侧主写作区（伴随栏收起时独占整宽） */}
        <ScrollShadow className="zen-main-writer" orientation="vertical" size={48}>
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
        </ScrollShadow>

        {/* 右侧伴随提炼栏（带顺滑收起/展开过渡动画） */}
        <AnimatePresence initial={false}>
          {companionOpen && (
            <motion.aside
              key="zen-companion-sidebar"
              className="zen-companion-sidebar"
              aria-label="伴随提炼栏"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card variant="secondary" className="zen-companion-card">
                <Card.Header className="zen-companion-header">
                  <Card.Title className="zen-companion-heading">
                    <FileText className="zen-companion-icon" size={15} aria-hidden="true" />
                    简历描述提炼
                  </Card.Title>
                </Card.Header>

                <Card.Content className="zen-companion-body">
                  <ScrollShadow className="zen-companion-scroll" orientation="vertical" size={32}>
                    <ResumeVersionsFeed
                      workContent={workContent}
                      onUpdateVersions={onUpdateVersions}
                    />
                  </ScrollShadow>
                </Card.Content>
              </Card>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </Surface>
  )
}
