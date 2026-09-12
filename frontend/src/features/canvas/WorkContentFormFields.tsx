import { Input, TextArea } from '@heroui/react'
import type { ContentDraft } from './WorkContentBlock'

export type WorkContentFormFieldsProps = {
  prefixId: string
  draft: ContentDraft
  onChange: (draft: ContentDraft) => void
}

export function WorkContentFormFields({
  prefixId,
  draft,
  onChange
}: WorkContentFormFieldsProps) {
  return (
    <>
      <div className="canvas-field">
        <label htmlFor={`${prefixId}-title`}>工作项标题</label>
        <Input
          id={`${prefixId}-title`}
          placeholder="例如：主导前端渲染性能专项优化"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          required
        />
      </div>

      <div className="canvas-field">
        <label htmlFor={`${prefixId}-record`}>背景与难点</label>
        <TextArea
          id={`${prefixId}-record`}
          placeholder="描述该工作的背景痛点、业务诉求或技术难点..."
          rows={3}
          value={draft.detailed_record}
          onChange={(e) => onChange({ ...draft, detailed_record: e.target.value })}
        />
      </div>

      <div className="canvas-field">
        <label htmlFor={`${prefixId}-materials`}>技术方案与材料</label>
        <TextArea
          id={`${prefixId}-materials`}
          placeholder="记录采用的架构方案、关键技术栈、设计文档或材料链接..."
          rows={3}
          value={draft.technical_materials}
          onChange={(e) => onChange({ ...draft, technical_materials: e.target.value })}
        />
      </div>

      <div className="canvas-field">
        <label htmlFor={`${prefixId}-result`}>量化结果数据</label>
        <TextArea
          id={`${prefixId}-result`}
          placeholder="说明带来的实际收益、性能提升百分比或关键量化业务指标..."
          rows={2}
          value={draft.result_data}
          onChange={(e) => onChange({ ...draft, result_data: e.target.value })}
        />
      </div>

      <div className="canvas-field">
        <label htmlFor={`${prefixId}-notes`}>补充说明</label>
        <TextArea
          id={`${prefixId}-notes`}
          placeholder="可记录专利、团队内分享或后续扩展思考..."
          rows={2}
          value={draft.supplementary_notes}
          onChange={(e) => onChange({ ...draft, supplementary_notes: e.target.value })}
        />
      </div>
    </>
  )
}
