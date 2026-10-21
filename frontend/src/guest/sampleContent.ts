import type { ExperienceGroup, ResumeHighlight, WorkContent } from '../api'

const ISO = '2026-10-01T09:00:00.000Z'

export const SAMPLE_GROUPS: ExperienceGroup[] = [
  {
    id: 1,
    name: '订单中台重构',
    type: 'project',
    organization: '示例科技',
    start_date: '2024-03-01',
    end_date: '2024-09-30',
    description: '把下单与支付链路拆成可独立演进的服务，并补上接口契约回归。',
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 2,
    name: '内容平台前端实习',
    type: 'internship',
    organization: '示例内容平台',
    start_date: '2023-07-01',
    end_date: '2023-10-31',
    description: '参与文章编辑器与发布流程的前端开发。',
    archived: false,
    created_at: ISO,
    updated_at: ISO
  }
]

export const SAMPLE_WORK_CONTENTS: WorkContent[] = [
  {
    id: 11,
    experience_group_id: 1,
    title: '拆分下单与支付链路',
    detailed_record:
      '## 背景\n订单创建同时写库、扣库存、调支付，任何一步慢都拖垮整体耗时。\n\n## 做法\n- 按阶段拆成独立编排节点，失败只重试当前阶段\n- 为支付回调补幂等键，重复回调不再产生二次扣款\n\n## 结果\n下单接口 P99 从 780ms 降到 210ms，重复扣款事故清零。',
    technical_materials: '- TypeScript / Node.js\n- PostgreSQL 事务与索引\n- 幂等键 + 本地消息表',
    result_data: '下单接口 P99：780ms → 210ms；支付重复扣款事故：0',
    supplementary_notes: null,
    position: 0,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 12,
    experience_group_id: 1,
    title: '建立接口契约回归测试',
    detailed_record: '把 3 个核心接口的请求 / 响应快照纳入 CI，回归时先跑契约再跑业务用例。',
    technical_materials: 'Vitest + 契约快照',
    result_data: '接口不兼容变更 0 次漏到预发',
    supplementary_notes: null,
    position: 1,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 13,
    experience_group_id: 2,
    title: '重构文章编辑器工具条',
    detailed_record: '把散落的快捷键入口收进统一工具条，并补齐键盘可达性。',
    technical_materials: 'React / ProseMirror',
    result_data: '编辑体验相关反馈下降 40%',
    supplementary_notes: null,
    position: 0,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  }
]

export const SAMPLE_HIGHLIGHTS: ResumeHighlight[] = [
  {
    id: 21,
    work_content_id: 11,
    label: '技术深度版',
    content: '重构订单编排链路：按阶段拆分服务调用、补齐支付回调幂等键，下单接口 P99 从 780ms 降至 210ms。',
    position: 0,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 22,
    work_content_id: 11,
    label: '结果强调版',
    content: '主导下单与支付链路重构，P99 延迟下降 73%，上线后支付重复扣款事故归零。',
    position: 1,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 23,
    work_content_id: 11,
    label: '极简版',
    content: '订单中台链路重构，P99 780ms → 210ms。',
    position: 2,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 24,
    work_content_id: 12,
    label: '工程效能版',
    content: '为核心接口建立契约回归测试并接入 CI，接口不兼容变更零漏出。',
    position: 0,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  },
  {
    id: 25,
    work_content_id: 13,
    label: '实习版',
    content: '前端实习：重构文章编辑器工具条并补齐键盘可达性，编辑体验相关反馈下降 40%。',
    position: 0,
    archived: false,
    created_at: ISO,
    updated_at: ISO
  }
]
