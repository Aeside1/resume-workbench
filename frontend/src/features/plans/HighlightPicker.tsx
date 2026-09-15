import { useEffect, useMemo, useState } from 'react'
import { Button, Chip, Input, Modal } from '@heroui/react'
import { Check, Plus } from 'lucide-react'
import type { PlanBlock, PlanCandidates, PlanItem } from '../../api'

export type HighlightPickerProps = {
  isOpen: boolean
  block: PlanBlock | null
  candidates: PlanCandidates | null
  items: PlanItem[]
  onClose: () => void
  /** 勾选 = 加入简历；再点一次 = 从简历里移除 */
  onToggle: (workContentId: number, highlightId: number, existingItemId: number | null) => Promise<void> | void
}

/**
 * 挑简历亮点（经历块内「+ 添加亮点」）。
 *
 * 交互按设计评审定稿：**一层平铺 + 搜索**，不做「分组 → 工作内容 → 亮点」的三级下钻；
 * 所属经历分组的名字只作副标题出现，避免洋葱式导航。
 */
export function HighlightPicker({ isOpen, block, candidates, items, onClose, onToggle }: HighlightPickerProps) {
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (isOpen) setKeyword('')
  }, [isOpen])

  const group = useMemo(
    () => candidates?.experience_groups.find((entry) => entry.id === block?.experience_group_id) ?? null,
    [candidates, block?.experience_group_id]
  )

  const visibleContents = useMemo(() => {
    const contents = group?.work_contents ?? []
    const needle = keyword.trim().toLowerCase()
    if (!needle) return contents
    return contents.filter(
      (content) =>
        content.title.toLowerCase().includes(needle) ||
        content.highlights.some(
          (highlight) =>
            highlight.label.toLowerCase().includes(needle) || highlight.content.toLowerCase().includes(needle)
        )
    )
  }, [group, keyword])

  const itemIdOf = (highlightId: number) =>
    items.find((item) => item.resume_description_id === highlightId)?.id ?? null

  if (!isOpen || !block) return null

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog aria-label="添加简历亮点">
            <Modal.Header>
              <Modal.Heading>添加简历亮点</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭弹窗" />
            </Modal.Header>

            <Modal.Body>
              <div className="field">
                <Input
                  aria-label="搜索简历亮点"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索具体工作内容或简历亮点"
                />
              </div>

              <p className="plan-picker-context">来自经历分组：{block.name}</p>

              <ul className="plan-picker-list">
                {visibleContents.map((content) => (
                  <li key={content.id} className="plan-picker-row plan-picker-row--stacked">
                    <div className="plan-picker-row-main">
                      <div className="plan-picker-row-title">
                        <span>{content.title}</span>
                        {content.already_added && (
                          <Chip size="sm">
                            <Chip.Label>已在简历里</Chip.Label>
                          </Chip>
                        )}
                      </div>
                      {content.highlights.length === 0 && (
                        <p className="plan-picker-row-subtitle">
                          这条具体工作内容还没有简历亮点，先去经历资产里提炼一条。
                        </p>
                      )}
                    </div>

                    <div className="plan-highlight-options">
                      {content.highlights.map((highlight) => {
                        const existingItemId = itemIdOf(highlight.id)
                        const isSelected = existingItemId !== null
                        return (
                          <Button
                            key={highlight.id}
                            size="sm"
                            variant={isSelected ? 'secondary' : 'ghost'}
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? '移出简历' : '加入简历'}：${highlight.label}`}
                            onPress={() => void onToggle(content.id, highlight.id, existingItemId)}
                          >
                            {isSelected ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                            {highlight.label}
                          </Button>
                        )
                      })}
                    </div>
                  </li>
                ))}
                {visibleContents.length === 0 && <li className="plan-picker-empty">没有匹配的简历亮点。</li>}
              </ul>
            </Modal.Body>

            <Modal.Footer>
              <Button size="sm" variant="ghost" onPress={onClose}>
                完成
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
