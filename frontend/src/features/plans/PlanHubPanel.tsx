import { useCallback, useEffect, useState } from 'react'
import { Button, Chip, Tabs } from '@heroui/react'
import { Archive, FilePlus2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ResumePlan } from '../../api'
import type { Session } from '../../session'
import { useToast } from '../../components/ui/Toast'
import { EmptyStateCard } from '../hub/EmptyStateCard'
import { ConfirmDeletePlanModal } from './ConfirmDeletePlanModal'
import { PlanCard } from './PlanCard'
import { PlanFormModal, type PlanDraft } from './PlanFormModal'

export type PlanHubPanelProps = {
  session: Session
  onSelectPlan: (plan: ResumePlan) => void
}

/**
 * 简历方案列表页（左侧栏「简历方案」入口）。
 * 一张卡片 = 一个岗位方向的一版简历；归档沿用经历资产页的两段式（归档箱 → 恢复 / 彻底删除）。
 */
export function PlanHubPanel({ session, onSelectPlan }: PlanHubPanelProps) {
  const [plans, setPlans] = useState<ResumePlan[]>([])
  const [blockCounts, setBlockCounts] = useState<Record<number, number>>({})
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [planToEdit, setPlanToEdit] = useState<ResumePlan | null>(null)
  const [planToDelete, setPlanToDelete] = useState<ResumePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.resumePlans(session.token, true)
      setPlans(result)
      const counts: Record<number, number> = {}
      await Promise.all(
        result.map(async (plan) => {
          try {
            const detail = await api.resumePlan(session.token, plan.id)
            counts[plan.id] = detail.experience_groups.length
          } catch {
            counts[plan.id] = 0
          }
        })
      )
      setBlockCounts(counts)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [session.token])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (draft: PlanDraft) => {
    const created = await api.createResumePlan(session.token, { name: draft.name, purpose: draft.purpose || null })
    setPlans((items) => [created, ...items])
    setBlockCounts((prev) => ({ ...prev, [created.id]: 0 }))
    setActiveTab('active')
    toast.success(`简历方案“${created.name}”已创建。`)
    onSelectPlan(created)
  }

  const handleUpdate = async (draft: PlanDraft) => {
    if (!planToEdit) return
    const updated = await api.updateResumePlan(session.token, planToEdit.id, {
      name: draft.name,
      purpose: draft.purpose || null
    })
    setPlans((items) => items.map((plan) => (plan.id === updated.id ? updated : plan)))
    toast.success(`简历方案“${updated.name}”已保存修改。`)
    setPlanToEdit(null)
  }

  const handleArchive = async (plan: ResumePlan) => {
    try {
      const updated = await api.archiveResumePlan(session.token, plan.id)
      setPlans((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`简历方案“${plan.name}”已移至归档箱。`, {
        action: { label: '撤销', onClick: () => void handleRestore(plan) }
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRestore = async (plan: ResumePlan) => {
    try {
      const updated = await api.restoreResumePlan(session.token, plan.id)
      setPlans((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`简历方案“${plan.name}”已恢复。`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleConfirmDelete = async () => {
    if (!planToDelete) return
    const target = planToDelete
    try {
      await api.deleteResumePlan(session.token, target.id)
      setPlans((items) => items.filter((plan) => plan.id !== target.id))
      toast.success(`简历方案“${target.name}”已彻底删除。`)
      setPlanToDelete(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const activePlans = plans.filter((plan) => !plan.archived)
  const archivedPlans = plans.filter((plan) => plan.archived)
  const displayPlans = activeTab === 'active' ? activePlans : archivedPlans

  return (
    <div className="plan-hub-panel">
      <div className="hub-top-bar">
        <div className="hub-title-section">
          <div className="hub-title-row">
            <h2 className="hub-heading">简历方案</h2>
            <Chip size="sm">
              <Chip.Label>{displayPlans.length} 个简历方案</Chip.Label>
            </Chip>
          </div>
          <p className="hub-subtitle">
            一个岗位方向一份方案：从经历资产里挑简历亮点组合成简历，随时预览并导出通用 Markdown 文稿。
          </p>
        </div>

        <div className="hub-actions-bar">
          <Tabs
            className="hub-tabs"
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as 'active' | 'archived')}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="简历方案视图">
                <Tabs.Tab id="active">
                  在用方案
                  <Chip size="sm">{activePlans.length}</Chip>
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="archived">
                  归档箱
                  <Chip size="sm">{archivedPlans.length}</Chip>
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          <Button variant="primary" onPress={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            新建简历方案
          </Button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {toast.ToastPortal}

      {!loading && displayPlans.length === 0 && (
        activeTab === 'active' ? (
          <EmptyStateCard
            title="开始准备一份简历"
            description="还没有在用简历方案。新建一份方案，把经历资产里的简历亮点组合成面向某个岗位的简历。"
            actionLabel="新建简历方案"
            onAction={() => setIsCreateOpen(true)}
            icon={<FilePlus2 size={32} aria-hidden="true" />}
          />
        ) : (
          <EmptyStateCard
            title="归档箱是空的"
            description="没有已归档的简历方案。在在用方案中归档的内容会存放在这里，可随时恢复或彻底删除。"
            actionLabel="查看在用方案"
            onAction={() => setActiveTab('active')}
            icon={<Archive size={32} aria-hidden="true" />}
          />
        )
      )}

      <div className="plan-card-grid" aria-label={activeTab === 'active' ? '在用简历方案列表' : '已归档简历方案列表'}>
        {displayPlans.map((plan) => (
          <motion.div key={plan.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex' }}>
            <PlanCard
              plan={plan}
              blockCount={blockCounts[plan.id] ?? 0}
              onSelect={onSelectPlan}
              onEdit={setPlanToEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={setPlanToDelete}
            />
          </motion.div>
        ))}
      </div>

      <PlanFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreate} />
      <PlanFormModal
        isOpen={Boolean(planToEdit)}
        plan={planToEdit}
        onClose={() => setPlanToEdit(null)}
        onSubmit={handleUpdate}
      />
      <ConfirmDeletePlanModal
        isOpen={Boolean(planToDelete)}
        planName={planToDelete?.name ?? ''}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
