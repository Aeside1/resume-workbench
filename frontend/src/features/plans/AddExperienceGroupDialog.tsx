import { useEffect, useMemo, useState } from 'react'
import { Button, Chip, Input, Modal } from '@heroui/react'
import { Check, FileText } from 'lucide-react'
import type { PlanCandidates } from '../../api'

export type AddExperienceGroupDialogProps = {
  isOpen: boolean
  candidates: PlanCandidates | null
  onClose: () => void
  onPick: (experienceGroupId: number) => Promise<void> | void
}

/**
 * 「添加经历分组」选择器：一层平铺 + 搜索。
 * 已经加进方案的经历分组显示为已添加，不能重复添加。
 */
export function AddExperienceGroupDialog({ isOpen, candidates, onClose, onPick }: AddExperienceGroupDialogProps) {
  const [keyword, setKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) setKeyword('')
  }, [isOpen])

  const groups = useMemo(() => {
    const all = candidates?.experience_groups ?? []
    const needle = keyword.trim().toLowerCase()
    if (!needle) return all
    return all.filter(
      (group) =>
        group.name.toLowerCase().includes(needle) ||
        (group.organization ?? '').toLowerCase().includes(needle) ||
        group.work_contents.some((content) => content.title.toLowerCase().includes(needle))
    )
  }, [candidates, keyword])

  if (!isOpen) return null

  const handlePick = async (experienceGroupId: number) => {
    setSubmitting(true)
    try {
      await onPick(experienceGroupId)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog aria-label="添加经历分组">
            <Modal.Header>
              <Modal.Heading>添加经历分组</Modal.Heading>
              <Modal.CloseTrigger aria-label="关闭弹窗" />
            </Modal.Header>

            <Modal.Body>
              <div className="field">
                <Input
                  aria-label="搜索经历分组"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索经历分组、组织或具体工作内容"
                />
              </div>

              <ul className="plan-picker-list">
                {groups.map((group) => (
                  <li key={group.id} className="plan-picker-row">
                    <div className="plan-picker-row-main">
                      <div className="plan-picker-row-title">
                        <FileText size={15} aria-hidden="true" />
                        <span>{group.name}</span>
                        <Chip size="sm">
                          <Chip.Label>{group.type === 'internship' ? '实习经历' : '项目经历'}</Chip.Label>
                        </Chip>
                      </div>
                      <p className="plan-picker-row-subtitle">
                        {[group.organization, `${group.work_contents.length} 项具体工作内容`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={group.already_added ? 'tertiary' : 'secondary'}
                      isDisabled={group.already_added || submitting}
                      aria-label={group.already_added ? `${group.name} 已添加` : `添加经历分组 ${group.name}`}
                      onPress={() => void handlePick(group.id)}
                    >
                      {group.already_added ? (
                        <>
                          <Check size={14} aria-hidden="true" />
                          已添加
                        </>
                      ) : (
                        '添加到简历'
                      )}
                    </Button>
                  </li>
                ))}
                {groups.length === 0 && <li className="plan-picker-empty">没有匹配的经历分组。</li>}
              </ul>
            </Modal.Body>

            <Modal.Footer>
              <Button size="sm" variant="ghost" onPress={onClose}>
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
