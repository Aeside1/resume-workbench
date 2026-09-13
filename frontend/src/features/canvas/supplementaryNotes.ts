/**
 * 简历描述单版本契约（纵向版本卡片数据模型）
 */
export type ResumeDescriptionVersion = {
  id: string
  label: string
  content: string
}

/**
 * 旧版简历描述项契约（用于向后兼容过渡）
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
 * 解析补充说明与多版本简历描述
 */
export function parseSupplementaryNotes(raw: string | null | undefined): ParsedSupplementaryNotes {
  if (!raw || !raw.trim()) {
    return { note: '', versions: [], descriptions: [] }
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const versions: ResumeDescriptionVersion[] = []
      for (let i = 0; i < parsed.length; i++) {
        const normalized = normalizeVersionItem(parsed[i], i)
        if (normalized) {
          versions.push(normalized)
        }
      }
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

      const versions: ResumeDescriptionVersion[] = []
      for (let i = 0; i < rawVersions.length; i++) {
        const normalized = normalizeVersionItem(rawVersions[i], i)
        if (normalized) {
          versions.push(normalized)
        }
      }

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
 * 序列化多版本简历描述与补充说明
 */
export function serializeSupplementaryNotes(
  note: string,
  versions: Array<ResumeDescriptionVersion | ResumeDescriptionItem> = []
): string {
  const trimmedNote = note.trim()
  if (!trimmedNote && versions.length === 0) {
    return ''
  }

  const normalizedVersions: ResumeDescriptionVersion[] = []
  for (let i = 0; i < versions.length; i++) {
    const normalized = normalizeVersionItem(versions[i], i)
    if (normalized) {
      normalizedVersions.push(normalized)
    }
  }

  return JSON.stringify({
    note: trimmedNote,
    versions: normalizedVersions
  })
}
