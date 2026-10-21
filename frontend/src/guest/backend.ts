import { ApiError } from '../apiErrors'
import type { Backend, ExperienceGroup, ResumeHighlight, WorkContent } from '../api'
import { GUEST_SESSION } from '../session'
import { readGuestWorkspace, writeGuestWorkspace } from './workspace'

/**
 * 游客态（未登录）的浏览器本地后端（ADR 008 §2.2 / §2.3 / §2.5）。
 *
 * 它只实现「经历资产」这一段可写能力，语义对齐服务端的
 * `ExperienceGroupService` / `ResumeDescriptionService`：
 * - 新建工作内容 / 亮点的 position 追加到末尾；
 * - 列表按 position、id 排序，归档默认过滤；
 * - 删除经历分组级联删除其下工作内容与亮点的本地副本。
 *
 * 简历方案（组合 / 留档 / 文稿）是账号能力，这里一律以 401 拒绝，
 * 保证即使调用方绕过 UI 门禁也不会悄悄造出「登录后必丢的假方案」。
 */

const DEFAULT_HIGHLIGHT_LABEL = '新的简历亮点'

function nowIso(): string {
  return new Date().toISOString()
}

function notFound(detail: string): ApiError {
  return new ApiError(detail, 404)
}

function invalid(detail: string): ApiError {
  return new ApiError(detail, 422)
}

/** 每次调用都重新读盘：同屏多处的写入不会互相覆盖内存里的陈旧快照 */
function mutate<T>(mutator: (workspace: ReturnType<typeof readGuestWorkspace>) => T): T {
  const workspace = readGuestWorkspace()
  const result = mutator(workspace)
  writeGuestWorkspace(workspace)
  return result
}

function requireGroup(workspace: ReturnType<typeof readGuestWorkspace>, groupId: number): ExperienceGroup {
  const group = workspace.groups.find((item) => item.id === groupId)
  if (!group) throw notFound('经历分组不存在')
  return group
}

function requireContent(workspace: ReturnType<typeof readGuestWorkspace>, contentId: number): WorkContent {
  const content = workspace.workContents.find((item) => item.id === contentId)
  if (!content) throw notFound('具体工作内容不存在')
  return content
}

function requireHighlight(workspace: ReturnType<typeof readGuestWorkspace>, highlightId: number): ResumeHighlight {
  const highlight = workspace.highlights.find((item) => item.id === highlightId)
  if (!highlight) throw notFound('简历亮点不存在')
  return highlight
}

function sortByPosition<T extends { position: number; id: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id - b.id)
}

/** 简历方案属于账号能力（ADR 008 §2.3）：游客态一律拒绝 */
function lockedPlan(..._args: never[]): Promise<never> {
  return Promise.reject(new ApiError('简历方案需要登录后使用', 401))
}

export function createGuestBackend(): Backend {
  return {
    me: async () => GUEST_SESSION.user,

    experienceGroups: async (includeArchived) => {
      const workspace = readGuestWorkspace()
      return workspace.groups
        .filter((group) => includeArchived || !group.archived)
        // 服务端按 updated_at 倒序：最近改过的分组排在前面
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id - b.id)
    },

    createExperienceGroup: async (payload) =>
      mutate((workspace) => {
        const timestamp = nowIso()
        const group: ExperienceGroup = {
          id: workspace.nextId++,
          name: payload.name,
          type: payload.type,
          organization: payload.organization ?? null,
          start_date: payload.start_date ?? null,
          end_date: payload.end_date ?? null,
          description: payload.description ?? null,
          archived: false,
          created_at: timestamp,
          updated_at: timestamp
        }
        workspace.groups.push(group)
        return group
      }),

    updateExperienceGroup: async (id, payload) =>
      mutate((workspace) => {
        const group = requireGroup(workspace, id)
        const start = payload.start_date !== undefined ? payload.start_date : group.start_date
        const end = payload.end_date !== undefined ? payload.end_date : group.end_date
        if (start && end && end < start) throw invalid('结束日期不能早于开始日期')
        Object.assign(group, payload, { updated_at: nowIso() })
        return group
      }),

    archiveExperienceGroup: async (id) =>
      mutate((workspace) => {
        const group = requireGroup(workspace, id)
        group.archived = true
        group.updated_at = nowIso()
        return group
      }),

    restoreExperienceGroup: async (id) =>
      mutate((workspace) => {
        const group = requireGroup(workspace, id)
        group.archived = false
        group.updated_at = nowIso()
        return group
      }),

    deleteExperienceGroup: async (id) => {
      mutate((workspace) => {
        requireGroup(workspace, id)
        const contentIds = new Set(
          workspace.workContents.filter((content) => content.experience_group_id === id).map((content) => content.id)
        )
        workspace.groups = workspace.groups.filter((group) => group.id !== id)
        workspace.workContents = workspace.workContents.filter((content) => content.experience_group_id !== id)
        workspace.highlights = workspace.highlights.filter((highlight) => !contentIds.has(highlight.work_content_id))
      })
    },

    workContents: async (groupId, includeArchived) => {
      const workspace = readGuestWorkspace()
      requireGroup(workspace, groupId)
      return sortByPosition(
        workspace.workContents.filter(
          (content) => content.experience_group_id === groupId && (includeArchived || !content.archived)
        )
      )
    },

    createWorkContent: async (groupId, payload) =>
      mutate((workspace) => {
        requireGroup(workspace, groupId)
        const siblings = workspace.workContents.filter((content) => content.experience_group_id === groupId)
        const maxPosition = siblings.reduce((max, content) => Math.max(max, content.position), -1)
        const timestamp = nowIso()
        const content: WorkContent = {
          id: workspace.nextId++,
          experience_group_id: groupId,
          title: payload.title,
          detailed_record: payload.detailed_record ?? null,
          technical_materials: payload.technical_materials ?? null,
          result_data: payload.result_data ?? null,
          supplementary_notes: payload.supplementary_notes ?? null,
          position: maxPosition + 1,
          archived: false,
          created_at: timestamp,
          updated_at: timestamp
        }
        workspace.workContents.push(content)
        return content
      }),

    updateWorkContent: async (id, payload) =>
      mutate((workspace) => {
        const content = requireContent(workspace, id)
        Object.assign(content, payload, { updated_at: nowIso() })
        return content
      }),

    reorderWorkContents: async (groupId, ids) =>
      mutate((workspace) => {
        requireGroup(workspace, groupId)
        const siblings = workspace.workContents.filter((content) => content.experience_group_id === groupId)
        const byId = new Map(siblings.map((content) => [content.id, content]))
        if (ids.length !== siblings.length || ids.some((id) => !byId.has(id))) {
          throw invalid('排序内容必须完整覆盖该经历分组')
        }
        ids.forEach((id, position) => {
          const content = byId.get(id)!
          content.position = position
        })
        return sortByPosition(siblings)
      }),

    archiveWorkContent: async (id) =>
      mutate((workspace) => {
        const content = requireContent(workspace, id)
        content.archived = true
        content.updated_at = nowIso()
        return content
      }),

    restoreWorkContent: async (id) =>
      mutate((workspace) => {
        const content = requireContent(workspace, id)
        content.archived = false
        content.updated_at = nowIso()
        return content
      }),

    deleteWorkContent: async (id) => {
      mutate((workspace) => {
        requireContent(workspace, id)
        workspace.workContents = workspace.workContents.filter((content) => content.id !== id)
        workspace.highlights = workspace.highlights.filter((highlight) => highlight.work_content_id !== id)
      })
    },

    resumeHighlights: async (contentId, includeArchived) => {
      const workspace = readGuestWorkspace()
      requireContent(workspace, contentId)
      return sortByPosition(
        workspace.highlights.filter(
          (highlight) => highlight.work_content_id === contentId && (includeArchived || !highlight.archived)
        )
      )
    },

    createResumeHighlight: async (contentId, payload) =>
      mutate((workspace) => {
        requireContent(workspace, contentId)
        const siblings = workspace.highlights.filter((highlight) => highlight.work_content_id === contentId)
        const maxPosition = siblings.reduce((max, highlight) => Math.max(max, highlight.position), -1)
        const timestamp = nowIso()
        const highlight: ResumeHighlight = {
          id: workspace.nextId++,
          work_content_id: contentId,
          label: payload.label || DEFAULT_HIGHLIGHT_LABEL,
          content: payload.content ?? '',
          position: maxPosition + 1,
          archived: false,
          created_at: timestamp,
          updated_at: timestamp
        }
        workspace.highlights.push(highlight)
        return highlight
      }),

    updateResumeHighlight: async (id, payload) =>
      mutate((workspace) => {
        const highlight = requireHighlight(workspace, id)
        Object.assign(highlight, payload, { updated_at: nowIso() })
        return highlight
      }),

    copyResumeHighlight: async (id) =>
      mutate((workspace) => {
        const original = requireHighlight(workspace, id)
        const siblings = workspace.highlights.filter(
          (highlight) => highlight.work_content_id === original.work_content_id
        )
        const maxPosition = siblings.reduce((max, highlight) => Math.max(max, highlight.position), -1)
        const timestamp = nowIso()
        const clone: ResumeHighlight = {
          id: workspace.nextId++,
          work_content_id: original.work_content_id,
          label: `${original.label} 副本`,
          content: original.content,
          position: maxPosition + 1,
          archived: false,
          created_at: timestamp,
          updated_at: timestamp
        }
        workspace.highlights.push(clone)
        return clone
      }),

    archiveResumeHighlight: async (id) =>
      mutate((workspace) => {
        const highlight = requireHighlight(workspace, id)
        highlight.archived = true
        highlight.updated_at = nowIso()
        return highlight
      }),

    restoreResumeHighlight: async (id) =>
      mutate((workspace) => {
        const highlight = requireHighlight(workspace, id)
        highlight.archived = false
        highlight.updated_at = nowIso()
        return highlight
      }),

    deleteResumeHighlight: async (id) => {
      mutate((workspace) => {
        requireHighlight(workspace, id)
        workspace.highlights = workspace.highlights.filter((highlight) => highlight.id !== id)
      })
    },

    resumePlans: lockedPlan,
    createResumePlan: lockedPlan,
    resumePlan: lockedPlan,
    updateResumePlan: lockedPlan,
    archiveResumePlan: lockedPlan,
    restoreResumePlan: lockedPlan,
    deleteResumePlan: lockedPlan,
    addPlanBlock: lockedPlan,
    updatePlanBlock: lockedPlan,
    removePlanBlock: lockedPlan,
    reorderPlanBlocks: lockedPlan,
    addPlanItem: lockedPlan,
    updatePlanItem: lockedPlan,
    removePlanItem: lockedPlan,
    reorderPlanItems: lockedPlan,
    planCandidates: lockedPlan,
    planDocument: lockedPlan,
    planArchives: lockedPlan,
    restorePlanArchive: lockedPlan,
    forkResumePlan: lockedPlan
  }
}
