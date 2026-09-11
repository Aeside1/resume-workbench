import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@heroui/react'
import { api, ExperienceGroup } from '../../api'
import type { Session } from '../../session'
import { CreateExperienceDraft, CreateExperienceModal } from './CreateExperienceModal'
import { ExperienceGroupCard } from './ExperienceGroupCard'

export type ExperienceHubPanelProps = {
  session: Session
  onSelectExperience: (group: ExperienceGroup) => void
}

export function ExperienceHubPanel({
  session,
  onSelectExperience
}: ExperienceHubPanelProps) {
  const [groups, setGroups] = useState<ExperienceGroup[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [showArchived, setShowArchived] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setError('')

    api.experienceGroups(session.token, showArchived)
      .then(async (result) => {
        if (isCancelled) return
        setGroups(result)
        setLoading(false)

        // 并发拉取各经历分组的工作项计数
        const countMap: Record<number, number> = {}
        await Promise.all(
          result.map(async (group) => {
            try {
              const contents = await api.workContents(session.token, group.id, false)
              countMap[group.id] = contents.length
            } catch {
              countMap[group.id] = 0
            }
          })
        )
        if (!isCancelled) {
          setCounts(countMap)
        }
      })
      .catch((e) => {
        if (!isCancelled) {
          setError((e as Error).message)
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [session.token, showArchived])

  const handleCreateGroup = async (draft: CreateExperienceDraft) => {
    try {
      const created = await api.createExperienceGroup(session.token, {
        name: draft.name,
        type: draft.type,
        organization: draft.organization || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        description: draft.description || null
      })

      setGroups((current) => [created, ...current])
      setCounts((prev) => ({ ...prev, [created.id]: 0 }))
      setIsCreateOpen(false)
      onSelectExperience(created)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }

  const handleArchiveGroup = async (group: ExperienceGroup) => {
    try {
      const updated = await api.archiveExperienceGroup(session.token, group.id)
      setGroups((items) => items.map((g) => (g.id === updated.id ? updated : g)))
      setShowArchived(true)
      setNotice('经历分组已归档，已显示已归档内容，可在列表中恢复。')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRestoreGroup = async (group: ExperienceGroup) => {
    try {
      const updated = await api.restoreExperienceGroup(session.token, group.id)
      setGroups((items) => items.map((g) => (g.id === updated.id ? updated : g)))
      setNotice('经历分组已恢复。')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="experience-hub-panel">
      <div className="hub-top-bar">
        <div className="hub-title-section">
          <div className="hub-title-row">
            <h2 className="hub-heading">经历分组</h2>
            <span className="hub-badge-count">{groups.length} 个经历分组</span>
          </div>
          <p className="hub-subtitle">
            整理过往实习经历与项目经历，沉淀可复用的具体工作内容与简历素材。
          </p>
        </div>

        <div className="hub-actions-bar">
          <Checkbox
            isSelected={showArchived}
            onChange={setShowArchived}
            className="archive-toggle"
            aria-label="显示已归档"
          >
            <Checkbox.Control />
            <Checkbox.Content>显示已归档</Checkbox.Content>
          </Checkbox>

          <Button
            variant="primary"
            className="btn-create-experience"
            onPress={() => setIsCreateOpen(true)}
          >
            + 新建经历分组
          </Button>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <div className="hub-content-area">
        {!loading && groups.length === 0 && (
          <div className="empty-state hub-empty-state">
            <h3>开始整理一段经历</h3>
            <p>还没有经历分组，点击上方“+ 新建经历分组”开始沉淀你的实习或项目经历。</p>
          </div>
        )}

        <div className="experience-card-grid" aria-label="经历分组卡片流">
          {groups.map((group) => (
            <ExperienceGroupCard
              key={group.id}
              group={group}
              workContentCount={counts[group.id] ?? 0}
              onSelect={onSelectExperience}
              onArchive={handleArchiveGroup}
              onRestore={handleRestoreGroup}
            />
          ))}
        </div>
      </div>

      <CreateExperienceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  )
}
