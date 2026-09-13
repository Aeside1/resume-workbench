import { Input } from '@heroui/react'
import { MilkdownEditor } from '../../components/ui/MilkdownView'
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
        <label id={`${prefixId}-record-label`} htmlFor={`${prefixId}-record`}>草稿正文</label>
        <MilkdownEditor
          id={`${prefixId}-record`}
          cacheKey={`${prefixId}-record`}
          placeholder="自由记录项目背景、技术方案材料、量化数据、==trade off== 与思考复盘..."
          rows={8}
          value={draft.detailed_record}
          onChange={(val) => onChange({ ...draft, detailed_record: val })}
        />
      </div>
    </>
  )
}

