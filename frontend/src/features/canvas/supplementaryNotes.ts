/**
 * 历史 JSON 兼容层（只读）。
 *
 * `work_contents.supplementary_notes` 曾同时承载「补充说明 note」与「多条简历描述版本」。
 * 自切片 04a（migrate_003）起，简历描述版本已搬运为独立记录 `resume_descriptions`（界面称
 * 「简历亮点」，见 CONTEXT.md），抽屜不再从这里读取列表；本模块保留供 note 字段读写，
 * 并让尚未迁移/旧形状的数据不会崩。卡片与界面文案请勿再用「版本」「版本卡片」字样。
 */

/**
 * 历史 JSON 中的单条描述契约（旧形状，仅供解析与回写保留）
 */
export type ResumeDescriptionVersion = {
  id: string
  label: string
  content: string
}

/**
 * 旧版描述项契约（更早的 descriptions/points 形状，供解析兼容）
 */
export type ResumeDescriptionItem = {
  id: string
  tag: string
  bullets: string[]
}

/**
 * 结构化辅助笔记与版本解析结果
 */
export type ParsedSupplementaryNotes = {
  note: string
  versions: ResumeDescriptionVersion[]
  /**
   * 兼容字段：供已有依赖 descriptions 的旧组件平滑访问
   */
  descriptions: ResumeDescriptionItem[]
}

/**
 * 将单个版本项或旧结构项标准化为规范的 ResumeDescriptionVersion
 */
function normalizeVersionItem(
  item: unknown,
  index: number
): ResumeDescriptionVersion | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const raw = item as Record<string, unknown>
  const id = typeof raw.id === 'string' || typeof raw.id === 'number'
    ? String(raw.id)
    : `desc_${index + 1}`

  const label = typeof raw.label === 'string' && raw.label.trim()
    ? raw.label.trim()
    : typeof raw.tag === 'string' && raw.tag.trim()
      ? raw.tag.trim()
      : `版本 ${index + 1}`

  let content = ''
  if (typeof raw.content === 'string') {
    content = raw.content
  } else if (Array.isArray(raw.bullets)) {
    content = raw.bullets
      .filter((b): b is string => typeof b === 'string' && Boolean(b.trim()))
      .join('\n')
  } else if (Array.isArray(raw.points)) {
    content = raw.points
      .filter((p): p is string => typeof p === 'string' && Boolean(p.trim()))
      .join('\n')
  }

  return { id, label, content }
}

/**
 * 将版本列表规范化为 ResumeDescriptionVersion 数组
 */
function normalizeVersionList(rawList: unknown[]): ResumeDescriptionVersion[] {
  const versions: ResumeDescriptionVersion[] = []
  for (let i = 0; i < rawList.length; i++) {
    const normalized = normalizeVersionItem(rawList[i], i)
    if (normalized) {
      versions.push(normalized)
    }
  }
  return versions
}

/**
 * 统一将版本列表映射为向后兼容的 descriptions 数组
 */
function toLegacyDescriptions(versions: ResumeDescriptionVersion[]): ResumeDescriptionItem[] {
  return versions.map((v) => ({
    id: v.id,
    tag: v.label,
    bullets: v.content ? [v.content] : []
  }))
}

function fallbackLegacyPlainText(raw: string): ParsedSupplementaryNotes {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { note: '', versions: [], descriptions: [] }
  }

  const defaultVersion: ResumeDescriptionVersion = {
    id: 'desc_legacy_1',
    label: '默认版本',
    content: trimmed
  }

  return {
    note: trimmed,
    versions: [defaultVersion],
    descriptions: toLegacyDescriptions([defaultVersion])
  }
}

/**
 * 解析补充说明与历史描述版本
 */
export function parseSupplementaryNotes(raw: string | null | undefined): ParsedSupplementaryNotes {
  if (!raw || !raw.trim()) {
    return { note: '', versions: [], descriptions: [] }
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const versions = normalizeVersionList(parsed)
      return {
        note: '',
        versions,
        descriptions: toLegacyDescriptions(versions)
      }
    }

    if (parsed && typeof parsed === 'object') {
      const note = typeof parsed.note === 'string' ? parsed.note : ''
      const rawVersions = Array.isArray(parsed.versions)
        ? parsed.versions
        : Array.isArray(parsed.descriptions)
          ? parsed.descriptions
          : []

      const versions = normalizeVersionList(rawVersions)

      return {
        note,
        versions,
        descriptions: toLegacyDescriptions(versions)
      }
    }

    // 若解析出 number / boolean 等原始类型，安全作为纯文本升级
    return fallbackLegacyPlainText(raw)
  } catch {
    // 非 JSON 纯文本（老旧数据）平滑升级
    return fallbackLegacyPlainText(raw)
  }
}

/**
 * 序列化补充说明与历史描述版本
 *
 * 历史版本会原样写回：它们已由 migrate_003 搬进独立表，这里保留只是避免销毁旧数据。
 */
export function serializeSupplementaryNotes(
  note: string,
  versions: Array<ResumeDescriptionVersion | ResumeDescriptionItem> = []
): string {
  const trimmedNote = note.trim()
  if (!trimmedNote && versions.length === 0) {
    return ''
  }

  const normalizedVersions = normalizeVersionList(versions)

  return JSON.stringify({
    note: trimmedNote,
    versions: normalizedVersions
  })
}

