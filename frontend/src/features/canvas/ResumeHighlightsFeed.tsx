import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Input } from '@heroui/react'
import { Check, Copy, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, isReferenceBlocked, type ResumeHighlight, type WorkContent } from '../../api'
import type { Session } from '../../session'
import { toast } from '../../components/ui/Toast'
import { MilkdownView, MilkdownEditor, clearMilkdownEditorCache } from '../../components/ui/MilkdownView'
import { ReferenceBlockedModal } from '../ReferenceBlockedModal'

export type ResumeHighlightsFeedProps = {
  workContent: WorkContent | null
  session: Session
  className?: string
}

type HighlightPatch = Partial<Pick<ResumeHighlight, 'label' | 'content'>>

/**
 * 简历亮点列表（术语见 CONTEXT.md）。
 *
 * 每条亮点是服务端独立记录（`resume_descriptions`），这里直接读写该资源：
 * 编辑按条防抖 PATCH，不再把整份列表序列化进 `work_contents.supplementary_notes`。
 * 旧 JSON 里的历史版本已由 migrate_003 搬运，这里不再读取它们。
 */
export function ResumeHighlightsFeed({
  workContent,
  session,
  className = ''
}: ResumeHighlightsFeedProps) {
  const [highlights, setHighlights] = useState<ResumeHighlight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  /** 删除被阻断（被简历方案引用）时的模态提示（04j） */
  const [blockedDelete, setBlockedDelete] = useState<{ title: string; message: string } | null>(null)
  const token = session.token
  const workContentId = workContent?.id ?? null

  /** 待写入的按条改动：同一亮点的多次输入合并成一次 PATCH */
  const pendingRef = useRef<Map<number, HighlightPatch>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPending = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const entries = Array.from(pendingRef.current.entries())
    pendingRef.current.clear()
    for (const [highlightId, patch] of entries) {
      try {
        const saved = await api.updateResumeHighlight(token, highlightId, patch)
        setHighlights((items) => items.map((item) => (item.id === saved.id ? saved : item)))
      } catch (e) {
        setError((e as Error).message)
      }
    }
  }, [token])

  const scheduleSave = useCallback(
    (highlightId: number, patch: HighlightPatch) => {
      pendingRef.current.set(highlightId, { ...pendingRef.current.get(highlightId), ...patch })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flushPending()
      }, 500)
    },
    [flushPending]
  )

  useEffect(() => {
    if (workContentId === null) {
      setHighlights([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError('')
    setEditingId(null)
    api
      .resumeHighlights(token, workContentId)
      .then((items) => {
        if (!cancelled) setHighlights(items)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, workContentId])

  // 关闭抽屉 / 切换工作内容 / 卸载前，把在途编辑落库
  useEffect(() => {
    return () => {
      void flushPending()
    }
  }, [flushPending])

  const handleUpdateLabel = (highlightId: number, label: string) => {
    setHighlights((items) => items.map((item) => (item.id === highlightId ? { ...item, label } : item)))
    scheduleSave(highlightId, { label })
  }

  const handleUpdateContent = (highlightId: number, content: string) => {
    setHighlights((items) => items.map((item) => (item.id === highlightId ? { ...item, content } : item)))
    scheduleSave(highlightId, { content })
  }

  const handleFinishEditing = () => {
    void flushPending()
    setEditingId(null)
  }

  const handleAddHighlight = async () => {
    if (!workContent) return
    await flushPending()
    try {
      const created = await api.createResumeHighlight(token, workContent.id)
      setHighlights((items) => [...items, created])
      setEditingId(created.id)
      toast.success('已新建简历亮点')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleDuplicateHighlight = async (highlight: ResumeHighlight) => {
    await flushPending()
    try {
      const clone = await api.copyResumeHighlight(token, highlight.id)
      setHighlights((items) => [...items, clone])
      toast.success(`已复制出“${clone.label}”`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleDeleteHighlight = async (highlight: ResumeHighlight) => {
    const { label, content } = highlight
    clearMilkdownEditorCache(`highlight-${highlight.id}`)
    pendingRef.current.delete(highlight.id)
    if (editingId === highlight.id) setEditingId(null)
    try {
      await api.deleteResumeHighlight(token, highlight.id)
      setHighlights((items) => items.filter((item) => item.id !== highlight.id))
      toast.success(`已删除简历亮点“${label}”`, {
        action: {
          label: '撤销',
          onClick: () => {
            void (async () => {
              try {
                // 撤销等价于按原内容新建一条；删除无法还原原顺序与 id
                const restored = await api.createResumeHighlight(token, highlight.work_content_id, { label, content })
                setHighlights((items) => [...items, restored])
              } catch (e) {
                setError((e as Error).message)
              }
            })()
          }
        }
      })
    } catch (e) {
      // 亮点被方案引用而删不掉：弹窗告知（内联红字在抽屉里可能被滚出视野）
      setBlockedDelete({
        title: isReferenceBlocked(e) ? '无法彻底删除' : '删除失败',
        message: (e as Error).message
      })
    }
  }

  if (!workContent) return null

  return (
    <div className={`resume-versions-feed ${className}`}>
      <div className="resume-versions-scroll-body">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="resume-drawer-loading">正在载入简历亮点…</p>
        ) : highlights.length === 0 ? (
          <div className="resume-drawer-empty">
            <div className="empty-icon-box" aria-hidden="true">
              <FileText size={28} strokeWidth={1.5} />
            </div>
            <p className="empty-heading">暂无简历亮点</p>
            <p className="empty-subtext">为这条工作内容沉淀几种可直接放进简历的写法，之后在简历方案里按岗位组合。</p>
          </div>
        ) : (
          <div className="resume-versions-list" role="feed" aria-label="简历亮点列表">
            {highlights.map((highlight) => {
              const isEditing = editingId === highlight.id
              return (
                <Card
                  key={highlight.id}
                  role="article"
                  className={`resume-version-card ${isEditing ? 'resume-version-card--editing' : 'resume-version-card--readonly'}`}
                  aria-label={`简历亮点: ${highlight.label}`}
                >
                  <Card.Header className="resume-version-card-header">
                    {isEditing ? (
                      <Input
                        id={`highlight-label-${highlight.id}`}
                        type="text"
                        className="version-label-input"
                        value={highlight.label}
                        autoFocus
                        aria-label={`${highlight.label || '简历亮点'} 名称`}
                        placeholder="亮点名称，例如：技术深度版"
                        onChange={(e) => handleUpdateLabel(highlight.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleFinishEditing()
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="version-label-display"
                        onClick={() => setEditingId(highlight.id)}
                        title="点击编辑亮点名称"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setEditingId(highlight.id)
                          }
                        }}
                      >
                        <Card.Title className="version-label-text">{highlight.label || '未命名亮点'}</Card.Title>
                        <Pencil className="edit-pencil-icon" size={12} aria-hidden="true" />
                      </div>
                    )}

                    <div className="version-actions">
                      {isEditing ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="version-action-btn"
                          aria-label={`完成编辑 ${highlight.label}`}
                          onPress={handleFinishEditing}
                        >
                          <Check size={12} aria-hidden="true" />
                          <span>完成</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="version-action-btn"
                          aria-label={`编辑 ${highlight.label}`}
                          onPress={() => setEditingId(highlight.id)}
                        >
                          <Pencil size={12} aria-hidden="true" />
                          <span>编辑</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="version-action-btn"
                        aria-label={`复制 ${highlight.label}`}
                        onPress={() => void handleDuplicateHighlight(highlight)}
                      >
                        <Copy size={13} aria-hidden="true" />
                        <span>复制</span>
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="version-action-btn"
                        aria-label={`删除 ${highlight.label}`}
                        onPress={() => void handleDeleteHighlight(highlight)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    </div>
                  </Card.Header>

                  {isEditing ? (
                    <Card.Content className="resume-version-card-content">
                      <MilkdownEditor
                        id={`highlight-${highlight.id}`}
                        cacheKey={`highlight-${highlight.id}`}
                        value={highlight.content}
                        rows={4}
                        placeholder="编写这条写法的完整正文（支持 Markdown，包含行动动词、量化结果与核心技术细节）..."
                        onChange={(val) => handleUpdateContent(highlight.id, val)}
                      />
                    </Card.Content>
                  ) : (
                    <Card.Content
                      className="version-content-preview-container"
                      onClick={() => setEditingId(highlight.id)}
                      title="点击编辑简历亮点正文"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setEditingId(highlight.id)
                        }
                      }}
                    >
                      <MilkdownView
                        content={highlight.content}
                        placeholder="暂无描述内容，点击开始编写（支持 Markdown）..."
                      />
                    </Card.Content>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <footer className="resume-versions-footer">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onPress={() => void handleAddHighlight()}
          aria-label="新建简历亮点"
        >
          <Plus className="add-version-icon" size={16} aria-hidden="true" />
          <span>新建简历亮点</span>
        </Button>
      </footer>

      <ReferenceBlockedModal
        isOpen={blockedDelete !== null}
        title={blockedDelete?.title}
        message={blockedDelete?.message ?? ''}
        onClose={() => setBlockedDelete(null)}
      />
    </div>
  )
}
