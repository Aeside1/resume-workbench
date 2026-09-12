import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { api, ExperienceGroup } from '../../api'
import type { Session } from '../../session'
import { CreateExperienceDraft, CreateExperienceModal } from './CreateExperienceModal'
import { EditExperienceDraft, EditExperienceModal } from './EditExperienceModal'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'
import { EmptyStateCard } from './EmptyStateCard'
import { ExperienceGroupCard } from './ExperienceGroupCard'


const isTestEnv = import.meta.env.MODE === 'test'

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
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<ExperienceGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<ExperienceGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')


  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setError('')

    // 拉取全部经历分组（包含已归档），便于在两个 Tab 之间平滑切换与统计徽标
    api.experienceGroups(session.token, true)
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
  }, [session.token])

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
      setActiveTab('active')
      onSelectExperience(created)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }

  const handleUpdateGroup = async (draft: EditExperienceDraft) => {
    if (!groupToEdit) return
    try {
      const updated = await api.updateExperienceGroup(session.token, groupToEdit.id, {
        name: draft.name,
        type: draft.type,
        organization: draft.organization || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        description: draft.description || null
      })

      setGroups((items) => items.map((g) => (g.id === updated.id ? updated : g)))
      setNotice(`经历分组“${updated.name}”已成功保存修改。`)
      setGroupToEdit(null)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }

  const handleArchiveGroup = async (group: ExperienceGroup) => {
    try {
      const updated = await api.archiveExperienceGroup(session.token, group.id)
      setGroups((items) => items.map((g) => (g.id === updated.id ? updated : g)))
      setNotice(`经历分组“${group.name}”已移至归档箱，可在“归档箱”中查看或恢复。`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRestoreGroup = async (group: ExperienceGroup) => {
    try {
      const updated = await api.restoreExperienceGroup(session.token, group.id)
      setGroups((items) => items.map((g) => (g.id === updated.id ? updated : g)))
      setNotice(`经历分组“${group.name}”已恢复到在用经历列表。`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRequestDelete = (group: ExperienceGroup) => {
    setGroupToDelete(group)
  }

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return
    const target = groupToDelete
    try {
      await api.deleteExperienceGroup(session.token, target.id)
      setGroups((items) => items.filter((g) => g.id !== target.id))
      setNotice(`经历分组“${target.name}”已彻底删除。`)
      setGroupToDelete(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }


  const activeGroups = groups.filter((g) => !g.archived)
  const archivedGroups = groups.filter((g) => g.archived)
  const displayGroups = activeTab === 'active' ? activeGroups : archivedGroups

  return (
    <div className="experience-hub-panel">
      <div className="hub-top-bar">
        <div className="hub-title-section">
          <div className="hub-title-row">
            <h2 className="hub-heading">经历分组</h2>
            <span className="hub-badge-count">{displayGroups.length} 个经历分组</span>
          </div>
          <p className="hub-subtitle">
            整理过往实习经历与项目经历，沉淀可复用的具体工作内容与简历素材。
          </p>
        </div>

        <div className="hub-actions-bar">
          <div className="hub-tabs-row" role="tablist" aria-label="经历分组视图">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'active'}
              className={`hub-tab-btn ${activeTab === 'active' ? 'hub-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              在用经历
              <span className="tab-count-badge">{activeGroups.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'archived'}
              className={`hub-tab-btn ${activeTab === 'archived' ? 'hub-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              归档箱
              <span className="tab-count-badge">{archivedGroups.length}</span>
            </button>
          </div>

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
        {!loading && displayGroups.length === 0 && (
          activeTab === 'active' ? (
            <EmptyStateCard
              title="开始整理一段经历"
              description="还没有在用经历分组，点击下方按钮或上方“+ 新建经历分组”开始沉淀你的实习或项目经历。"
              actionLabel="+ 新建经历分组"
              onAction={() => setIsCreateOpen(true)}
              icon={
                <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              }
            />
          ) : (
            <EmptyStateCard
              title="归档箱是空的"
              description="没有已归档的经历分组。在在用经历中归档的内容会存放在这里，可随时恢复或彻底删除。"
              actionLabel="查看在用经历"
              onAction={() => setActiveTab('active')}
              icon={
                <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
              }
            />
          )
        )}


        <div className="experience-card-grid" aria-label={activeTab === 'active' ? '在用经历分组列表' : '已归档经历分组列表'}>
          {isTestEnv ? (
            displayGroups.map((group) => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <ExperienceGroupCard
                  group={group}
                  workContentCount={counts[group.id] ?? 0}
                  onSelect={onSelectExperience}
                  onEdit={(target) => setGroupToEdit(target)}
                  onArchive={handleArchiveGroup}
                  onRestore={handleRestoreGroup}
                  onDelete={handleRequestDelete}
                />
              </div>
            ))
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {displayGroups.map((group) => (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <ExperienceGroupCard
                    group={group}
                    workContentCount={counts[group.id] ?? 0}
                    onSelect={onSelectExperience}
                    onEdit={(target) => setGroupToEdit(target)}
                    onArchive={handleArchiveGroup}
                    onRestore={handleRestoreGroup}
                    onDelete={handleRequestDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <CreateExperienceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateGroup}
      />

      <EditExperienceModal
        isOpen={Boolean(groupToEdit)}
        group={groupToEdit}
        onClose={() => setGroupToEdit(null)}
        onSubmit={handleUpdateGroup}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(groupToDelete)}
        groupName={groupToDelete?.name ?? ''}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

