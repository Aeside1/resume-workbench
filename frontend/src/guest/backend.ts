import { ApiError } from '../apiErrors'
import type { Backend } from '../api'
import { GUEST_SESSION } from '../session'
import { SAMPLE_GROUPS, SAMPLE_HIGHLIGHTS, SAMPLE_WORK_CONTENTS } from './sampleContent'

const readOnly = (..._args: never[]): Promise<never> =>
  Promise.reject(new ApiError('登录后才能编辑', 401))

const planLocked = (..._args: never[]): Promise<never> =>
  Promise.reject(new ApiError('简历方案需要登录后使用', 401))

/** 游客态只读数据源：读示例内容，写一律拒绝（ADR 008）。 */
export function createGuestBackend(): Backend {
  return {
    me: async () => GUEST_SESSION.user,

    experienceGroups: async (includeArchived) =>
      SAMPLE_GROUPS.filter((group) => includeArchived || !group.archived),

    workContents: async (groupId, includeArchived) =>
      SAMPLE_WORK_CONTENTS.filter(
        (content) => content.experience_group_id === groupId && (includeArchived || !content.archived)
      ),

    resumeHighlights: async (contentId, includeArchived) =>
      SAMPLE_HIGHLIGHTS.filter(
        (highlight) => highlight.work_content_id === contentId && (includeArchived || !highlight.archived)
      ),

    createExperienceGroup: readOnly,
    updateExperienceGroup: readOnly,
    archiveExperienceGroup: readOnly,
    restoreExperienceGroup: readOnly,
    deleteExperienceGroup: readOnly,
    createWorkContent: readOnly,
    updateWorkContent: readOnly,
    reorderWorkContents: readOnly,
    archiveWorkContent: readOnly,
    restoreWorkContent: readOnly,
    deleteWorkContent: readOnly,
    createResumeHighlight: readOnly,
    updateResumeHighlight: readOnly,
    copyResumeHighlight: readOnly,
    archiveResumeHighlight: readOnly,
    restoreResumeHighlight: readOnly,
    deleteResumeHighlight: readOnly,

    resumePlans: planLocked,
    createResumePlan: planLocked,
    resumePlan: planLocked,
    updateResumePlan: planLocked,
    archiveResumePlan: planLocked,
    restoreResumePlan: planLocked,
    deleteResumePlan: planLocked,
    addPlanBlock: planLocked,
    updatePlanBlock: planLocked,
    removePlanBlock: planLocked,
    reorderPlanBlocks: planLocked,
    addPlanItem: planLocked,
    updatePlanItem: planLocked,
    removePlanItem: planLocked,
    reorderPlanItems: planLocked,
    planCandidates: planLocked,
    planDocument: planLocked,
    planArchives: planLocked,
    restorePlanArchive: planLocked,
    forkResumePlan: planLocked
  }
}
