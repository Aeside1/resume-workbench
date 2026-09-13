import { useEffect, useRef, useState, useMemo } from 'react'
import { Button, CloseIcon, IconPlus } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkContent } from '../../api'
import { toast } from '../../components/ui/Toast'
import { MilkdownView, MilkdownEditor, clearMilkdownEditorCache } from '../../components/ui/MilkdownView'
import {
  parseSupplementaryNotes,
  type ResumeDescriptionVersion
} from './supplementaryNotes'

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
  const parsedData = useMemo(
    () => (workContent ? parseSupplementaryNotes(workContent.supplementary_notes) : null),
    [workContent?.supplementary_notes]
  )

  const [versions, setVersions] = useState<ResumeDescriptionVersion[]>(() => parsedData?.versions ?? [])
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionsRef = useRef(versions)
  versionsRef.current = versions

  const previousWorkContentIdRef = useRef<number | null>(workContent?.id ?? null)

  // 当外部绑定的 workContent 切换或其内容变更时同步本地版本状态，并刷新上一卡片尚未触发的防抖保存
  useEffect(() => {
    if (previousWorkContentIdRef.current !== null && previousWorkContentIdRef.current !== workContent?.id) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        onUpdateVersions(previousWorkContentIdRef.current, versionsRef.current)
      }
    }
    previousWorkContentIdRef.current = workContent?.id ?? null

    if (parsedData) {
      setVersions(parsedData.versions)
    } else {
      setVersions([])
    }
  }, [parsedData, workContent?.id, onUpdateVersions])

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

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const triggerUpdate = (newVersions: ResumeDescriptionVersion[], immediate = false) => {
    setVersions(newVersions)
    if (!workContent) return

    const targetId = workContent.id

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (immediate) {
      onUpdateVersions(targetId, newVersions)
    } else {
      debounceTimerRef.current = setTimeout(() => {
        onUpdateVersions(targetId, newVersions)
      }, 500)
    }
  }

  const handleUpdateLabel = (id: string, label: string) => {
    const updated = versions.map((v) => (v.id === id ? { ...v, label } : v))
    triggerUpdate(updated, false)
  }

  const handleUpdateContent = (id: string, content: string) => {
    const updated = versions.map((v) => (v.id === id ? { ...v, content } : v))
    triggerUpdate(updated, false)
  }

  const handleBlurSave = () => {
    if (!workContent) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    onUpdateVersions(workContent.id, versionsRef.current)
  }

  const handleAddVersion = () => {
    if (!workContent) return
    const newId = `desc_${Date.now()}`
    const newVersion: ResumeDescriptionVersion = {
      id: newId,
      label: '自定义版本',
      content: ''
    }
    const updated = [...versions, newVersion]
    triggerUpdate(updated, true)
    setEditingVersionId(newId)
    toast.success('已添加新的简历描述版本')
  }

  const handleDeleteVersion = (id: string) => {
    if (!workContent) return
    clearMilkdownEditorCache(`desc-wc-${workContent.id}-ver-${id}`)
    if (editingVersionId === id) {
      setEditingVersionId(null)
    }
    const target = versions.find((v) => v.id === id)
    const updated = versions.filter((v) => v.id !== id)
    triggerUpdate(updated, true)
    toast.success(`已删除版本${target ? `“${target.label}”` : ''}`, {
      action: target
        ? {
            label: '撤销',
            onClick: () => {
              const restored = [...updated, target]
              triggerUpdate(restored, true)
            }
          }
        : undefined
    })
  }

  const handleCopy = async (version: ResumeDescriptionVersion) => {
    const textToCopy = version.content || ''
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        // Fallback for jsdom or non-secure contexts
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(version.id)
      toast.success(`已复制“${version.label}”到剪贴板`)
      setTimeout(() => {
        setCopiedId((curr) => (curr === version.id ? null : curr))
      }, 2000)
    } catch {
      toast.error('复制失败，请手动选择复制')
    }
  }

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
            {versions.length === 0 ? (
              <div className="resume-drawer-empty">
                <div className="empty-icon-box" aria-hidden="true">
                  <svg className="empty-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <p className="empty-heading">暂无简历描述版本</p>
                <p className="empty-subtext">针对不同求职岗位沉淀提炼专属的子弹点或整段高质量描述。</p>
              </div>
            ) : (
              <div className="resume-versions-list" role="feed" aria-label="简历描述版本列表">
                {versions.map((version) => {
                  const isCopied = copiedId === version.id
                  const isEditing = editingVersionId === version.id
                  return (
                    <article
                      key={version.id}
                      className={`resume-version-card ${isEditing ? 'resume-version-card--editing' : 'resume-version-card--readonly'}`}
                      aria-label={`版本卡片: ${version.label}`}
                    >
                      <header className="resume-version-card-header">
                        {isEditing ? (
                          <div className="version-label-box">
                            <label id={`desc-version-${version.id}-label`} htmlFor={`desc-version-label-${version.id}`} className="sr-only">
                              {version.label || '简历描述版本'}
                            </label>
                            <input
                              id={`desc-version-label-${version.id}`}
                              type="text"
                              className="version-label-input"
                              value={version.label}
                              autoFocus
                              aria-label={`${version.label || '简历描述版本'} 名称`}
                              placeholder="版本名称，如：技术深度版"
                              onChange={(e) => handleUpdateLabel(version.id, e.target.value)}
                              onBlur={handleBlurSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleBlurSave()
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="version-label-display"
                            onClick={() => setEditingVersionId(version.id)}
                            title="点击编辑版本名称"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setEditingVersionId(version.id)
                              }
                            }}
                          >
                            <h4 className="version-label-text">{version.label || '未命名版本'}</h4>
                            <svg className="edit-pencil-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </div>
                        )}

                        <div className="version-actions">
                          {isEditing ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="version-action-btn version-finish-btn"
                              aria-label={`完成编辑 ${version.label}`}
                              onPress={() => {
                                handleBlurSave()
                                setEditingVersionId(null)
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>完成</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="version-action-btn version-edit-btn"
                              aria-label={`编辑 ${version.label}`}
                              onPress={() => setEditingVersionId(version.id)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <span>编辑</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className={`version-action-btn version-copy-btn ${isCopied ? 'version-copy-btn--copied' : ''}`}
                            aria-label={`复制 ${version.label}`}
                            onPress={() => handleCopy(version)}
                          >
                            {isCopied ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>已复制</span>
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>复制</span>
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="version-action-btn version-delete-btn"
                            aria-label={`删除 ${version.label}`}
                            onPress={() => handleDeleteVersion(version.id)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </Button>
                        </div>
                      </header>

                      {isEditing ? (
                        <div className="resume-version-card-content">
                          <MilkdownEditor
                            id={`desc-version-${version.id}`}
                            cacheKey={`desc-wc-${workContent.id}-ver-${version.id}`}
                            value={version.content}
                            rows={4}
                            placeholder="编写该版本的完整简历描述段落（支持 Markdown，包含行动动词、量化结果与核心技术细节）..."
                            onChange={(val) => handleUpdateContent(version.id, val)}
                          />
                        </div>
                      ) : (
                        <div
                          className="version-content-preview-container"
                          onClick={() => setEditingVersionId(version.id)}
                          title="点击编辑简历描述正文"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setEditingVersionId(version.id)
                            }
                          }}
                        >
                          <MilkdownView
                            content={version.content}
                            placeholder="暂无描述内容，点击开始编写（支持 Markdown）..."
                          />
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <footer className="resume-drawer-footer">
            <Button
              type="button"
              variant="secondary"
              className="add-version-btn"
              onPress={handleAddVersion}
              aria-label="新建简历描述版本"
            >
              <IconPlus className="add-version-icon" aria-hidden="true" />
              <span>新建简历描述版本</span>
            </Button>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
