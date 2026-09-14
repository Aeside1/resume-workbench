import { useEffect, useRef, useState, useMemo } from 'react'
import { Button, Card, Input } from '@heroui/react'
import { Check, Copy, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import type { WorkContent } from '../../api'
import { toast } from '../../components/ui/Toast'
import { copyToClipboard } from '../../utils/clipboard'
import { MilkdownView, MilkdownEditor, clearMilkdownEditorCache } from '../../components/ui/MilkdownView'
import {
  parseSupplementaryNotes,
  type ResumeDescriptionVersion
} from './supplementaryNotes'

export type ResumeVersionsFeedProps = {
  workContent: WorkContent | null
  onUpdateVersions: (workContentId: number, versions: ResumeDescriptionVersion[]) => Promise<void> | void
  className?: string
}

export function ResumeVersionsFeed({
  workContent,
  onUpdateVersions,
  className = ''
}: ResumeVersionsFeedProps) {
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

  useEffect(() => {
    if (previousWorkContentIdRef.current !== null && previousWorkContentIdRef.current !== workContent?.id) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        onUpdateVersions(previousWorkContentIdRef.current, versionsRef.current)
      }
      setEditingVersionId(null)
    }
    previousWorkContentIdRef.current = workContent?.id ?? null

    if (parsedData) {
      setVersions(parsedData.versions)
    } else {
      setVersions([])
    }
  }, [parsedData, workContent?.id, onUpdateVersions])

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
    const success = await copyToClipboard(textToCopy)
    if (success) {
      setCopiedId(version.id)
      toast.success(`已复制“${version.label}”到剪贴板`)
      setTimeout(() => {
        setCopiedId((curr) => (curr === version.id ? null : curr))
      }, 2000)
    } else {
      toast.error('复制失败，请手动选择复制')
    }
  }

  if (!workContent) return null

  return (
    <div className={`resume-versions-feed ${className}`}>
      <div className="resume-versions-scroll-body">
        {versions.length === 0 ? (
          <div className="resume-drawer-empty">
            <div className="empty-icon-box" aria-hidden="true">
              <FileText size={28} strokeWidth={1.5} />
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
                <Card
                  key={version.id}
                  role="article"
                  className={`resume-version-card ${isEditing ? 'resume-version-card--editing' : 'resume-version-card--readonly'}`}
                  aria-label={`版本卡片: ${version.label}`}
                >
                  <Card.Header className="resume-version-card-header">
                    {isEditing ? (
                      <Input
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
                        <Card.Title className="version-label-text">
                          {version.label || '未命名版本'}
                        </Card.Title>
                        <Pencil className="edit-pencil-icon" size={12} aria-hidden="true" />
                      </div>
                    )}

                    <div className="version-actions">
                      {isEditing ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="version-action-btn"
                          aria-label={`完成编辑 ${version.label}`}
                          onPress={() => {
                            handleBlurSave()
                            setEditingVersionId(null)
                          }}
                        >
                          <Check size={12} aria-hidden="true" />
                          <span>完成</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="version-action-btn"
                          aria-label={`编辑 ${version.label}`}
                          onPress={() => setEditingVersionId(version.id)}
                        >
                          <Pencil size={12} aria-hidden="true" />
                          <span>编辑</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="version-action-btn"
                        aria-label={`复制 ${version.label}`}
                        onPress={() => handleCopy(version)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} aria-hidden="true" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" />
                            <span>复制</span>
                          </>
                        )}
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="version-action-btn"
                        aria-label={`删除 ${version.label}`}
                        onPress={() => handleDeleteVersion(version.id)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    </div>
                  </Card.Header>

                  {isEditing ? (
                    <Card.Content className="resume-version-card-content">
                      <MilkdownEditor
                        id={`desc-version-${version.id}`}
                        cacheKey={`desc-wc-${workContent.id}-ver-${version.id}`}
                        value={version.content}
                        rows={4}
                        placeholder="编写该版本的完整简历描述段落（支持 Markdown，包含行动动词、量化结果与核心技术细节）..."
                        onChange={(val) => handleUpdateContent(version.id, val)}
                      />
                    </Card.Content>
                  ) : (
                    <Card.Content
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
          onPress={handleAddVersion}
          aria-label="新建简历描述版本"
        >
          <Plus className="add-version-icon" size={16} aria-hidden="true" />
          <span>新建简历描述版本</span>
        </Button>
      </footer>
    </div>
  )
}
