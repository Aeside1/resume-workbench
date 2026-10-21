import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api, isReferenceBlocked, type ExperienceGroup, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { useToast } from '../../components/ui/Toast'
import { OutlineNavigator } from './OutlineNavigator'
import { FocusCanvasDocument } from './FocusCanvasDocument'
import { ResumeDescriptionDrawer } from './ResumeDescriptionDrawer'
import { ReferenceBlockedModal } from '../ReferenceBlockedModal'
import { ZenFocusEditor } from './ZenFocusEditor'
import { useTransientSaveStatus, type SaveStatus } from '../useTransientSaveStatus'
import { aggregateSaveStatus } from '../saveStatusAggregate'
import { useFocusMotion } from '../useFocusMotion'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'
import { CONTENT_SETTLE_FROM, CONTENT_SETTLE_TO, CONTENT_SETTLE_TRANSITION, INSTANT_TRANSITION } from '../motion'
import type { ContentDraft } from './WorkContentBlock'

type Props = {
  session: Session
  group: ExperienceGroup
  /** 游客态只读示例内容 */
  readOnly?: boolean
  onSaveStatusChange?: (status: SaveStatus) => void
  onDirtyChange?: (isDirty: boolean) => void
  onUpdateGroup?: (group: ExperienceGroup) => void
  /** 向 AppShell 上报 Zen 展开状态与当前工作项实时标题（顶栏面包屑末级） */
  onZenChange?: (state: ZenTopbarState) => void
  /** 伴随栏开合由 WorkbenchShell 持有，这里只透传给 Zen */
  isCompanionOpen?: boolean
  /** 外壳发起的「返回画布」命令；+1 递增，由 Zen 自己执行（先 flush 再关闭） */
  zenExitSignal?: number
  /** 退出动画开始（外壳据此同步播放页头退场）；直接离开画布的路径不会触发（04m） */
  onZenCloseStart?: () => void
}

/** 顶栏在 Zen 展开时需要的两项语境：是否展开、当前工作项实时标题 */
export type ZenTopbarState = { isOpen: boolean; title: string }

export function FocusCanvasContainer({
  session,
  group,
  readOnly = false,
  onSaveStatusChange,
  onDirtyChange,
  onUpdateGroup,
  onZenChange,
  isCompanionOpen,
  zenExitSignal,
  onZenCloseStart
}: Props) {
  const [currentGroup, setCurrentGroup] = useState<ExperienceGroup>(group)
  const [contents, setContents] = useState<WorkContent[]>([])
  const [editingContentId, setEditingContentId] = useState<number | null>(null)
  const [activeDrawerWorkContentId, setActiveDrawerWorkContentId] = useState<number | null>(null)
  const [zenModeWorkContentId, setZenModeWorkContentId] = useState<number | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeNavId, setActiveNavId] = useState<string>('section-overview')
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  /** 删除被阻断（被简历方案引用）时的模态提示；内联红字在删除路径上看不到，故改弹窗（04j） */
  const [blockedDelete, setBlockedDelete] = useState<{ title: string; message: string } | null>(null)
  const toast = useToast()
  const shouldReduceMotion = usePrefersReducedMotion()
  /** 正在播退场动画（动完才真正提交关闭，04m） */
  const [isZenClosing, setIsZenClosing] = useState(false)
  /** 刚才是「从专注退场回来」，画布这一帧才需要落位动画（从列表进画布由外壳的视图切换承担） */
  const [isCanvasReturning, setIsCanvasReturning] = useState(false)
  // 关闭是「有事要做」的幂等守卫，而 setState 是异步的：动画期间的重复请求（Esc 连按、
  // Esc 后又点返回按钮）会在重渲染前就再进来，因此同时写 ref（与 issue 12 D1 同一手法）。
  const isZenClosingRef = useRef(false)
  /** 专注页（内容区页头 + 写作区共用一份参数）的入场 / 退场（04l / 04m） */
  const zenFocusMotion = useFocusMotion(isZenClosing ? 'exit' : 'enter')

  useEffect(() => {
    setCurrentGroup(group)
  }, [group])

  const containerRef = useRef<HTMLDivElement>(null)
  // Zen 展开时画布被区域内替（卸载 → 重挂），退出后需把视窗恢复到原卡片位置
  const zenReturnScrollRef = useRef(0)
  /** 提交关闭时记下刚关闭的工作项，交给下面的 layout effect 恢复视窗（04m） */
  const pendingZenReturnRef = useRef<number | null>(null)

  /**
   * 顶栏保存态 Chip。归零口径（含单一归零定时器、卸载清理）全部落在
   * `useTransientSaveStatus`，与画布卡片内联徽章共用同一套（issue 13）。
   */
  const publishSaveStatus = useCallback(
    (status: SaveStatus) => onSaveStatusChange?.(status),
    [onSaveStatusChange]
  )
  const applySaveStatus = useTransientSaveStatus(publishSaveStatus)

  /** 顶栏保存态按来源汇总：卡片重挂载 / Zen detached queue 不能互相清掉状态 */
  const saveStatusBySourceRef = useRef(new Map<string, SaveStatus>())
  const publishAggregatedSaveStatus = useCallback(() => {
    // 优先级见 aggregateSaveStatus：任何一处没落盘，顶栏就不许说没事
    applySaveStatus(aggregateSaveStatus([...saveStatusBySourceRef.current.values()]))
  }, [applySaveStatus])
  const reportSaveStatus = useCallback((source: string, status: SaveStatus) => {
    if (status === 'idle') {
      // 来源归零就移出汇总表：否则一个已完成来源的 stale saved 会压住别处的 saving/unsaved
      saveStatusBySourceRef.current.delete(source)
    } else {
      saveStatusBySourceRef.current.set(source, status)
    }
    publishAggregatedSaveStatus()
  }, [publishAggregatedSaveStatus])
  const reportContainerSaveStatus = useCallback((status: SaveStatus) => {
    reportSaveStatus('container', status)
  }, [reportSaveStatus])

  // 卡片被删掉后它的来源记要一并撤掉：否则最后一笔失败留下的 unsaved 会永久挂在顶栏。
  // （Zen 按 'zen' 上报，不在这里，因为退出专注时写作区本就会卸载、队列仍在跑）
  useEffect(() => {
    const alive = new Set(contents.map((item) => `card:${item.id}`))
    let removedAny = false
    for (const source of [...saveStatusBySourceRef.current.keys()]) {
      if (source.startsWith('card:') && !alive.has(source)) {
        saveStatusBySourceRef.current.delete(source)
        removedAny = true
      }
    }
    if (removedAny) publishAggregatedSaveStatus()
  }, [contents, publishAggregatedSaveStatus])

  // 脏判据（issue 12 D1）：只反映「可能有未保存修改」的就地编辑/新建态。
  // Zen 展开本身不算脏——退出 Zen 走的是先 flush 再关的路径；
  // 若把「Zen 展开」也算脏，完全没输入内容时离开也会弹不成立的「放弃修改」确认框。
  useEffect(() => {
    onDirtyChange?.(editingContentId !== null || isCreatingNew)
  }, [editingContentId, isCreatingNew, onDirtyChange])

  useEffect(() => {
    api.workContents(session.token, group.id, showArchived)
      .then(setContents)
      .catch((e) => setError((e as Error).message))
  }, [session.token, group.id, showArchived])

  // IntersectionObserver 滚动高亮大纲
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          // 选择视窗中最早或最大的元素
          const topEntry = visibleEntries[0]
          if (topEntry.target.id) {
            setActiveNavId(topEntry.target.id)
          }
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0.1
      }
    )

    const overviewEl = document.getElementById('section-overview')
    if (overviewEl) observer.observe(overviewEl)

    contents.forEach((item) => {
      const el = document.getElementById(`work-content-${item.id}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [contents])

  const handleNavigate = (targetId: string) => {
    setActiveNavId(targetId)
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleStartEdit = (item: WorkContent) => {
    setIsCreatingNew(false)
    setEditingContentId(item.id)
  }

  const handleCancelEdit = () => {
    setEditingContentId(null)
  }

  const handleSaveContent = async (draft: ContentDraft, targetId: number | null) => {
    if (!draft.title.trim()) return

    // 更新现有内容时，保存态由编辑端（卡片 / Zen 的保存队列）上抛：只有它知道
    // 「在途窗口里又敲进去的那截」是否也落了盘。容器若在这里抢先宣告「已保存」，
    // 顶栏就会和卡片徽章说两句话，而那正是 issue #8 要干掉的那个谎。
    // 新建那条路径没有编辑端承接状态，仍由容器发布。
    const isUpdating = targetId !== null
    if (!isUpdating) reportContainerSaveStatus('saving')

    const payload = {
      ...draft,
      title: draft.title.trim(),
      detailed_record: draft.detailed_record || null,
      technical_materials: draft.technical_materials || null,
      result_data: draft.result_data || null,
      supplementary_notes: draft.supplementary_notes || null
    }

    try {
      if (targetId) {
        // 更新现有卡片
        const saved = await api.updateWorkContent(session.token, targetId, payload)
        setContents((items) => items.map((item) => (item.id === saved.id ? saved : item)))
        // 注意：不在此处重置 editingContentId，保持用户当前的沉浸编辑态；
        // 用户点击【完成编辑】或失焦点击外部时由对应回调收起卡片。
      } else {
        // 新建卡片
        const created = await api.createWorkContent(session.token, group.id, payload)
        setContents((items) => [...items, created])
        setIsCreatingNew(false)
        setActiveNavId(`work-content-${created.id}`)
        reportContainerSaveStatus('saved')
      }
    } catch (e) {
      setError((e as Error).message)
      // 更新路径由编辑端的保存队列发布 unsaved；新建路径没有编辑端承接状态，由容器补发。
      if (!isUpdating) {
        reportContainerSaveStatus('unsaved')
      } else {
        // 让保存队列知道本次落盘失败，避免把 catch 过的错误当成成功。
        throw e
      }
    }
  }

  const handleUpdateOverview = async (payload: Partial<Pick<ExperienceGroup, 'name' | 'type' | 'organization' | 'start_date' | 'end_date' | 'description'>>) => {
    reportContainerSaveStatus('saving')
    try {
      const updated = await api.updateExperienceGroup(session.token, currentGroup.id, payload)
      setCurrentGroup(updated)
      onUpdateGroup?.(updated)
      reportContainerSaveStatus('saved')
    } catch (e) {
      setError((e as Error).message)
      reportContainerSaveStatus('idle')
      throw e
    }
  }

  /** 删除失败的统一反馈：阻断（被引用）与一般失败都弹窗，保证用户一定看得见 */
  const handleDeleteFailure = (failure: unknown) => {
    setBlockedDelete({
      title: isReferenceBlocked(failure) ? '无法彻底删除' : '删除失败',
      message: (failure as Error).message
    })
  }

  const handleDeleteContent = async (item: WorkContent) => {
    try {
      await api.deleteWorkContent(session.token, item.id)
      setContents((items) => items.filter((it) => it.id !== item.id))
      if (editingContentId === item.id) {
        setEditingContentId(null)
      }
      if (activeDrawerWorkContentId === item.id) {
        setActiveDrawerWorkContentId(null)
      }
      toast.success(`已删除工作内容：“${item.title}”`)
    } catch (e) {
      handleDeleteFailure(e)
    }
  }

  const handleArchiveContent = async (item: WorkContent) => {
    try {
      const updated = item.archived
        ? await api.restoreWorkContent(session.token, item.id)
        : await api.archiveWorkContent(session.token, item.id)

      setContents((items) =>
        items.map((it) => (it.id === updated.id ? updated : it))
      )
      if (activeDrawerWorkContentId === item.id && updated.archived && !showArchived) {
        setActiveDrawerWorkContentId(null)
      }
      toast.success(`已${updated.archived ? '归档' : '恢复'}工作内容：“${updated.title}”`, {
        action: {
          label: '撤销',
          onClick: () => handleArchiveContent(updated),
        },
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleOpenDrawer = (item: WorkContent) => {
    setActiveDrawerWorkContentId((prev) => (prev === item.id ? null : item.id))
  }

  const handleCloseDrawer = () => {
    setActiveDrawerWorkContentId(null)
  }

  const handleOpenZenMode = (item: WorkContent) => {
    zenReturnScrollRef.current = window.scrollY
    // 画布被区域内替后原有就地编辑态已不可见，其未决修改也不再有承接者，
    // 因此退出编辑态并把脏标记归零，避免离开画布时弹出不成立的确认框。
    setEditingContentId(null)
    setIsCreatingNew(false)
    setActiveDrawerWorkContentId(null)
    setZenModeWorkContentId(item.id)
    onZenChange?.({ isOpen: true, title: item.title })
  }

  const handleZenTitleChange = (title: string) => {
    onZenChange?.({ isOpen: true, title })
  }

  /**
   * 提交关闭：卸载写作区、页头换回画布页头、解锁视口。
   * 有退场动画时由动画结束回调调它，降级（减少动态效果）时同步调（04m）。
   */
  const commitCloseZenMode = useCallback(() => {
    pendingZenReturnRef.current = zenModeWorkContentId
    isZenClosingRef.current = false
    setZenModeWorkContentId(null)
    setIsZenClosing(false)
    setIsCanvasReturning(true)
    onZenChange?.({ isOpen: false, title: '' })
  }, [zenModeWorkContentId, onZenChange])

  /**
   * 关闭 Zen（由 Zen 自己 flush 完再调）。
   * 有动画时先播 0.16s 退场，动画结束才提交；系统开了「减少动态效果」时既不播也不等，
   * 直接同步提交。
   */
  const handleCloseZenMode = useCallback(() => {
    if (isZenClosingRef.current) return
    if (shouldReduceMotion) {
      commitCloseZenMode()
      return
    }
    isZenClosingRef.current = true
    setIsZenClosing(true)
    onZenCloseStart?.()
  }, [shouldReduceMotion, commitCloseZenMode, onZenCloseStart])

  /**
   * 退出后把视窗恢复回原卡片位置。
   * 画布是「卸载 → 重挂」，仅靠 scrollY 恢复不足以处理布局高度变化，因此恢复滚动位置后
   * 再把目标卡片滚入视野（block: 'nearest' 只在必要时移动）。
   * 放在 layout effect（而不是原来的 50ms 定时器）里：提交那一帧画布还是 opacity: 0，
   * 位置跳变不可见，也不会与退场动画抢时间（04m）。
   */
  useLayoutEffect(() => {
    const lastId = pendingZenReturnRef.current
    if (zenModeWorkContentId !== null || lastId === null) return
    pendingZenReturnRef.current = null
    window.scrollTo({ top: zenReturnScrollRef.current })
    document
      .getElementById(`work-content-${lastId}`)
      // 降级时也不该播滑动动画（与「减少动态效果」口径保持一致）
      ?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  }, [zenModeWorkContentId, shouldReduceMotion])

  const handleReorderContents = async (newContents: WorkContent[]) => {
    setContents(newContents)
    try {
      let workContentIds = newContents.map((item) => item.id)
      if (!showArchived) {
        const allContents = await api.workContents(session.token, currentGroup.id, true)
        let visibleIndex = 0
        workContentIds = allContents.map((item) =>
          item.archived ? item.id : newContents[visibleIndex++].id
        )
      }
      const saved = await api.reorderWorkContents(
        session.token,
        currentGroup.id,
        workContentIds
      )
      setContents(showArchived ? saved : saved.filter((item) => !item.archived))
    } catch (e) {
      setError((e as Error).message)
      setContents(contents)
    }
  }

  const handleReorderContent = async (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= contents.length ||
      targetIndex >= contents.length
    ) {
      return
    }

    const reordered = [...contents]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    await handleReorderContents(reordered)
  }

  const handleMoveContent = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= contents.length) return
    await handleReorderContent(index, targetIndex)
  }

  const zenWorkContent = useMemo(
    () => contents.find((item) => item.id === zenModeWorkContentId) ?? null,
    [contents, zenModeWorkContentId]
  )

  /**
   * 兜底：退场动画期间写作区可能先一步消失（列表刷新后找不到这条工作项），
   * 那样 `onAnimationComplete` 永远不会触发，关闭守卫会永久卡住——下次展开走退场分支、
   * Esc 也失效。这里在写作区已不存在时把守卫与关闭态放掉（04m）。
   */
  useEffect(() => {
    if (zenWorkContent !== null || !isZenClosingRef.current) return
    isZenClosingRef.current = false
    setIsZenClosing(false)
    onZenChange?.({ isOpen: false, title: '' })
  }, [zenWorkContent, onZenChange])

  return (
    <div
      className={`focus-canvas-wrapper${zenWorkContent ? ' focus-canvas-wrapper--zen' : ''}`}
      ref={containerRef}
    >
      {toast.ToastPortal}
      {zenWorkContent ? (
        /* Zen 展开时区域内替画布（ADR 004 §2.1）。入场 / 退场共用一套参数（04l / 04m）；
           退场是「动完才提交」，所以这里接动画结束回调。
           key 必须写：两个分支都是 motion.div，没有 key 时 React 会把同一个 DOM 节点
           复用到新分支上（元素类型相同、位置相同），而 framer 的 initial 只在「首次挂载」
           的视觉元素上应用——于是入场动画会被静默跳过（04m 真实浏览器实测踩到过）。 */
        <motion.div
          key="zen-region"
          className="zen-region-enter"
          {...zenFocusMotion}
          onAnimationComplete={() => {
            if (isZenClosing) commitCloseZenMode()
          }}
        >
          <ZenFocusEditor
            isOpen={true}
            workContent={zenWorkContent}
            onClose={handleCloseZenMode}
            onSaveContent={handleSaveContent}
            onSaveStatusChange={(status) => reportSaveStatus('zen', status)}
            session={session}
            isCompanionOpen={isCompanionOpen}
            onTitleChange={handleZenTitleChange}
            exitSignal={zenExitSignal}
          />
        </motion.div>
      ) : (
        /* 画布落位（04m）：**只**在「刚从专注退场回来」这一帧播，避免与外壳的视图切换动画叠加 */
        <motion.div
          key="canvas-swap"
          className="focus-canvas-swap"
          initial={shouldReduceMotion || !isCanvasReturning ? false : CONTENT_SETTLE_FROM}
          animate={CONTENT_SETTLE_TO}
          transition={shouldReduceMotion ? INSTANT_TRANSITION : CONTENT_SETTLE_TRANSITION}
          onAnimationComplete={() => setIsCanvasReturning(false)}
        >
          <div className="focus-canvas-layout">
          <main className="focus-canvas-main-col">
            {error && <p className="error" role="alert">{error}</p>}

            <FocusCanvasDocument
              group={currentGroup}
              contents={contents}
              readOnly={readOnly}
              editingId={editingContentId}
              isCreatingNew={isCreatingNew}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveContent={handleSaveContent}
              onSaveStatusChange={(workContentId, status) =>
                reportSaveStatus(`card:${workContentId}`, status)
              }
              onMoveContent={handleMoveContent}
              onReorderContent={handleReorderContent}
              onReorderContents={handleReorderContents}
              onDeleteContent={handleDeleteContent}
              onArchiveContent={handleArchiveContent}
              activeDrawerWorkContentId={activeDrawerWorkContentId}
              onOpenDrawer={handleOpenDrawer}
              onOpenZenMode={handleOpenZenMode}
              onStartCreateNew={() => {
                setEditingContentId(null)
                setIsCreatingNew(true)
              }}
              onCancelCreateNew={() => setIsCreatingNew(false)}
              onUpdateGroup={handleUpdateOverview}
            />
          </main>

          <aside className="focus-canvas-side-col">
            <OutlineNavigator
              group={currentGroup}
              contents={contents}
              activeId={activeNavId}
              onNavigate={handleNavigate}
              onAddNew={
                readOnly
                  ? undefined
                  : () => {
                      if (editingContentId !== null) {
                        const confirmed = window.confirm('当前正在编辑工作内容，确定放弃未保存修改并新建吗？')
                        if (!confirmed) return
                      }
                      setEditingContentId(null)
                      setIsCreatingNew(true)
                      setTimeout(() => {
                        const el = document.querySelector('.creating-new-card')
                        el?.scrollIntoView({ behavior: 'smooth' })
                      }, 50)
                    }
              }
            />
          </aside>
        </div>
        </motion.div>
      )}

      <ResumeDescriptionDrawer
        isOpen={activeDrawerWorkContentId !== null}
        workContent={contents.find((item) => item.id === activeDrawerWorkContentId) ?? null}
        session={session}
        readOnly={readOnly}
        onClose={handleCloseDrawer}
      />

      <ReferenceBlockedModal
        isOpen={blockedDelete !== null}
        title={blockedDelete?.title}
        message={blockedDelete?.message ?? ''}
        onClose={() => setBlockedDelete(null)}
      />
    </div>
  )
}
