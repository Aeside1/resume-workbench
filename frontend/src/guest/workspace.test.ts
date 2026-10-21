import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  GUEST_STORAGE_KEY,
  GUEST_WORKSPACE_EVENT,
  clearGuestWorkspace,
  isGuestWorkspaceEmpty,
  loadSampleWorkspace,
  readGuestWorkspace,
  writeGuestWorkspace
} from './workspace'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('游客本地草稿存储（ADR 008 §2.5）', () => {
  it('没有存储时返回空草稿', () => {
    const workspace = readGuestWorkspace()
    expect(workspace).toEqual({ version: 1, nextId: 1, groups: [], workContents: [], highlights: [] })
    expect(isGuestWorkspaceEmpty()).toBe(true)
  })

  it('坏 JSON / 版本不符 / 字段类型不对都退化为空草稿', () => {
    localStorage.setItem(GUEST_STORAGE_KEY, '{not json')
    expect(readGuestWorkspace().groups).toEqual([])

    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ version: 2, groups: [], workContents: [], highlights: [] }))
    expect(readGuestWorkspace().groups).toEqual([])

    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ version: 1, groups: 'nope', workContents: [], highlights: [] }))
    expect(readGuestWorkspace()).toEqual({ version: 1, nextId: 1, groups: [], workContents: [], highlights: [] })
  })

  it('写入后可读回，并保证 nextId 至少大于已有最大 id', () => {
    writeGuestWorkspace({
      version: 1,
      nextId: 2,
      groups: [
        {
          id: 7,
          user_id: 0,
          name: '本地草稿',
          type: 'project',
          organization: null,
          start_date: null,
          end_date: null,
          description: null,
          archived: false,
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z'
        }
      ],
      workContents: [],
      highlights: []
    })

    const workspace = readGuestWorkspace()
    expect(workspace.groups).toHaveLength(1)
    expect(workspace.nextId).toBe(8)
    expect(isGuestWorkspaceEmpty()).toBe(false)
  })

  it('清空后回到空草稿', () => {
    loadSampleWorkspace()
    expect(isGuestWorkspaceEmpty()).toBe(false)

    clearGuestWorkspace()
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull()
    expect(isGuestWorkspaceEmpty()).toBe(true)
  })

  it('写入与清空都会广播变更事件（横幅据此实时刷新）', () => {
    const events: string[] = []
    const listener = () => events.push('changed')
    window.addEventListener(GUEST_WORKSPACE_EVENT, listener)
    try {
      writeGuestWorkspace({ version: 1, nextId: 1, groups: [], workContents: [], highlights: [] })
      clearGuestWorkspace()
    } finally {
      window.removeEventListener(GUEST_WORKSPACE_EVENT, listener)
    }
    expect(events).toHaveLength(2)
  })

  it('示例内容以「示例」命名，且覆盖完整的三层经历资产', () => {
    const workspace = loadSampleWorkspace()

    expect(workspace.groups.length).toBeGreaterThanOrEqual(2)
    expect(workspace.groups.every((group) => group.name.startsWith('示例'))).toBe(true)
    expect(workspace.groups.map((group) => group.type).sort()).toEqual(['internship', 'project'])
    expect(workspace.workContents.length).toBeGreaterThanOrEqual(3)
    expect(workspace.highlights.length).toBeGreaterThanOrEqual(4)

    // 每条工作内容都挂在真实分组上，每条亮点都挂在真实工作内容上
    const groupIds = new Set(workspace.groups.map((group) => group.id))
    const contentIds = new Set(workspace.workContents.map((content) => content.id))
    expect(workspace.workContents.every((content) => groupIds.has(content.experience_group_id))).toBe(true)
    expect(workspace.highlights.every((highlight) => contentIds.has(highlight.work_content_id))).toBe(true)

    // 没有 id 冲突，且 nextId 还没有被用过
    const ids = [
      ...workspace.groups.map((group) => group.id),
      ...workspace.workContents.map((content) => content.id),
      ...workspace.highlights.map((highlight) => highlight.id)
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(workspace.nextId).toBeGreaterThan(Math.max(...ids))
    // 示例数据也落盘了：刷新后仍能读到
    expect(readGuestWorkspace().groups).toHaveLength(workspace.groups.length)
  })
})
