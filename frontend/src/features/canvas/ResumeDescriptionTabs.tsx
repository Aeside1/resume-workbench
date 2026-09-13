import { useState, useEffect, type Key } from 'react'
import { Button, Chip, Input, Label, Tabs } from '@heroui/react'
import { Plus } from 'lucide-react'
import { MilkdownView, MilkdownEditor } from '../../components/ui/MilkdownView'

export type ResumeDescriptionItem = {
  id: string
  tag: string
  bullets: string[]
}

export type ResumeDescriptionTabsProps = {
  workContentId: number
  descriptions?: ResumeDescriptionItem[]
  onChange?: (descriptions: ResumeDescriptionItem[]) => void
}

const EMPTY_DESCRIPTIONS: ResumeDescriptionItem[] = []

export function ResumeDescriptionTabs({
  workContentId,
  descriptions: externalDescriptions = EMPTY_DESCRIPTIONS,
  onChange
}: ResumeDescriptionTabsProps) {
  const [descriptions, setDescriptions] = useState<ResumeDescriptionItem[]>(externalDescriptions)
  const [activeId, setActiveId] = useState<string>(() => descriptions[0]?.id ?? '')

  // 同步外部传入的 descriptions 变更
  useEffect(() => {
    setDescriptions(externalDescriptions)
    setActiveId((prev) => {
      if (externalDescriptions.some((d) => d.id === prev)) {
        return prev
      }
      return externalDescriptions[0]?.id ?? ''
    })
  }, [externalDescriptions])

  // 新增与编辑状态
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTag, setDraftTag] = useState('')
  const [draftBulletsText, setDraftBulletsText] = useState('')

  const activeItem = descriptions.find((item) => item.id === activeId) ?? descriptions[0]

  const handleStartAdd = () => {
    setEditingId(null)
    setDraftTag('')
    setDraftBulletsText('')
    setIsAdding(true)
  }

  const handleStartEdit = (item: ResumeDescriptionItem) => {
    setIsAdding(false)
    setEditingId(item.id)
    setDraftTag(item.tag)
    setDraftBulletsText(item.bullets.join('\n'))
  }

  const handleCancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setDraftTag('')
    setDraftBulletsText('')
  }

  const handleSelectTab = (key: Key | null) => {
    if (key == null) return
    setActiveId(String(key))
    handleCancelForm()
  }

  const handleSave = () => {
    if (!draftTag.trim()) return

    const bullets = draftBulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    if (isAdding) {
      const newItem: ResumeDescriptionItem = {
        id: `desc-${workContentId}-${Date.now()}`,
        tag: draftTag.trim(),
        bullets: bullets.length > 0 ? bullets : ['暂无描述要点']
      }
      const updated = [...descriptions, newItem]
      setDescriptions(updated)
      setActiveId(newItem.id)
      handleCancelForm()
      onChange?.(updated)
    } else if (editingId) {
      const updated = descriptions.map((item) =>
        item.id === editingId
          ? {
              ...item,
              tag: draftTag.trim(),
              bullets: bullets.length > 0 ? bullets : ['暂无描述要点']
            }
          : item
      )
      setDescriptions(updated)
      handleCancelForm()
      onChange?.(updated)
    }
  }

  const handleDelete = (id: string) => {
    const target = descriptions.find((d) => d.id === id)
    const confirmed = window.confirm(`确定要删除简历描述写法“${target?.tag || '此版本'}”吗？`)
    if (!confirmed) return

    const updated = descriptions.filter((item) => item.id !== id)
    setDescriptions(updated)
    if (activeId === id) {
      setActiveId(updated[0]?.id ?? '')
    }
    onChange?.(updated)
  }

  const isFormOpen = isAdding || editingId !== null

  const formPanel = (
    <div className="resume-desc-add-panel">
      <p className="resume-desc-form-header">
        {isAdding ? '新增简历描述写法' : `编辑写法：${draftTag}`}
      </p>

      <div className="resume-desc-field">
        <Label htmlFor={`tag-input-${workContentId}`}>版本标签</Label>
        <Input
          id={`tag-input-${workContentId}`}
          placeholder="例如：技术深度版、业务结果版、管理协同版"
          value={draftTag}
          onChange={(e) => setDraftTag(e.target.value)}
        />
      </div>

      <div className="resume-desc-field">
        <Label id={`bullets-input-${workContentId}-label`} htmlFor={`bullets-input-${workContentId}`}>
          简历描述要点 (每行一条)
        </Label>
        <MilkdownEditor
          id={`bullets-input-${workContentId}`}
          cacheKey={`bullets-input-${workContentId}-${editingId || 'new'}`}
          placeholder="输入该版本的 bullet points，每行一条..."
          rows={3}
          value={draftBulletsText}
          onChange={setDraftBulletsText}
        />
      </div>

      <div className="resume-desc-add-actions">
        <Button size="sm" variant="primary" onPress={handleSave}>
          {isAdding ? '保存新写法' : '保存修改'}
        </Button>
        <Button size="sm" variant="ghost" onPress={handleCancelForm}>
          取消
        </Button>
      </div>
    </div>
  )

  const emptyStatePanel = (
    <div className="resume-desc-empty-state">
      <p className="resume-empty-text">暂无针对不同岗位的简历描述写法</p>
      <Button size="sm" variant="secondary" onPress={handleStartAdd}>
        <Plus size={14} aria-hidden="true" />
        立即新增版本写法
      </Button>
    </div>
  )

  return (
    <div className="resume-desc-container">
      <Tabs
        className="resume-desc-tabs"
        selectedKey={activeItem?.id ?? null}
        onSelectionChange={handleSelectTab}
      >
        <div className="resume-desc-header">
          {descriptions.length > 0 && (
            <Tabs.ListContainer>
              <Tabs.List aria-label="简历描述版本">
                {descriptions.map((item) => (
                  <Tabs.Tab key={item.id} id={item.id}>
                    {item.tag}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          )}

          {!isFormOpen && (
            <Button size="sm" variant="outline" onPress={handleStartAdd}>
              <Plus size={14} aria-hidden="true" />
              新增写法
            </Button>
          )}
        </div>

        {activeItem ? (
          <Tabs.Panel id={activeItem.id}>
            {isFormOpen ? (
              formPanel
            ) : (
              <>
                <div className="active-desc-header-actions">
                  <Chip size="sm">{activeItem.tag}</Chip>
                  <div className="desc-crud-btn-group">
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => handleStartEdit(activeItem)}
                    >
                      编辑写法
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() => handleDelete(activeItem.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                <ul className="resume-bullets-list">
                  {activeItem.bullets.map((bullet, idx) => (
                    <li key={idx} className="resume-bullet-item">
                      <MilkdownView content={bullet} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Tabs.Panel>
        ) : isFormOpen ? (
          formPanel
        ) : (
          emptyStatePanel
        )}
      </Tabs>
    </div>
  )
}
