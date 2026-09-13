import { describe, expect, it } from 'vitest'
import {
  parseSupplementaryNotes,
  serializeSupplementaryNotes,
  type ResumeDescriptionVersion,
  type ParsedSupplementaryNotes
} from './supplementaryNotes'

describe('supplementaryNotes 数据模型与序列化适配器', () => {
  describe('切片 1: 空值与空白输入', () => {
    it('当传入 null、undefined、空字符串或仅空白字符时，安全返回空结构', () => {
      const emptyResults = [
        parseSupplementaryNotes(null),
        parseSupplementaryNotes(undefined),
        parseSupplementaryNotes(''),
        parseSupplementaryNotes('   \n  \t  ')
      ]

      for (const result of emptyResults) {
        expect(result.note).toBe('')
        expect(result.versions).toEqual([])
        expect(result.descriptions).toEqual([])
      }
    })
  })

  describe('切片 2: 现代标准 JSON 结构解析与序列化往返 (Roundtrip)', () => {
    it('能够准确解析包含 note 与 versions 的新规范 JSON 格式，并生成兼容的 descriptions', () => {
      const payload = {
        note: '产出专利 1 篇并在中台沙龙分享。',
        versions: [
          {
            id: 'desc_1',
            label: '技术深度版',
            content: '主导核心服务 Rust 重构，单项验证耗时从 220s 缩减至 21s。'
          },
          {
            id: 'desc_2',
            label: '业务成效版',
            content: '保障百万级告警零丢失，吞吐量提升 3 倍。'
          }
        ]
      }

      const raw = JSON.stringify(payload)
      const parsed = parseSupplementaryNotes(raw)

      expect(parsed.note).toBe('产出专利 1 篇并在中台沙龙分享。')
      expect(parsed.versions).toHaveLength(2)
      expect(parsed.versions[0]).toEqual({
        id: 'desc_1',
        label: '技术深度版',
        content: '主导核心服务 Rust 重构，单项验证耗时从 220s 缩减至 21s。'
      })
      expect(parsed.versions[1]).toEqual({
        id: 'desc_2',
        label: '业务成效版',
        content: '保障百万级告警零丢失，吞吐量提升 3 倍。'
      })

      // 验证兼容旧组件的 descriptions 映射
      expect(parsed.descriptions).toEqual([
        {
          id: 'desc_1',
          tag: '技术深度版',
          bullets: ['主导核心服务 Rust 重构，单项验证耗时从 220s 缩减至 21s。']
        },
        {
          id: 'desc_2',
          tag: '业务成效版',
          bullets: ['保障百万级告警零丢失，吞吐量提升 3 倍。']
        }
      ])
    })

    it('对标准数据进行序列化与再反序列化，能够实现无损往返 (Roundtrip)', () => {
      const note = '核心架构演进记录'
      const versions: ResumeDescriptionVersion[] = [
        { id: 'desc_v1', label: '通用版', content: '负责日常系统研发与维护。' }
      ]

      const serialized = serializeSupplementaryNotes(note, versions)
      expect(typeof serialized).toBe('string')
      expect(serialized).toContain('通用版')

      const roundtrip = parseSupplementaryNotes(serialized)
      expect(roundtrip.note).toBe(note)
      expect(roundtrip.versions).toEqual(versions)
    })
  })

  describe('切片 3: 旧版纯文本平滑升级为默认版本卡片', () => {
    it('当传入非 JSON 纯文本字符串时，保留 note 并自动升级创建“默认版本”卡片', () => {
      const rawText = '负责分布式链路追踪系统开发，实现核心系统全链路打通。'
      const parsed = parseSupplementaryNotes(rawText)

      expect(parsed.note).toBe(rawText)
      expect(parsed.versions).toHaveLength(1)
      expect(parsed.versions[0].label).toBe('默认版本')
      expect(parsed.versions[0].content).toBe(rawText)
      expect(parsed.versions[0].id).toBeTruthy()

      expect(parsed.descriptions).toHaveLength(1)
      expect(parsed.descriptions[0].tag).toBe('默认版本')
      expect(parsed.descriptions[0].bullets).toEqual([rawText])
    })
  })

  describe('切片 4: 旧版 descriptions 与 bullets 散装要点数组平滑合并', () => {
    it('能够自动将旧版 tag 映射为 label，并将 bullets 数组用换行符合并为完整段落 content', () => {
      const legacyPayload = {
        note: '产出专利 1 篇并在中台技术沙龙进行架构分享。',
        descriptions: [
          {
            id: 'desc-1',
            tag: '技术深度版',
            bullets: [
              '深入剖析虚拟滚动与渲染性能',
              '  ',
              '优化大页面卡顿，帧率由 20fps 提升至 58+ fps'
            ]
          },
          {
            id: 'desc-2',
            tag: '业务成效版',
            bullets: [
              '支撑业务大促零故障',
              '跨部门推广覆盖 10+ 项目'
            ]
          }
        ]
      }

      const parsed = parseSupplementaryNotes(JSON.stringify(legacyPayload))

      expect(parsed.note).toBe('产出专利 1 篇并在中台技术沙龙进行架构分享。')
      expect(parsed.versions).toHaveLength(2)

      expect(parsed.versions[0].id).toBe('desc-1')
      expect(parsed.versions[0].label).toBe('技术深度版')
      expect(parsed.versions[0].content).toBe('深入剖析虚拟滚动与渲染性能\n优化大页面卡顿，帧率由 20fps 提升至 58+ fps')

      expect(parsed.versions[1].id).toBe('desc-2')
      expect(parsed.versions[1].label).toBe('业务成效版')
      expect(parsed.versions[1].content).toBe('支撑业务大促零故障\n跨部门推广覆盖 10+ 项目')
    })
  })

  describe('切片 5: 旧版 points 结构与顶层数组兼容', () => {
    it('能够准确解析 descriptions 中的 points 数组，并平滑合并为 content', () => {
      const payload = {
        note: '',
        descriptions: [
          {
            id: 'desc_pt_1',
            label: '架构设计版',
            points: ['基于 Raft 实现分布式选主', '网络分区自愈机制']
          }
        ]
      }

      const parsed = parseSupplementaryNotes(JSON.stringify(payload))
      expect(parsed.versions).toHaveLength(1)
      expect(parsed.versions[0].label).toBe('架构设计版')
      expect(parsed.versions[0].content).toBe('基于 Raft 实现分布式选主\n网络分区自愈机制')
    })

    it('能够兼容顶层直接为数组的历史数据格式', () => {
      const legacyArray = [
        {
          id: 'arr-1',
          tag: '直存数组版',
          points: ['直接存储在数组中的历史记录']
        }
      ]

      const parsed = parseSupplementaryNotes(JSON.stringify(legacyArray))
      expect(parsed.note).toBe('')
      expect(parsed.versions).toHaveLength(1)
      expect(parsed.versions[0].id).toBe('arr-1')
      expect(parsed.versions[0].label).toBe('直存数组版')
      expect(parsed.versions[0].content).toBe('直接存储在数组中的历史记录')
    })
  })

  describe('切片 6: 缺省字段容错与边界畸形数据防护', () => {
    it('当版本项缺失 id、label 或 content 时，能够自动兜底而不崩溃', () => {
      const dirtyPayload = {
        note: null,
        versions: [
          {
            // 缺失 id
            label: '',
            content: '仅有正文'
          },
          {
            id: 999, // 数字 id
            // 缺失 label 与 tag
            // 缺失 content 与 bullets
          },
          null, // 无效元素
          '字符串非对象' // 无效元素
        ]
      }

      const parsed = parseSupplementaryNotes(JSON.stringify(dirtyPayload))
      expect(parsed.note).toBe('')
      expect(parsed.versions).toHaveLength(2)

      // 第一项：自动生成 id，默认 label
      expect(parsed.versions[0].id).toBeTruthy()
      expect(parsed.versions[0].label).toBe('版本 1')
      expect(parsed.versions[0].content).toBe('仅有正文')

      // 第二项：转换为 string id，默认 label，空 content
      expect(parsed.versions[1].id).toBe('999')
      expect(parsed.versions[1].label).toBe('版本 2')
      expect(parsed.versions[1].content).toBe('')
    })

    it('当输入为纯数字等非对象类型字符串（如 "20240913"）时，平滑当作纯文本升级保留 note 与默认版本', () => {
      const parsedNum = parseSupplementaryNotes('20240913')
      expect(parsedNum.note).toBe('20240913')
      expect(parsedNum.versions).toHaveLength(1)
      expect(parsedNum.versions[0].content).toBe('20240913')
    })
  })

  describe('切片 7: 序列化持久化规范与自动升级', () => {
    it('当 note 为空且 versions 为空时返回空字符串，避免存储无用空 JSON', () => {
      expect(serializeSupplementaryNotes('', [])).toBe('')
      expect(serializeSupplementaryNotes('   \n\t  ', [])).toBe('')
    })

    it('当传入旧版包含 tag 与 bullets 的数据项时，自动在序列化时升级持久化为最新 versions 规范', () => {
      const legacyItems = [
        {
          id: 'legacy-1',
          tag: '旧版标签',
          bullets: ['子弹点 1', '子弹点 2']
        }
      ]

      const serialized = serializeSupplementaryNotes('旧笔记备注', legacyItems)
      const parsedJson = JSON.parse(serialized)

      // 验证存入数据库的是新标准的 versions 结构，而非旧的 descriptions/bullets
      expect(parsedJson).toEqual({
        note: '旧笔记备注',
        versions: [
          {
            id: 'legacy-1',
            label: '旧版标签',
            content: '子弹点 1\n子弹点 2'
          }
        ]
      })
    })
  })
})
