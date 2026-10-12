import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Card, ScrollShadow, Surface } from '@heroui/react'
import { FileText, PanelRight, PanelRightClose } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EASE_OUT_SMOOTH, INSTANT_TRANSITION } from '../motion'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import type { WorkContent } from '../../api'
import type { Session } from '../../session'
import { MilkdownEditor } from '../../components/ui/MilkdownView'
import { parseSupplementaryNotes } from './supplementaryNotes'
import { ResumeHighlightsFeed } from './ResumeHighlightsFeed'
import {
  buildInitialDraft,
  getContentSignature,
  toContentPayload,
  type ContentDraft
} from './WorkContentBlock'
import { useSaveQueue } from '../useSaveQueue'
import type { SaveStatus } from '../useTransientSaveStatus'

export type ZenFocusEditorProps = {
  isOpen: boolean
  workContent: WorkContent | null
  onClose: () => void
  onSaveContent: (draft: ContentDraft, targetId: number) => Promise<void> | void
  /** 简历亮点列表直接读写服务端资源，因此写作区需要携带会话 */
  session: Session
  /** 伴随栏开合由外壳（AppShell 顶栏插槽）持有；未接入外壳时默认展开 */
  isCompanionOpen?: boolean
  /** 就地编辑大标题时把实时标题上抛给顶栏面包屑末级 */
  onTitleChange?: (title: string) => void
  /** 把写作区的保存态上抛给外壳（顶栏 Chip 跟的是「内容有没有落盘」，issue #8） */
  onSaveStatusChange?: (status: SaveStatus) => void
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
  session,
  isCompanionOpen,
  onTitleChange,
  onSaveStatusChange,
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
  // 伴随栏是宽度补间，而 MotionConfig 的 reducedMotion="user" 不管宽度类值，这里显式降级（04m）
  const shouldReduceMotion = usePrefersReducedMotion()

  const draftRef = useRef(draft)
  draftRef.current = draft

  /**
   * 落盘走保存队列（issue #8）：与画布卡片同一份实现——在途时不丢弃后续草稿，
   * 回来补发一笔；防抖与卸载兜底也都在队列里。
   */
  const { request: requestSave, flush: flushSave, resetBaseline, status: queueStatus } =
    useSaveQueue<ContentDraft>({
      getSignature: getContentSignature,
      isSavable: (value) => !!value.title.trim(),
      onStatusChange: onSaveStatusChange,
      persist: (value) => {
        if (!workContent) return
        return onSaveContent(
          toContentPayload(value, workContent.supplementary_notes),
          workContent.id
        )
      }
    })

  // 顶栏保存态跟着队列走（内容有没有落盘），不再由容器的请求生命周期单方面宣告

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

  /**
   * 上一次见到的内容 id：把「换绑到另一条工作内容」从「父级回写同一条」里区分出来。
   * 与画布卡片（issue 13）同一口径：写作期间本地草稿才是唯一真源，
   * 父级保存成功后以新对象回写同一条内容时不重建草稿、也不重置已落盘基准——
   * 否则会把在途窗口里敲进去的字冲掉（那截正是 issue #8 要保住的东西）。
   */
  const lastSeenWorkContentIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!workContent) return
    const isOtherContent = lastSeenWorkContentIdRef.current !== workContent.id
    lastSeenWorkContentIdRef.current = workContent.id
    if (!isOtherContent) return
    const parsed = parseSupplementaryNotes(workContent.supplementary_notes)
    const initial = buildInitialDraft(workContent, parsed.note)
    setDraft(initial)
    resetBaseline(initial)
  }, [workContent, resetBaseline])

  // 输入停顿 800ms 自动保存（防抖与「在途补发」都归保存队列，这里只把最新草稿交出去）
  useEffect(() => {
    if (!isOpen || !workContent) return
    requestSave(draft)
  }, [draft, isOpen, workContent, requestSave])

  // 退出路径统一走这里：先把最新草稿交给队列（不等结果），再关闭（ADR 004 §2.4）
  const handleExit = useCallback(() => {
    flushSave(draftRef.current)
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
              transition={shouldReduceMotion ? INSTANT_TRANSITION : { duration: 0.28, ease: EASE_OUT_SMOOTH }}
            >
              <Card variant="secondary" className="zen-companion-card">
                <Card.Header className="zen-companion-header">
                  <Card.Title className="zen-companion-heading">
                    <FileText className="zen-companion-icon" size={15} aria-hidden="true" />
                    简历亮点提炼
                  </Card.Title>
                </Card.Header>

                <Card.Content className="zen-companion-body">
                  <ScrollShadow className="zen-companion-scroll" orientation="vertical" size={32}>
                    <ResumeHighlightsFeed
                      workContent={workContent}
                      session={session}
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
