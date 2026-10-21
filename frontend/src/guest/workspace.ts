import type { ExperienceGroup, ResumeHighlight, WorkContent } from '../api'

/**
 * 游客工作台的本地草稿存储（ADR 008 §2.5 / §2.7）。
 *
 * 只落在当前浏览器的 `localStorage`：没有服务端身份、不会同步、换设备即丢失。
 * 读写都做防御性解析——版本不符、JSON 损坏、字段类型不对，一律当作空草稿，
 * 避免一次坏数据把整个工作台卡死在白屏。
 */

export const GUEST_STORAGE_KEY = 'resume-guest-workspace'

export type GuestWorkspace = {
  version: 1
  /** 下一个可分配的 id：分组 / 工作内容 / 亮点共用一段递增区间 */
  nextId: number
  groups: ExperienceGroup[]
  workContents: WorkContent[]
  highlights: ResumeHighlight[]
}

function emptyWorkspace(): GuestWorkspace {
  return { version: 1, nextId: 1, groups: [], workContents: [], highlights: [] }
}

function safeStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  try {
    return window.localStorage ?? null
  } catch {
    // 隐私模式 / 禁用存储：游客态退化为「本次会话内可用，刷新即丢」
    return null
  }
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item !== null && typeof item === 'object')
}

function maxId(workspace: Omit<GuestWorkspace, 'version' | 'nextId'>): number {
  const ids = [
    ...workspace.groups.map((group) => group.id),
    ...workspace.workContents.map((content) => content.id),
    ...workspace.highlights.map((highlight) => highlight.id)
  ]
  return ids.reduce((max, id) => (Number.isFinite(id) && id > max ? id : max), 0)
}

export function readGuestWorkspace(storage?: Storage): GuestWorkspace {
  const store = safeStorage(storage)
  if (!store) return emptyWorkspace()
  const raw = store.getItem(GUEST_STORAGE_KEY)
  if (!raw) return emptyWorkspace()
  try {
    const parsed = JSON.parse(raw) as Partial<GuestWorkspace> | null
    if (!parsed || parsed.version !== 1) return emptyWorkspace()
    if (!isObjectArray(parsed.groups) || !isObjectArray(parsed.workContents) || !isObjectArray(parsed.highlights)) {
      return emptyWorkspace()
    }
    const workspace: GuestWorkspace = {
      version: 1,
      nextId: 0,
      groups: parsed.groups as ExperienceGroup[],
      workContents: parsed.workContents as WorkContent[],
      highlights: parsed.highlights as ResumeHighlight[]
    }
    const declared = typeof parsed.nextId === 'number' && Number.isFinite(parsed.nextId) ? parsed.nextId : 0
    workspace.nextId = Math.max(declared, maxId(workspace) + 1, 1)
    return workspace
  } catch {
    return emptyWorkspace()
  }
}

export function writeGuestWorkspace(workspace: GuestWorkspace, storage?: Storage): void {
  const store = safeStorage(storage)
  if (!store) return
  store.setItem(GUEST_STORAGE_KEY, JSON.stringify(workspace))
}

export function clearGuestWorkspace(storage?: Storage): void {
  const store = safeStorage(storage)
  if (!store) return
  store.removeItem(GUEST_STORAGE_KEY)
}

export function isGuestWorkspaceEmpty(storage?: Storage): boolean {
  const workspace = readGuestWorkspace(storage)
  return workspace.groups.length === 0 && workspace.workContents.length === 0 && workspace.highlights.length === 0
}

/** 示例内容的时间戳用固定值：便于测试与阅读，不随运行时刻漂移 */
const SAMPLE_TIMESTAMP = '2026-10-01T09:00:00.000Z'

/**
 * 写入一份「示例内容」，让未登录访客立刻有东西可看。
 *
 * 命名一律以「示例」开头，与用户自己试写的内容可区分；横幅上一键清空即可归零。
 * 会覆盖当前草稿（清空后重来），调用方负责确认。
 */
export function loadSampleWorkspace(storage?: Storage): GuestWorkspace {
  const workspace = emptyWorkspace()
  const id = () => workspace.nextId++

  const project: ExperienceGroup = {
    id: id(),
    user_id: 0,
    name: '示例项目：订单中台重构',
    type: 'project',
    organization: '示例科技',
    start_date: '2024-03-01',
    end_date: '2024-09-30',
    description: '把下单与支付链路拆成可独立演进的服务，并补上接口契约回归。',
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: '2026-10-01T09:00:02.000Z'
  }
  const internship: ExperienceGroup = {
    id: id(),
    user_id: 0,
    name: '示例实习：内容平台前端实习',
    type: 'internship',
    organization: '示例内容平台',
    start_date: '2023-07-01',
    end_date: '2023-10-31',
    description: '参与文章编辑器与发布流程的前端开发。',
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: '2026-10-01T09:00:01.000Z'
  }

  const splitChain: WorkContent = {
    id: id(),
    experience_group_id: project.id,
    title: '拆分下单与支付链路',
    detailed_record:
      '## 背景\n订单创建同时写库、扣库存、调支付，任何一步慢都拖垮整体耗时。\n\n## 做法\n- 按阶段拆成独立编排节点，失败只重试当前阶段\n- 为支付回调补幂等键，重复回调不再产生二次扣款\n\n## 结果\n下单接口 P99 从 780ms 降到 210ms，重复扣款事故清零。',
    technical_materials: '- TypeScript / Node.js\n- PostgreSQL 事务与索引\n- 幂等键 + 本地消息表',
    result_data: '下单接口 P99：780ms → 210ms；支付重复扣款事故：0',
    supplementary_notes: '复盘：先量化基线再动结构，每一步都留可回滚开关。',
    position: 0,
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: SAMPLE_TIMESTAMP
  }
  const contractTests: WorkContent = {
    id: id(),
    experience_group_id: project.id,
    title: '建立接口契约回归测试',
    detailed_record: '把 3 个核心接口的请求 / 响应快照纳入 CI，回归时先跑契约再跑业务用例。',
    technical_materials: 'Vitest + 契约快照',
    result_data: '接口不兼容变更 0 次漏到预发',
    supplementary_notes: null,
    position: 1,
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: SAMPLE_TIMESTAMP
  }
  const editorToolbar: WorkContent = {
    id: id(),
    experience_group_id: internship.id,
    title: '重构文章编辑器工具条',
    detailed_record: '把散落的快捷键入口收进统一工具条，并补齐键盘可达性。',
    technical_materials: 'React / ProseMirror',
    result_data: '编辑体验相关反馈下降 40%',
    supplementary_notes: null,
    position: 0,
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: SAMPLE_TIMESTAMP
  }

  const highlight = (contentId: number, label: string, content: string, position: number): ResumeHighlight => ({
    id: id(),
    work_content_id: contentId,
    label,
    content,
    position,
    archived: false,
    created_at: SAMPLE_TIMESTAMP,
    updated_at: SAMPLE_TIMESTAMP
  })

  workspace.groups.push(project, internship)
  workspace.workContents.push(splitChain, contractTests, editorToolbar)
  workspace.highlights.push(
    highlight(splitChain.id, '技术深度版', '重构订单编排链路：按阶段拆分服务调用、补齐支付回调幂等键，下单接口 P99 从 780ms 降至 210ms。', 0),
    highlight(splitChain.id, '结果强调版', '主导下单与支付链路重构，P99 延迟下降 73%，上线后支付重复扣款事故归零。', 1),
    highlight(splitChain.id, '极简版', '订单中台链路重构，P99 780ms → 210ms。', 2),
    highlight(contractTests.id, '工程效能版', '为核心接口建立契约回归测试并接入 CI，接口不兼容变更零漏出。', 0),
    highlight(editorToolbar.id, '实习版', '前端实习：重构文章编辑器工具条并补齐键盘可达性，编辑体验相关反馈下降 40%。', 0)
  )

  writeGuestWorkspace(workspace, storage)
  return workspace
}
