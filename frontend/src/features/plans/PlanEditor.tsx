import { useCallback, useEffect, useState } from 'react'
import { Button, Chip } from '@heroui/react'
import { Download, Eye, FilePlus2, Pencil, Plus } from 'lucide-react'
import {
  api,
  type PlanBlock,
  type PlanCandidates,
  type PlanDocument,
  type PlanItem,
  type ResumePlan,
  type ResumePlanDetail
} from '../../api'
import type { Session } from '../../session'
import { useToast } from '../../components/ui/Toast'
import { EmptyStateCard } from '../hub/EmptyStateCard'
import type { SaveStatus } from '../useTransientSaveStatus'
import { AddExperienceGroupDialog } from './AddExperienceGroupDialog'
import { HighlightPicker } from './HighlightPicker'
import { PlanBlockCard } from './PlanBlockCard'
import { PlanDocumentView } from './PlanDocumentView'

export type PlanEditorProps = {
  session: Session
  plan: ResumePlan
  onSaveStatusChange?: (status: SaveStatus) => void
}

/**
 * 简历编排主工作面（ADR 005 §2.5）。
 *
 * 中间一栏就是主工作面：先添加经历分组作为经历块，再在块内挑简历亮点、排顺序；
 * 板块由经历分组的类型自动决定，不给手改。方案只保存引用，文稿是读时装配出来的
 * ——「预览」开关切到纯阅读态，看到的就是「下载」拿到的那份 Markdown。
 */
export function PlanEditor({ session, plan, onSaveStatusChange }: PlanEditorProps) {
  const [detail, setDetail] = useState<ResumePlanDetail | null>(null)
  const [document, setDocument] = useState<PlanDocument | null>(null)
  const [candidates, setCandidates] = useState<PlanCandidates | null>(null)
  const [pickerBlock, setPickerBlock] = useState<PlanBlock | null>(null)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    const [nextDetail, nextDocument] = await Promise.all([
      api.resumePlan(session.token, plan.id),
      api.planDocument(session.token, plan.id)
    ])
    setDetail(nextDetail)
    setDocument(nextDocument)
  }, [session.token, plan.id])

  const loadCandidates = useCallback(async () => {
    const next = await api.planCandidates(session.token, plan.id)
    setCandidates(next)
  }, [session.token, plan.id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    load()
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const runMutation = useCallback(
    async (action: () => Promise<unknown>) => {
      setError('')
      onSaveStatusChange?.('saving')
      try {
        await action()
        await load()
        if (candidates !== null) await loadCandidates()
        onSaveStatusChange?.('saved')
      } catch (e) {
        setError((e as Error).message)
        onSaveStatusChange?.('idle')
      }
    },
    [candidates, load, loadCandidates, onSaveStatusChange]
  )

  const blocks = detail?.experience_groups ?? []
  const internshipBlocks = blocks.filter((block) => block.type === 'internship')
  const projectBlocks = blocks.filter((block) => block.type === 'project')
  /** 挑选弹窗始终读最新一块（不能用打开弹窗时的快照，否则勾选后按钮不会翻成「移出简历」） */
  const activePickerBlock = pickerBlock
    ? blocks.find((block) => block.id === pickerBlock.id) ?? null
    : null

  const handleAddGroup = async (experienceGroupId: number) => {
    await runMutation(() => api.addPlanBlock(session.token, plan.id, experienceGroupId))
  }

  const handleOpenAddGroup = async () => {
    try {
      await loadCandidates()
      setIsAddGroupOpen(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleOpenPicker = async (block: PlanBlock) => {
    try {
      await loadCandidates()
      setPickerBlock(block)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleToggleHighlight = async (workContentId: number, highlightId: number, existingItemId: number | null) => {
    if (!activePickerBlock) return
    await runMutation(() =>
      existingItemId !== null
        ? api.removePlanItem(session.token, plan.id, existingItemId)
        : api.addPlanItem(session.token, plan.id, {
            block_id: activePickerBlock.id,
            work_content_id: workContentId,
            resume_description_id: highlightId
          })
    )
  }

  const handleBlockOrder = async (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return
    const reordered = [...blocks]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    await runMutation(() => api.reorderPlanBlocks(session.token, plan.id, reordered.map((block) => block.id)))
  }

  const handleMoveBlock = async (block: PlanBlock, direction: -1 | 1) => {
    const index = blocks.findIndex((candidate) => candidate.id === block.id)
    await handleBlockOrder(index, index + direction)
  }

  const handleMoveItem = async (block: PlanBlock, index: number, direction: -1 | 1) => {
    await handleReorderItem(block, index, index + direction)
  }

  const handleReorderItem = async (block: PlanBlock, sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || targetIndex < 0 || targetIndex >= block.items.length) return
    const reordered = [...block.items]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    await runMutation(() => api.reorderPlanItems(session.token, plan.id, block.id, reordered.map((item) => item.id)))
  }

  const handleRemoveBlock = async (block: PlanBlock) => {
    await runMutation(() => api.removePlanBlock(session.token, plan.id, block.id))
    toast.success(`已移除经历块“${block.name}”，经历资产不受影响。`)
  }

  const handleRemoveItem = async (_block: PlanBlock, item: PlanItem) => {
    await runMutation(() => api.removePlanItem(session.token, plan.id, item.id))
  }

  const handleToggleTitles = async (block: PlanBlock, value: boolean) => {
    await runMutation(() => api.updatePlanBlock(session.token, plan.id, block.id, { show_work_content_titles: value }))
  }

  const handleDownload = () => {
    if (!document) return
    const blob = new Blob([document.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `${detail?.name || '简历文稿'}.md`
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('已下载简历文稿（Markdown）')
  }

  const renderBlockSection = (title: string, sectionBlocks: PlanBlock[]) => (
    <section className="plan-editor-section" aria-label={title} key={title}>
      <h3 className="plan-editor-section-title">{title}</h3>
      {sectionBlocks.length === 0 ? (
        <p className="plan-editor-section-empty">还没有内容。添加这段经历并挑亮点后会出现在这里。</p>
      ) : (
        sectionBlocks.map((block) => (
          <PlanBlockCard
            key={block.id}
            block={block}
            index={blocks.findIndex((candidate) => candidate.id === block.id)}
            total={blocks.length}
            onAddHighlight={handleOpenPicker}
            onRemoveBlock={handleRemoveBlock}
            onMoveBlock={handleMoveBlock}
            onToggleTitles={handleToggleTitles}
            onRemoveItem={handleRemoveItem}
            onMoveItem={handleMoveItem}
            onReorderItem={handleReorderItem}
          />
        ))
      )}
    </section>
  )

  return (
    <div className="plan-editor">
      <div className="plan-editor-header">
        <div className="plan-editor-title">
          <h2 className="plan-editor-name">{detail?.name ?? plan.name}</h2>
          <p className="plan-editor-purpose">{detail?.purpose || '未填写简历用途'}</p>
        </div>

        <div className="plan-editor-actions">
          <Chip size="sm">
            <Chip.Label>{blocks.length} 段经历</Chip.Label>
          </Chip>
          <Button
            size="sm"
            variant={isPreview ? 'secondary' : 'ghost'}
            aria-pressed={isPreview}
            onPress={() => setIsPreview((current) => !current)}
          >
            <Eye size={14} aria-hidden="true" />
            {isPreview ? '返回编排' : '预览'}
          </Button>
          <Button size="sm" variant="ghost" onPress={handleDownload}>
            <Download size={14} aria-hidden="true" />
            下载简历文稿
          </Button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {toast.ToastPortal}

      {isPreview ? (
        <PlanDocumentView markdown={document?.markdown ?? ''} />
      ) : (
        <div className="plan-editor-body">
          <div className="plan-editor-toolbar">
            <Button variant="primary" size="sm" onPress={() => void handleOpenAddGroup()}>
              <Plus size={15} aria-hidden="true" />
              添加经历分组
            </Button>
            <span className="plan-editor-hint">板块由经历分组的类型自动决定；已归档的内容不会再出现在候选里。</span>
          </div>

          {!loading && blocks.length === 0 ? (
            <EmptyStateCard
              title="先添加一段经历"
              description="这份简历还是空的。点「添加经历分组」把一段实习或项目经历纳入方案，再在块内挑简历亮点。"
              actionLabel="添加经历分组"
              onAction={() => void handleOpenAddGroup()}
              icon={<FilePlus2 size={32} aria-hidden="true" />}
            />
          ) : (
            <>
              {renderBlockSection('实习经历', internshipBlocks)}
              {renderBlockSection('项目经历', projectBlocks)}
            </>
          )}
        </div>
      )}

      <AddExperienceGroupDialog
        isOpen={isAddGroupOpen}
        candidates={candidates}
        onClose={() => setIsAddGroupOpen(false)}
        onPick={handleAddGroup}
      />

      <HighlightPicker
        isOpen={pickerBlock !== null}
        block={activePickerBlock}
        candidates={candidates}
        items={activePickerBlock?.items ?? []}
        onClose={() => setPickerBlock(null)}
        onToggle={handleToggleHighlight}
      />
    </div>
  )
}
